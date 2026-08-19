import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = [
  '.github/workflows/bootstrap-v2.yml',
  '.github/workflows/release-channel.yml',
];

test('release workflows do not escape JavaScript expressions passed to node -p', () => {
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    assert.equal(content.includes('node -p \\"'), false, `${file} contains shell-breaking escaped quotes`);
  }
});

test('bootstrap remains rerunnable and promotion workflow exposes all channels', () => {
  const bootstrap = readFileSync(files[0], 'utf8');
  const release = readFileSync(files[1], 'utf8');
  assert.match(bootstrap, /workflow_dispatch:/);
  assert.match(bootstrap, /branches: \[main\]/);
  assert.match(release, /options: \[alpha, beta, stable\]/);
  assert.match(release, /alpha\.\{0\}/);
  assert.match(release, /beta\.\{0\}/);
});
