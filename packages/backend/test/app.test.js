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

const calls = [];
const fakeXibo = {
  async authenticate() { return 'token'; },
  async getDisplays() { return [{ displayId: 1, display: 'Lobby' }]; },
  async getLayouts() { return []; },
  async getLibrary() { return []; },
  async getPlaylists() { return []; },
  async getDisplayGroups() { return []; },
  async getSchedules() { return []; },
  async createSchedule(payload) { return { eventId: 9, payload }; },
  async createLayout(payload) { calls.push({ type: 'layout', payload }); return { layoutId: 77, ...payload }; },
  async uploadMedia(payload) { calls.push({ type: 'media', payload }); return [{ mediaId: 88, name: payload.name || payload.fileName }]; },
  async publishLayout(layoutId) { return { layoutId, published: true }; },
};

test('health route is independent from Xibo', async () => {
  await withServer(createApp({ xiboClient: fakeXibo }), async base => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, 'ok');
  });
});

test('Xibo status authenticates through server side adapter', async () => {
  await withServer(createApp({ xiboClient: fakeXibo }), async base => {
    const response = await fetch(`${base}/api/integrations/xibo/status`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.connected, true);
  });
});

test('Xibo status stays HTTP 200 and reports disconnected when integration is unavailable', async () => {
  const unavailable = {
    async authenticate() { throw new Error('Xibo integration is not configured'); },
    async getDisplays() { throw new Error('Xibo integration is not configured'); },
    async createSchedule() { throw new Error('Xibo integration is not configured'); },
  };

  await withServer(createApp({ xiboClient: unavailable }), async base => {
    const response = await fetch(`${base}/api/integrations/xibo/status`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.connected, false);
    assert.match(body.error, /not configured/i);
  });
});

test('display route returns Xibo displays', async () => {
  await withServer(createApp({ xiboClient: fakeXibo }), async base => {
    const response = await fetch(`${base}/api/xibo/displays`);
    const body = await response.json();
    assert.equal(body.displays[0].display, 'Lobby');
  });
});

test('schedule route validates body then forwards to Xibo', async () => {
  await withServer(createApp({ xiboClient: fakeXibo }), async base => {
    const bad = await fetch(`${base}/api/xibo/schedules`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(bad.status, 400);

    const good = await fetch(`${base}/api/xibo/schedules`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ layoutId: 7, displayGroupIds: [2], eventTypeId: 1 }),
    });
    assert.equal(good.status, 201);
    const body = await good.json();
    assert.equal(body.event.eventId, 9);
  });
});

test('layout route validates and creates a Xibo layout', async () => {
  calls.length = 0;
  await withServer(createApp({ xiboClient: fakeXibo }), async base => {
    const bad = await fetch(`${base}/api/xibo/layouts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    assert.equal(bad.status, 400);

    const good = await fetch(`${base}/api/xibo/layouts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Promo Agosto', resolutionId: 1, description: 'Desde Open Signage' }),
    });
    assert.equal(good.status, 201);
    const body = await good.json();
    assert.equal(body.layout.layoutId, 77);
    assert.equal(calls[0].payload.name, 'Promo Agosto');
  });
});

test('media upload route accepts raw binary without exposing Xibo credentials', async () => {
  calls.length = 0;
  await withServer(createApp({ xiboClient: fakeXibo }), async base => {
    const response = await fetch(`${base}/api/xibo/library/upload`, {
      method: 'POST',
      headers: {
        'content-type': 'image/png',
        'x-file-name': 'promo.png',
        'x-media-name': 'Promo Principal',
        'x-media-tags': 'open-signage,ia',
      },
      body: new Uint8Array([137, 80, 78, 71]),
    });

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.media[0].mediaId, 88);
    assert.equal(calls[0].payload.fileName, 'promo.png');
    assert.equal(calls[0].payload.contentType, 'image/png');
    assert.equal(calls[0].payload.name, 'Promo Principal');
    assert.equal(calls[0].payload.bytes.length, 4);
  });
});