import fs from 'node:fs';

function validateKey(key) {
  const value = String(key || '');
  if (!/^[A-Z][A-Z0-9_]*$/.test(value)) throw new Error(`invalid env key: ${value}`);
  return value;
}
function validateValue(value) {
  const result = String(value ?? '');
  if (/\r|\n|\0/.test(result)) throw new Error('env values cannot contain line breaks or NUL');
  return result;
}

/** Encode using Docker Compose dotenv syntax. Single quotes keep `$...` literal. */
function encodeEnvValue(value) {
  const safe = validateValue(value);
  if (/^[A-Za-z0-9_./:@,+-]+$/.test(safe)) return safe;
  if (safe === '') return "''";
  return `'${safe.replace(/'/g, "\\'")}'`;
}

/** Decode the subset emitted by encodeEnvValue plus legacy unquoted values. */
function decodeEnvValue(raw) {
  const value = String(raw ?? '').trim();
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/\\'/g, "'");
  }
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value); } catch { return value.slice(1, -1); }
  }
  return value;
}

export function readEnvValue(file, key) {
  const wanted = validateKey(key);
  if (!fs.existsSync(file)) return '';
  let found = '';
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.startsWith(`${wanted}=`)) found = decodeEnvValue(line.slice(wanted.length + 1));
  }
  return found;
}

export function setEnvValue(file, key, value) {
  const wanted = validateKey(key);
  const encoded = encodeEnvValue(value);
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines = existing.split(/\r?\n/);
  let replaced = false;
  const next = lines.map(line => {
    if (!line.startsWith(`${wanted}=`)) return line;
    if (replaced) return null;
    replaced = true;
    return `${wanted}=${encoded}`;
  }).filter(line => line !== null);
  if (!replaced) {
    if (next.length && next[next.length - 1] !== '') next.push('');
    next.push(`${wanted}=${encoded}`);
  }
  while (next.length > 1 && next[next.length - 1] === '' && next[next.length - 2] === '') next.pop();
  fs.writeFileSync(file, `${next.join('\n').replace(/\n*$/,'')}\n`, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

export { encodeEnvValue, decodeEnvValue };

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, key, ...valueParts] = process.argv.slice(2);
  if (!file || !key || valueParts.length === 0) {
    console.error('Usage: node scripts/env-set.mjs <env-file> <KEY> <VALUE>');
    process.exit(2);
  }
  setEnvValue(file, key, valueParts.join(' '));
}