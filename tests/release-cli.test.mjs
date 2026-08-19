import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const cli = resolve('scripts/release/release-cli.mjs');
function git(cwd, ...args) { return execFileSync('git', args, { cwd, encoding:'utf8' }).trim(); }
function repo(tags=[]) {
  const cwd = mkdtempSync(join(tmpdir(), 'osp-release-'));
  git(cwd, 'init'); git(cwd, 'config', 'user.email', 'ci@example.invalid'); git(cwd, 'config', 'user.name', 'CI');
  writeFileSync(join(cwd, 'README.md'), 'test\n'); git(cwd, 'add', '.'); git(cwd, 'commit', '-m', 'init');
  for (const tag of tags) git(cwd, 'tag', tag);
  return cwd;
}
function run(cwd, args) { return execFileSync(process.execPath, [cli, ...args], { cwd, encoding:'utf8' }).trim(); }

test('CLI returns alpha.5 after four alpha tags', () => {
  const cwd = repo(['v2.1.0-alpha.1','v2.1.0-alpha.2','v2.1.0-alpha.3','v2.1.0-alpha.4']);
  assert.equal(run(cwd, ['next-tag','--version','2.1.0','--channel','alpha']), 'v2.1.0-alpha.5');
});

test('CLI blocks beta before five alphas with nonzero exit', () => {
  const cwd = repo(['v2.1.0-alpha.1']);
  const result = spawnSync(process.execPath, [cli,'next-tag','--version','2.1.0','--channel','beta'], { cwd, encoding:'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /need 5 alpha/);
});

test('CLI allows stable only after beta.3', () => {
  const cwd = repo(['v2.1.0-alpha.1','v2.1.0-alpha.2','v2.1.0-alpha.3','v2.1.0-alpha.4','v2.1.0-alpha.5','v2.1.0-beta.1','v2.1.0-beta.2','v2.1.0-beta.3']);
  assert.equal(run(cwd, ['next-tag','--version','2.1.0','--channel','stable']), 'v2.1.0');
  assert.match(run(cwd, ['assert-promotion','--version','2.1.0','--from','beta','--to','stable']), /allowed/);
});
