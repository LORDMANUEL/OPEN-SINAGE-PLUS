const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { latestBackupStatus, tlsExpiryStatus, diskStatus } = require('../src/operational-health');

function writeBackup(root, name = 'open-signage-plus-test.tar.gz', contents = 'backup') {
  const file = path.join(root, name);
  fs.writeFileSync(file, contents);
  const hash = crypto.createHash('sha256').update(contents).digest('hex');
  fs.writeFileSync(`${file}.sha256`, `${hash}  ${name}\n`);
  return file;
}

test('latest backup status distinguishes fresh and stale verified backups', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'osp-backup-health-'));
  try {
    const file = writeBackup(root);
    const now = Date.now();
    fs.utimesSync(file, new Date(now - 2 * 3600_000), new Date(now - 2 * 3600_000));
    assert.equal(latestBackupStatus({ backupRoot: root, now, maxAgeHours: 24 }).ok, true);
    assert.equal(latestBackupStatus({ backupRoot: root, now, maxAgeHours: 1 }).ok, false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('backup without checksum or with a bad checksum is unhealthy', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'osp-backup-integrity-'));
  try {
    const noChecksum = path.join(root, 'open-signage-plus-no-checksum.tar.gz');
    fs.writeFileSync(noChecksum, 'backup');
    let status = latestBackupStatus({ backupRoot: root, now: Date.now(), maxAgeHours: 24 });
    assert.equal(status.ok, false);
    assert.equal(status.reason, 'checksum-missing');

    fs.writeFileSync(`${noChecksum}.sha256`, `${'0'.repeat(64)}  ${path.basename(noChecksum)}\n`);
    status = latestBackupStatus({ backupRoot: root, now: Date.now(), maxAgeHours: 24 });
    assert.equal(status.ok, false);
    assert.equal(status.reason, 'checksum-mismatch');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('missing backup directory is unhealthy, not silently healthy', () => {
  const status = latestBackupStatus({ backupRoot: '/definitely/missing/open-signage-backups', now: Date.now(), maxAgeHours: 24 });
  assert.equal(status.ok, false);
  assert.equal(status.reason, 'missing');
});

test('TLS expiry status warns before threshold and reports expired certificates', () => {
  const now = Date.parse('2026-08-19T12:00:00Z');
  assert.equal(tlsExpiryStatus({ validTo: '2026-09-20T12:00:00Z', now, warnDays: 21 }).ok, true);
  assert.equal(tlsExpiryStatus({ validTo: '2026-08-25T12:00:00Z', now, warnDays: 21 }).ok, false);
  assert.equal(tlsExpiryStatus({ validTo: '2026-08-18T12:00:00Z', now, warnDays: 21 }).expired, true);
});

test('disk status computes free percent from statfs-compatible values', () => {
  const healthy = diskStatus({ dataDir: '/data', minFreePercent: 10, statfs: () => ({ bavail: 25n, blocks: 100n, bsize: 4096n }) });
  const low = diskStatus({ dataDir: '/data', minFreePercent: 10, statfs: () => ({ bavail: 5n, blocks: 100n, bsize: 4096n }) });
  assert.equal(healthy.ok, true);
  assert.equal(healthy.freePercent, 25);
  assert.equal(low.ok, false);
  assert.equal(low.freePercent, 5);
});
