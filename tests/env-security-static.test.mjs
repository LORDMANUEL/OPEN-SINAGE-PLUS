import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const lifecycleScripts = [
  'scripts/backup.sh',
  'scripts/restore.sh',
  'scripts/doctor.sh',
];

test('lifecycle scripts never execute .env as shell code', () => {
  for (const file of lifecycleScripts) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /\bsource\s+[^\n]*\.env\b/i, `${file} must not source .env`);
    assert.doesNotMatch(source, /\.(?:\s+)["']?\$?\{?ENV_FILE/i, `${file} must parse ENV_FILE as data, not execute it`);
  }
});

test('lifecycle scripts use the non-executing dotenv reader where secrets are needed', () => {
  for (const file of lifecycleScripts) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /env-read\.mjs/, `${file} should read dotenv through env-read.mjs`);
  }
});
