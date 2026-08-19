#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readReleaseConfig, promoteConfig } from './release-config.mjs';

const config = readReleaseConfig();
const target = config.nextVersion;
execFileSync('npm', ['version', target, '--no-git-tag-version', '--allow-same-version'], { stdio: 'inherit' });
promoteConfig();
process.stdout.write(`${target}\n`);
