import { readFileSync, writeFileSync } from 'node:fs';

export function readReleaseConfig(path = 'release.config.json') {
  const config = JSON.parse(readFileSync(path, 'utf8'));
  for (const key of ['stableVersion','nextVersion']) {
    if (!/^\d+\.\d+\.\d+$/.test(String(config[key] || ''))) throw new Error(`Invalid ${key}`);
  }
  if (!Number.isInteger(config.alphasPerBeta) || config.alphasPerBeta < 1) throw new Error('Invalid alphasPerBeta');
  if (!Number.isInteger(config.betasPerStable) || config.betasPerStable < 1) throw new Error('Invalid betasPerStable');
  return config;
}

export function nextMinor(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Invalid version ${version}`);
  return `${Number(match[1])}.${Number(match[2]) + 1}.0`;
}

export function promoteConfig(path = 'release.config.json') {
  const config = readReleaseConfig(path);
  const promoted = { ...config, stableVersion: config.nextVersion, nextVersion: nextMinor(config.nextVersion) };
  writeFileSync(path, `${JSON.stringify(promoted, null, 2)}\n`);
  return promoted;
}
