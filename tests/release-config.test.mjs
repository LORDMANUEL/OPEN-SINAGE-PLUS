import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nextMinor, promoteConfig, readReleaseConfig } from '../scripts/release/release-config.mjs';

test('nextMinor increments minor and resets patch', () => {
  assert.equal(nextMinor('2.1.7'), '2.2.0');
});

test('promoteConfig moves nextVersion to stable and opens next minor cycle', () => {
  const dir = mkdtempSync(join(tmpdir(), 'osp-config-'));
  const path = join(dir, 'release.config.json');
  writeFileSync(path, JSON.stringify({ stableVersion:'2.0.0', nextVersion:'2.1.0', alphasPerBeta:5, betasPerStable:3 }));
  assert.deepEqual(promoteConfig(path), { stableVersion:'2.1.0', nextVersion:'2.2.0', alphasPerBeta:5, betasPerStable:3 });
  assert.equal(readReleaseConfig(path).stableVersion, '2.1.0');
  assert.match(readFileSync(path,'utf8'), /2\.2\.0/);
});
