const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../src/app');
const { AuthService } = require('../src/auth-service');

async function withServer(app, fn) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try { await fn(`http://127.0.0.1:${port}`); } finally { await new Promise(resolve => server.close(resolve)); }
}

const authService = new AuthService({
  email: 'admin@example.com',
  password: 'StrongPass123!',
  secret: '12345678901234567890123456789012',
});
const xiboClient = { async authenticate() { return 'token'; } };

function limits() {
  return {
    login: { limit: 2, windowMs: 60_000 },
    ticket: { limit: 2, windowMs: 60_000 },
    deviceRegister: { limit: 2, windowMs: 60_000 },
    qr: { limit: 2, windowMs: 60_000 },
  };
}

test('login is rate limited after repeated failures from the same client', async () => {
  await withServer(createApp({ xiboClient, authService, rateLimitOptions: limits() }), async base => {
    for (let i = 0; i < 2; i += 1) {
      const response = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.com', password: 'wrong-password' }),
      });
      assert.equal(response.status, 401);
    }
    const blocked = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'wrong-password' }),
    });
    assert.equal(blocked.status, 429);
    assert.match(blocked.headers.get('retry-after') || '', /^\d+$/);
  });
});

test('public ticket creation and device registration are independently rate limited', async () => {
  const queueStore = { async issue({ queue, prefix }) { return { id: '1', queue, number: `${prefix}001` }; } };
  const deviceStore = { async register() { return { token: 'abcdefghijklmnopqrstuv', pairingCode: 'ABC123' }; } };
  await withServer(createApp({ xiboClient, authService, queueStore, deviceStore, rateLimitOptions: limits() }), async base => {
    for (let i = 0; i < 2; i += 1) {
      const ticket = await fetch(`${base}/api/queues/recepcion/tickets`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prefix: 'R' }),
      });
      assert.equal(ticket.status, 201);
      const device = await fetch(`${base}/api/player/devices/register`, { method: 'POST' });
      assert.equal(device.status, 201);
    }
    assert.equal((await fetch(`${base}/api/queues/recepcion/tickets`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 429);
    assert.equal((await fetch(`${base}/api/player/devices/register`, { method: 'POST' })).status, 429);
  });
});

test('public QR rendering is rate limited without blocking unrelated public reads', async () => {
  const qrService = { async render() { return { contentType: 'image/svg+xml', bytes: Buffer.from('<svg/>') }; } };
  const sceneStore = { async get(token) { return { token, name: 'Scene', items: [] }; } };
  await withServer(createApp({ xiboClient, authService, qrService, sceneStore, rateLimitOptions: limits() }), async base => {
    assert.equal((await fetch(`${base}/api/qr?value=one`)).status, 200);
    assert.equal((await fetch(`${base}/api/qr?value=two`)).status, 200);
    assert.equal((await fetch(`${base}/api/qr?value=three`)).status, 429);
    assert.equal((await fetch(`${base}/api/player/scenes/demo-player-token`)).status, 200);
  });
});
