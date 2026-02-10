const UNKNOWN_TOKENS = new Set([
  'unknown',
  'unknown species',
  'unidentified',
  'unspecified',
  'n/a',
  'na',
  'none',
]);

const normalizeName = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  if (UNKNOWN_TOKENS.has(lower)) return null;
  return text;
};

const pickSpeciesName = (...values) => {
  for (const value of values) {
    const normalized = normalizeName(value);
    if (normalized) return normalized;
  }
  return null;
};

export { normalizeName, pickSpeciesName };
