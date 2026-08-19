const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../src/app');

async function withServer(app, fn) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try { await fn(`http://127.0.0.1:${port}`); } finally { await new Promise(resolve => server.close(resolve)); }
}

const fakeXibo = { async authenticate() { return 'token'; } };

function fakeDeviceStore() {
  const device = { deviceToken: 'device-token-abcdefghijkl', pairingCode: 'AB12CD', sceneToken: null, name: '' };
  return {
    async register() { return { ...device }; },
    async get(token) { return token === device.deviceToken ? { ...device } : null; },
    async pair({ pairingCode, sceneToken, name }) {
      if (pairingCode !== device.pairingCode) return null;
      device.sceneToken = sceneToken; device.name = name; return { ...device };
    },
  };
}

test('public browser can register and poll its pairing state', async () => {
  const deviceStore = fakeDeviceStore();
  await withServer(createApp({ xiboClient: fakeXibo, deviceStore }), async base => {
    const registered = await fetch(`${base}/api/player/devices/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(registered.status, 201);
    const body = await registered.json();
    assert.equal(body.device.pairingCode, 'AB12CD');

    const polled = await fetch(`${base}/api/player/devices/${body.device.deviceToken}`);
    assert.equal(polled.status, 200);
    assert.equal((await polled.json()).device.sceneToken, null);
  });
});

test('admin can pair a short code to an existing scene token', async () => {
  const deviceStore = fakeDeviceStore();
  await withServer(createApp({ xiboClient: fakeXibo, deviceStore }), async base => {
    const response = await fetch(`${base}/api/player/devices/pair`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pairingCode: 'AB12CD', sceneToken: 'demo-player-token', name: 'Lobby TV' }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.device.sceneToken, 'demo-player-token');
    assert.equal(body.device.name, 'Lobby TV');
  });
});
