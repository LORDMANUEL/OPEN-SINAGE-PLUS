const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../src/app');

async function withServer(app, fn) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('admin API creates a Xibo webpage widget pointing to an approved PLUS player URL', async () => {
  const calls = [];
  const xiboClient = {
    async createWebpageWidget(payload) {
      calls.push(payload);
      return { widgetId: 501, type: 'webpage' };
    },
  };

  await withServer(createApp({ xiboClient }), async base => {
    const response = await fetch(`${base}/api/xibo/playlists/41/webpage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        uri: 'https://signage.example.com/player/demo-scene-token',
        name: 'Promo PLUS',
        duration: 45,
      }),
    });

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.widget.widgetId, 501);
    assert.deepEqual(calls[0], {
      playlistId: 41,
      uri: 'https://signage.example.com/player/demo-scene-token',
      name: 'Promo PLUS',
      duration: 45,
    });
  });
});

test('Xibo webpage bridge rejects invalid playlist IDs and non-http URLs', async () => {
  const xiboClient = {
    async createWebpageWidget() {
      throw new Error('should not be called');
    },
  };

  await withServer(createApp({ xiboClient }), async base => {
    const badPlaylist = await fetch(`${base}/api/xibo/playlists/nope/webpage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ uri: 'https://example.com/player/token' }),
    });
    assert.equal(badPlaylist.status, 400);

    const badUri = await fetch(`${base}/api/xibo/playlists/41/webpage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ uri: 'javascript:alert(1)' }),
    });
    assert.equal(badUri.status, 400);
  });
});
