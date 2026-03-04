import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const LOCALES_DIR = path.join(ROOT, 'src', 'i18n', 'locales');
const SOURCE_LOCALE = 'en';
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
  const args = {};
  for (const arg of argv) {
    if (arg === '--force' || arg === '--overwrite') {
      args.overwrite = true;
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

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const locales = args.locales?.length ? args.locales : TARGET_LOCALES;
  const sourcePath = path.join(LOCALES_DIR, `${SOURCE_LOCALE}.json`);
  const sourceRaw = await fs.readFile(sourcePath, 'utf8');
  const sourceJson = JSON.parse(sourceRaw);
  const payload = `${JSON.stringify(sourceJson, null, 2)}\n`;

  let written = 0;
  let skipped = 0;

  for (const locale of locales) {
    const outPath = path.join(LOCALES_DIR, `${locale}.json`);
    const hasFile = await exists(outPath);

    if (hasFile && !args.overwrite) {
      skipped += 1;
      continue;
    }

    await fs.writeFile(outPath, payload, 'utf8');
    written += 1;
  }

  console.log(`Initialized locales from ${SOURCE_LOCALE}.json`);
  console.log(`Written: ${written}, Skipped: ${skipped}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
