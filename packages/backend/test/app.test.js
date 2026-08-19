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

const fakeXibo = {
  async authenticate() { return 'token'; },
  async getDisplays() { return [{ displayId: 1, display: 'Lobby' }]; },
  async createSchedule(payload) { return { eventId: 9, payload }; },
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