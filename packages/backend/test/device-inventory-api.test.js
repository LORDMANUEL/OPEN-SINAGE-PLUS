const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../src/app');

async function withServer(app, fn) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try { await fn(`http://127.0.0.1:${port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('admin API lists persisted PLUS browser devices', async () => {
  const deviceStore = {
    async list() {
      return [
        { deviceToken: 'device-token-abcdefghijkl', pairingCode: 'AB12CD', sceneToken: 'demo-player-token', name: 'Lobby TV' },
      ];
    },
  };
  const xiboClient = {};

  await withServer(createApp({ xiboClient, deviceStore }), async base => {
    const response = await fetch(`${base}/api/player/devices`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.devices.length, 1);
    assert.equal(body.devices[0].name, 'Lobby TV');
  });
});
