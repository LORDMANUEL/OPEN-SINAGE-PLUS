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

const authService = new AuthService({ email: 'admin@example.com', password: 'StrongPass123!', secret: '12345678901234567890123456789012' });
const xiboClient = { async getDisplays() { return [{ displayId: 1, display: 'Lobby' }]; }, async authenticate() { return 'token'; } };

test('login returns signed session and protected Xibo route rejects anonymous callers', async () => {
  await withServer(createApp({ xiboClient, authService }), async base => {
    const anonymous = await fetch(`${base}/api/xibo/displays`);
    assert.equal(anonymous.status, 401);

    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@example.com', password: 'StrongPass123!' }) });
    assert.equal(login.status, 200);
    const session = await login.json();
    assert.ok(session.token);

    const authorized = await fetch(`${base}/api/xibo/displays`, { headers: { authorization: `Bearer ${session.token}` } });
    assert.equal(authorized.status, 200);
    assert.equal((await authorized.json()).displays[0].display, 'Lobby');
  });
});

test('public player scene read and ticket issuance remain accessible without admin session', async () => {
  const sceneStore = { async get(token) { return { token, name: 'Public', items: [] }; } };
  const queueStore = { async issue({ queue, prefix }) { return { id: '1', queue, prefix, number: `${prefix}001`, status: 'waiting' }; } };
  await withServer(createApp({ xiboClient, authService, sceneStore, queueStore }), async base => {
    const scene = await fetch(`${base}/api/player/scenes/demo-player-token`);
    assert.equal(scene.status, 200);
    const ticket = await fetch(`${base}/api/queues/recepcion/tickets`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prefix: 'R' }) });
    assert.equal(ticket.status, 201);
  });
});
