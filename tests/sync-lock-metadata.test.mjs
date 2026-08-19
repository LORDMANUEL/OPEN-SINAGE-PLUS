import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncLockMetadata } from '../scripts/release/sync-lock-metadata.mjs';

test('syncs only root package lock identity and version', () => {
  const dir=mkdtempSync(join(tmpdir(),'osp-lock-'));
  const pkg=join(dir,'package.json'); const lock=join(dir,'package-lock.json');
  writeFileSync(pkg, JSON.stringify({name:'open-signage-plus',version:'2.0.0'}));
  writeFileSync(lock, JSON.stringify({name:'temp-project',version:'0.0.0',lockfileVersion:3,packages:{'':{name:'temp-project',version:'0.0.0',dependencies:{react:'19.1.1'}},'node_modules/react':{version:'19.1.1'}}}));
  const result=syncLockMetadata(pkg,lock);
  assert.equal(result.changed,true);
  const updated=JSON.parse(readFileSync(lock,'utf8'));
  assert.equal(updated.name,'open-signage-plus'); assert.equal(updated.version,'2.0.0');
  assert.equal(updated.packages[''].name,'open-signage-plus'); assert.equal(updated.packages[''].version,'2.0.0');
  assert.deepEqual(updated.packages[''].dependencies,{react:'19.1.1'});
  assert.equal(updated.packages['node_modules/react'].version,'19.1.1');
});

test('check mode rejects mismatch without writing', () => {
  const dir=mkdtempSync(join(tmpdir(),'osp-lock-check-'));
  const pkg=join(dir,'package.json'); const lock=join(dir,'package-lock.json');
  writeFileSync(pkg, JSON.stringify({name:'open-signage-plus',version:'2.0.0'}));
  writeFileSync(lock, JSON.stringify({name:'temp-project',version:'0.0.0',packages:{'':{name:'temp-project',version:'0.0.0'}}}));
  const before=readFileSync(lock,'utf8');
  assert.throws(()=>syncLockMetadata(pkg,lock,{check:true}),/mismatch/);
  assert.equal(readFileSync(lock,'utf8'),before);
});
