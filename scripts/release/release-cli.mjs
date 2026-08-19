#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { channelStatus, nextTag, assertPromotion } from './release-policy.mjs';

function argsOf(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i];
    if (!value.startsWith('--')) { args._.push(value); continue; }
    const key = value.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else { args[key] = next; i++; }
  }
  return args;
}

function gitTags() {
  const output = execFileSync('git', ['tag', '--list'], { encoding: 'utf8' });
  return output.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
}

function requireArg(args, name) {
  const value = args[name];
  if (!value || value === true) throw new Error(`Missing --${name}`);
  return String(value);
}

const args = argsOf(process.argv.slice(2));
const command = args._[0] || 'status';
const version = requireArg(args, 'version');
const tags = gitTags();
const options = { tags, version, alphasPerBeta: Number(args['alphas-per-beta'] || 5), betasPerStable: Number(args['betas-per-stable'] || 3) };

if (command === 'status') {
  process.stdout.write(`${JSON.stringify(channelStatus(options), null, 2)}\n`);
} else if (command === 'next-tag') {
  const channel = requireArg(args, 'channel');
  process.stdout.write(`${nextTag({ ...options, channel })}\n`);
} else if (command === 'assert-promotion') {
  const from = requireArg(args, 'from');
  const to = requireArg(args, 'to');
  assertPromotion({ ...options, from, to });
  process.stdout.write(`promotion ${from}->${to} allowed for v${version}\n`);
} else {
  throw new Error(`Unknown command: ${command}`);
}
