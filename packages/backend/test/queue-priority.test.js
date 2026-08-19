const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { QueueStore } = require('../src/queue-store');

test('queue calls higher priority waiting ticket first and records SLA timestamps', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'osp-queue-priority-'));
  const store = new QueueStore({ dataDir: dir });
  const normal = await store.issue({ queue: 'recepcion', prefix: 'R', service: 'caja', priority: 0 });
  const vip = await store.issue({ queue: 'recepcion', prefix: 'R', service: 'caja', priority: 5 });
  const called = await store.callNext('recepcion', { desk: 'Caja 2' });
  assert.equal(called.id, vip.id);
  assert.equal(called.priority, 5);
  assert.ok(called.calledAt);
  assert.ok(called.waitMs >= 0);
  const completed = await store.complete('recepcion', vip.id);
  assert.ok(completed.serviceMs >= 0);
  const waiting = await store.list('recepcion');
  assert.equal(waiting.find(item => item.id === normal.id).status, 'waiting');
});
