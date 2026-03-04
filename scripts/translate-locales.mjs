import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const LOCALES_DIR = path.join(ROOT, 'src', 'i18n', 'locales');
const SOURCE_LOCALE = 'en';
const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_BATCH_SIZE = 40;
const DEFAULT_PROVIDER = 'auto';
const GOOGLE_REQUEST_TIMEOUT_MS = 15000;
const GOOGLE_MAX_RETRIES = 6;
const GOOGLE_MAX_TEXT_CHARS = 900;

const TARGET_LOCALES = [
  'ar',
  'zh-CN',
  'zh-TW',
  'hr',
  'cs',
  'da',
  'nl',
  'fi',
  'de',
  'el',
  'hi',
  'hu',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'no',
  'fa',
  'pl',
  'pt',
  'ro',
  'ru',
  'sk',
  'sv',
  'tl',
  'th',
  'tr',
  'uk',
  'vi',
];

function parseArgs(argv) {
  const args = {
    model: DEFAULT_MODEL,
    batchSize: DEFAULT_BATCH_SIZE,
    provider: DEFAULT_PROVIDER,
    maxStrings: null,
    locales: null,
  };

  for (const arg of argv) {
    if (arg.startsWith('--model=')) {
      args.model = arg.replace('--model=', '').trim() || DEFAULT_MODEL;
      continue;
    }

    if (arg.startsWith('--batchSize=')) {
      const raw = Number(arg.replace('--batchSize=', '').trim());
      args.batchSize = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_BATCH_SIZE;
      continue;
    }

    if (arg.startsWith('--provider=')) {
      args.provider = arg.replace('--provider=', '').trim() || DEFAULT_PROVIDER;
      continue;
    }

    if (arg.startsWith('--maxStrings=')) {
      const raw = Number(arg.replace('--maxStrings=', '').trim());
      args.maxStrings = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : null;
      continue;
    }

    if (arg.startsWith('--locales=')) {
      args.locales = arg
        .replace('--locales=', '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return args;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function collectStringLeaves(node, pathParts = [], out = []) {
  if (typeof node === 'string') {
    out.push({ path: [...pathParts], value: node });
    return out;
  }

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      collectStringLeaves(node[i], [...pathParts, i], out);
    }
    return out;
  }

  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      collectStringLeaves(value, [...pathParts, key], out);
    }
  }

  return out;
}

function setByPath(root, pathParts, value) {
  let cursor = root;
  for (let i = 0; i < pathParts.length - 1; i += 1) {
    cursor = cursor[pathParts[i]];
  }
  cursor[pathParts[pathParts.length - 1]] = value;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function extractPlaceholders(text) {
  const matches = text.match(/{{\s*[\w.]+\s*}}/g) || [];
  return matches.map((token) => token.replace(/\s+/g, ''));
}

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const map = new Map();
  for (const item of a) {
    map.set(item, (map.get(item) || 0) + 1);
  }
  for (const item of b) {
    const count = map.get(item) || 0;
    if (count === 0) return false;
    map.set(item, count - 1);
  }
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitTextForGoogle(text, maxChars = GOOGLE_MAX_TEXT_CHARS) {
  if (!text || text.length <= maxChars) {
    return [text];
  }

  const chunks = [];
  let index = 0;

  while (index < text.length) {
    let end = Math.min(index + maxChars, text.length);

    if (end < text.length) {
      const newlineBoundary = text.lastIndexOf('\n', end);
      const spaceBoundary = text.lastIndexOf(' ', end);
      const boundary = Math.max(newlineBoundary, spaceBoundary);

      // Keep chunks reasonably sized and prefer natural boundaries.
      if (boundary > index + Math.floor(maxChars * 0.45)) {
        end = boundary;
      }
    }

    const chunk = text.slice(index, end);
    if (!chunk) {
      break;
    }

    chunks.push(chunk);
    index = end;
  }

  return chunks;
}

function maskPlaceholders(text) {
  const tokens = [];
  const masked = text.replace(/{{\s*[\w.]+\s*}}/g, (match) => {
    const token = `__PH_${tokens.length}__`;
    tokens.push({ token, value: match });
    return token;
  });
  return { masked, tokens };
}

function unmaskPlaceholders(text, tokens) {
  let output = text;
  for (const { token, value } of tokens) {
    output = output.split(token).join(value);
  }
  return output;
}

async function translateBatchOpenAI({ apiKey, model, locale, batch }) {
  const textById = {};
  for (let i = 0; i < batch.length; i += 1) {
    textById[String(i)] = batch[i].value;
  }

  const system = [
    'You translate mobile app UI JSON values.',
    `Target locale: ${locale}.`,
    'Return ONLY a JSON object whose keys are the same numeric IDs provided.',
    'Do not add extra keys.',
    'Preserve placeholders exactly, e.g. {{count}}, {{name}}, {{email}}, {{amount}}, {{days}}, {{date}}, {{plan}}, {{message}}, {{status}}.',
    'Preserve newlines, markdown markers, punctuation, numbers, URLs, and email addresses.',
    'Keep app name LeafNest unchanged.',
    'Translate naturally for mobile UI.',
  ].join(' ');

  const user = JSON.stringify({ locale, values: textById });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response content from translation API.');
  }

  const parsed = JSON.parse(content);
  const translations = parsed.values && typeof parsed.values === 'object' ? parsed.values : parsed;
  return translations;
}

async function translateTextGoogleSingle({ locale, text }) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(
    locale
  )}&dt=t&q=${encodeURIComponent(text)}`;

  let lastError = null;
  for (let attempt = 1; attempt <= GOOGLE_MAX_RETRIES; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GOOGLE_REQUEST_TIMEOUT_MS);
      let response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'LeafNest-i18n-script',
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Google translate error ${response.status}: ${body}`);
      }

      const data = await response.json();
      if (!Array.isArray(data) || !Array.isArray(data[0])) {
        throw new Error('Unexpected Google translate response format.');
      }

      return data[0].map((part) => part?.[0] || '').join('');
    } catch (error) {
      lastError = error;
      if (attempt < GOOGLE_MAX_RETRIES) {
        const jitter = Math.floor(Math.random() * 250);
        const backoff = Math.min(5000, 400 * 2 ** (attempt - 1)) + jitter;
        await sleep(backoff);
      }
    }
  }

  throw lastError || new Error('Google translate request failed.');
}

async function translateTextGoogle({ locale, text }) {
  const chunks = splitTextForGoogle(text, GOOGLE_MAX_TEXT_CHARS);
  if (chunks.length === 1) {
    return translateTextGoogleSingle({ locale, text: chunks[0] });
  }

  const translatedChunks = [];
  for (const chunk of chunks) {
    const translated = await translateTextGoogleSingle({ locale, text: chunk });
    translatedChunks.push(translated);
    await sleep(80);
  }

  return translatedChunks.join('');
}

async function translateBatchGoogle({ locale, batch }) {
  const translations = {};
  let failedCount = 0;
  for (let i = 0; i < batch.length; i += 1) {
    const id = String(i);
    const sourceText = batch[i].value;

    if (!sourceText || !sourceText.trim()) {
      translations[id] = sourceText;
      continue;
    }

    try {
      const { masked, tokens } = maskPlaceholders(sourceText);
      const translatedMasked = await translateTextGoogle({ locale, text: masked });
      translations[id] = unmaskPlaceholders(translatedMasked, tokens);
    } catch (error) {
      failedCount += 1;
      translations[id] = sourceText;
      const leafPath = batch[i].path.join('.');
      const reason = error?.message ? String(error.message) : String(error);
      console.warn(`[${locale}] fallback to English for "${leafPath}": ${reason.slice(0, 140)}`);
    }

    await sleep(100);
  }

  if (failedCount > 0) {
    console.warn(`[${locale}] ${failedCount} strings failed in this batch and were kept in English.`);
  }

  return translations;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const locales = args.locales?.length ? args.locales : TARGET_LOCALES;
  const apiKey = process.env.OPENAI_API_KEY;
  const normalizedProvider = (args.provider || DEFAULT_PROVIDER).toLowerCase();
  let provider = normalizedProvider;

  if (!['auto', 'openai', 'google'].includes(provider)) {
    throw new Error(`Unsupported provider "${args.provider}". Use auto, openai, or google.`);
  }

  if (provider === 'auto') {
    provider = apiKey ? 'openai' : 'google';
  }

  if (provider === 'openai' && !apiKey) {
    throw new Error(
      'Missing OPENAI_API_KEY for provider=openai. Either set OPENAI_API_KEY or use --provider=google.'
    );
  }

  const sourcePath = path.join(LOCALES_DIR, `${SOURCE_LOCALE}.json`);
  const source = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
  const allLeaves = collectStringLeaves(source);
  const leaves =
    args.maxStrings && args.maxStrings > 0
      ? allLeaves.slice(0, Math.min(args.maxStrings, allLeaves.length))
      : allLeaves;

  console.log(`Provider: ${provider}`);
  if (provider === 'google') {
    console.log('Using free Google endpoint (no API key). This may be slower and rate-limited.');
  }
  if (args.maxStrings && args.maxStrings > 0) {
    console.log(`Limiting translation to first ${leaves.length} strings (maxStrings mode).`);
  }

  for (const locale of locales) {
    const output = cloneJson(source);
    const batches = chunkArray(leaves, args.batchSize);

    console.log(`Translating ${locale} (${leaves.length} strings, ${batches.length} batches)`);

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      console.log(`  [${locale}] batch ${i + 1}/${batches.length}`);
      const translated =
        provider === 'openai'
          ? await translateBatchOpenAI({
              apiKey,
              model: args.model,
              locale,
              batch,
            })
          : await translateBatchGoogle({
              locale,
              batch,
            });

      for (let j = 0; j < batch.length; j += 1) {
        const id = String(j);
        const original = batch[j].value;
        const candidate = translated?.[id];

        if (typeof candidate !== 'string' || !candidate.trim()) {
          setByPath(output, batch[j].path, original);
          continue;
        }

        const srcPlaceholders = extractPlaceholders(original);
        const dstPlaceholders = extractPlaceholders(candidate);
        if (!sameMultiset(srcPlaceholders, dstPlaceholders)) {
          setByPath(output, batch[j].path, original);
          continue;
        }

        setByPath(output, batch[j].path, candidate);
      }
    }

    const outPath = path.join(LOCALES_DIR, `${locale}.json`);
    await fs.writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    console.log(`Saved ${outPath}`);
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
