const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { DeviceStore } = require('../src/device-store');

test('device store registers a persistent browser with a short pairing code', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'osp-devices-'));
  try {
    const store = new DeviceStore({ dataDir: dir });
    const created = await store.register({ userAgent: 'Chrome TV' });
    assert.match(created.deviceToken, /^[a-zA-Z0-9_-]{20,}$/);
    assert.match(created.pairingCode, /^[A-Z0-9]{6}$/);
    assert.equal(created.sceneToken, null);

    const second = new DeviceStore({ dataDir: dir });
    const loaded = await second.get(created.deviceToken);
    assert.equal(loaded.pairingCode, created.pairingCode);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('device store pairs by short code and assigns a scene', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'osp-devices-'));
  try {
    const store = new DeviceStore({ dataDir: dir });
    const device = await store.register({ userAgent: 'TV' });
    const paired = await store.pair({ pairingCode: device.pairingCode, sceneToken: 'demo-player-token', name: 'Lobby TV' });
    assert.equal(paired.sceneToken, 'demo-player-token');
    assert.equal(paired.name, 'Lobby TV');
    const loaded = await store.get(device.deviceToken);
    assert.equal(loaded.sceneToken, 'demo-player-token');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('device store rejects invalid tokens, codes and scene tokens', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'osp-devices-'));
  try {
    const store = new DeviceStore({ dataDir: dir });
    await assert.rejects(() => store.get('../bad'), /device token/i);
    await assert.rejects(() => store.pair({ pairingCode: 'BAD', sceneToken: 'short' }), /pairing|scene/i);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
