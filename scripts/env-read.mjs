import { readEnvValue } from './env-set.mjs';

/**
 * Read one dotenv value as data. This utility exists so shell lifecycle scripts
 * never need to `source .env`, which would execute command substitutions or
 * shell syntax embedded in a credential.
 */
const [file, key] = process.argv.slice(2);
if (!file || !key) {
  console.error('Usage: node scripts/env-read.mjs <env-file> <KEY>');
  process.exit(2);
}
try {
  process.stdout.write(readEnvValue(file, key));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
