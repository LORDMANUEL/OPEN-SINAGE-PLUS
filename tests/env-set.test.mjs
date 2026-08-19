import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setEnvValue, readEnvValue } from '../scripts/env-set.mjs';

test('sets, replaces and preserves unrelated env keys', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'osp-env-'));
  const file = path.join(dir, '.env');
  fs.writeFileSync(file, 'A=1\nDOMAIN=old.example\n# comment\nB=2\n');
  setEnvValue(file, 'DOMAIN', 'signage.example.com');
  setEnvValue(file, 'NEW_KEY', 'value');
  assert.equal(readEnvValue(file, 'DOMAIN'), 'signage.example.com');
  assert.equal(readEnvValue(file, 'NEW_KEY'), 'value');
  assert.match(fs.readFileSync(file, 'utf8'), /A=1/);
  assert.match(fs.readFileSync(file, 'utf8'), /# comment/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('round-trips shell-sensitive secret values as literal dotenv data', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'osp-env-secret-'));
  const file = path.join(dir, '.env');
  const secret = "pa ss;$HOME$(touch /tmp/never-run)'quote";
  setEnvValue(file, 'SMTP_PASSWORD', secret);
  assert.equal(readEnvValue(file, 'SMTP_PASSWORD'), secret);
  const raw = fs.readFileSync(file, 'utf8');
  assert.match(raw, /^SMTP_PASSWORD='/m);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('rejects unsafe keys and line breaks', () => {
  const file = path.join(os.tmpdir(), `osp-env-${Date.now()}`);
  fs.writeFileSync(file, 'A=1\n');
  assert.throws(() => setEnvValue(file, 'BAD-KEY', 'x'), /invalid env key/i);
  assert.throws(() => setEnvValue(file, 'SAFE_KEY', 'a\nb'), /line breaks/i);
  fs.rmSync(file, { force: true });
});

test('lifecycle scripts never execute ENV_FILE as shell code', () => {
  for (const file of ['scripts/backup.sh', 'scripts/restore.sh', 'scripts/doctor.sh']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /\bsource\s+[^\n]*\.env\b/i, `${file} must not source .env`);
    assert.doesNotMatch(source, /\.(?:\s+)["']?\$?\{?ENV_FILE/i, `${file} must parse ENV_FILE as data`);
    assert.match(source, /env-read\.mjs/, `${file} must use env-read.mjs`);
  }
});
