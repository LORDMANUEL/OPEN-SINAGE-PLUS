#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

export function syncLockMetadata(packagePath = 'package.json', lockPath = 'package-lock.json', { check = false } = {}) {
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  if (!lock.packages || !lock.packages['']) throw new Error('package-lock.json has no root package metadata');
  const expected = { name: pkg.name, version: pkg.version };
  const current = { name: lock.name, version: lock.version, rootName: lock.packages[''].name, rootVersion: lock.packages[''].version };
  const changed = current.name !== expected.name || current.version !== expected.version || current.rootName !== expected.name || current.rootVersion !== expected.version;
  if (check && changed) throw new Error(`package-lock metadata mismatch: ${JSON.stringify(current)} expected ${JSON.stringify(expected)}`);
  if (changed && !check) {
    lock.name = expected.name;
    lock.version = expected.version;
    lock.packages[''].name = expected.name;
    lock.packages[''].version = expected.version;
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  }
  return { changed, expected, current };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const result = syncLockMetadata('package.json', 'package-lock.json', { check });
  process.stdout.write(`${result.changed ? 'updated' : 'ok'} ${result.expected.name}@${result.expected.version}\n`);
}
