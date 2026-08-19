const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { HealthMonitor } = require('../src/health-monitor');

test('health monitor reports an invalid backup checksum without throwing', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'osp-monitor-backup-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const archive = path.join(root, 'open-signage-plus-test.tar.gz');
  fs.writeFileSync(archive, 'backup');
  fs.writeFileSync(`${archive}.sha256`, `${'0'.repeat(64)}  ${path.basename(archive)}\n`);

  const sent = [];
  const monitor = new HealthMonitor({
    deviceStore: { fleetHealth: async () => ({ total: 0, online: 0, offline: 0, errors: 0 }) },
    xiboClient: { authenticate: async () => ({}) },
    notificationService: { status: () => ({ webhook: true }), send: async payload => { sent.push(payload); } },
    backupRoot: root,
    dataDir: '',
    tlsDomain: '',
    cooldownMs: 1,
  });

  await monitor.run();
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /Backup/i);
  assert.match(sent[0].text, /checksum|integridad/i);
  assert.equal(sent[0].severity, 'critical');
});
