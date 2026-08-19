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
export function readEnvValue(file, key) {
  const wanted = validateKey(key);
  if (!fs.existsSync(file)) return '';
  let found = '';
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.startsWith(`${wanted}=`)) found = line.slice(wanted.length + 1);
  }
  return found;
}
export function setEnvValue(file, key, value) {
  const wanted = validateKey(key);
  const safe = validateValue(value);
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines = existing.split(/\r?\n/);
  let replaced = false;
  const next = lines.map(line => {
    if (!line.startsWith(`${wanted}=`)) return line;
    if (replaced) return null;
    replaced = true;
    return `${wanted}=${safe}`;
  }).filter(line => line !== null);
  if (!replaced) {
    if (next.length && next[next.length - 1] !== '') next.push('');
    next.push(`${wanted}=${safe}`);
  }
  while (next.length > 1 && next[next.length - 1] === '' && next[next.length - 2] === '') next.pop();
  fs.writeFileSync(file, `${next.join('\n').replace(/\n*$/,'')}\n`, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, key, ...valueParts] = process.argv.slice(2);
  if (!file || !key || valueParts.length === 0) {
    console.error('Usage: node scripts/env-set.mjs <env-file> <KEY> <VALUE>');
    process.exit(2);
  }
  setEnvValue(file, key, valueParts.join(' '));
}
