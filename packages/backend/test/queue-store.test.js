const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { QueueStore } = require('../src/queue-store');

test('queue store issues sequential tickets and preserves them across instances', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'osp-queue-'));
  try {
    const first = new QueueStore({ dataDir: dir });
    const a = await first.issue({ queue: 'caja', prefix: 'A', customerName: 'Luis' });
    const b = await first.issue({ queue: 'caja', prefix: 'A' });
    assert.equal(a.number, 'A001');
    assert.equal(b.number, 'A002');
    assert.equal(a.status, 'waiting');

    const second = new QueueStore({ dataDir: dir });
    const state = await second.list('caja');
    assert.equal(state.length, 2);
    assert.equal(state[0].customerName, 'Luis');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('queue store serializes concurrent ticket issuance without duplicate sequence numbers', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'osp-queue-'));
  try {
    const store = new QueueStore({ dataDir: dir });
    const issued = await Promise.all(Array.from({ length: 20 }, () => store.issue({ queue: 'recepcion', prefix: 'R' })));
    const numbers = issued.map(ticket => ticket.number).sort();
    assert.deepEqual(numbers, Array.from({ length: 20 }, (_, index) => `R${String(index + 1).padStart(3, '0')}`));
    const persisted = await store.list('recepcion');
    assert.equal(persisted.length, 20);
    assert.equal(new Set(persisted.map(ticket => ticket.sequence)).size, 20);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('queue store calls next waiting ticket and can complete it', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'osp-queue-'));
  try {
    const store = new QueueStore({ dataDir: dir });
    await store.issue({ queue: 'recepcion', prefix: 'R' });
    await store.issue({ queue: 'recepcion', prefix: 'R' });

    const called = await store.callNext('recepcion', { desk: 'Módulo 2' });
    assert.equal(called.number, 'R001');
    assert.equal(called.status, 'called');
    assert.equal(called.desk, 'Módulo 2');

    const completed = await store.complete('recepcion', called.id);
    assert.equal(completed.status, 'completed');

    const next = await store.callNext('recepcion', { desk: 'Módulo 2' });
    assert.equal(next.number, 'R002');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('queue store rejects invalid queue names and prefixes', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'osp-queue-'));
  try {
    const store = new QueueStore({ dataDir: dir });
    await assert.rejects(() => store.issue({ queue: '../escape', prefix: 'A' }), /queue/i);
    await assert.rejects(() => store.issue({ queue: 'caja', prefix: 'TOOLONG' }), /prefix/i);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
