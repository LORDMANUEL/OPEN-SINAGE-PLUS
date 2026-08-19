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

test('rejects unsafe keys and line breaks', () => {
  const file = path.join(os.tmpdir(), `osp-env-${Date.now()}`);
  fs.writeFileSync(file, 'A=1\n');
  assert.throws(() => setEnvValue(file, 'BAD-KEY', 'x'), /invalid env key/i);
  assert.throws(() => setEnvValue(file, 'SAFE_KEY', 'a\nb'), /line breaks/i);
  fs.rmSync(file, { force: true });
});
