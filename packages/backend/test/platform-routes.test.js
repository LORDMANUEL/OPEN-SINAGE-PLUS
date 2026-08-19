const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { PlatformStore } = require('../src/platform-store');
const { AuthService } = require('../src/auth-service');
const { createPlatformRouter } = require('../src/platform-routes');
const { requireAuth } = require('../src/app');

async function setup() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'osp-platform-api-'));
  const store = new PlatformStore({ dataDir: dir });
  await store.initialize({ adminEmail: 'admin@example.com', adminPassword: 'StrongPassword-2026!' });
  await store.createUser({ email: 'viewer@example.com', name: 'Viewer', role: 'viewer', password: 'ViewerPassword-2026!' });
  const auth = new AuthService({ secret: '0123456789abcdef0123456789abcdef', platformStore: store });
  const app = express();
  app.use(express.json());
  app.use('/api/platform', requireAuth(auth), createPlatformRouter({ platformStore: store }));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { store, auth, server, base };
}

async function bearer(auth, email, password) { const session = await auth.login(email, password); return `Bearer ${session.token}`; }

test('admin can create users and audit events are recorded', async () => {
  const ctx = await setup();
  try {
    const token = await bearer(ctx.auth, 'admin@example.com', 'StrongPassword-2026!');
    const response = await fetch(`${ctx.base}/api/platform/users`, { method: 'POST', headers: { authorization: token, 'content-type': 'application/json' }, body: JSON.stringify({ email: 'ops@example.com', name: 'Ops', role: 'operator', password: 'OperatorPassword-2026!' }) });
    assert.equal(response.status, 201);
    const audit = await fetch(`${ctx.base}/api/platform/audit`, { headers: { authorization: token } });
    assert.equal(audit.status, 200);
    const body = await audit.json();
    assert.ok(body.events.some(event => event.action === 'user.create'));
  } finally { ctx.server.close(); ctx.store.close(); }
});

test('viewer is denied campaign mutation by RBAC', async () => {
  const ctx = await setup();
  try {
    const token = await bearer(ctx.auth, 'viewer@example.com', 'ViewerPassword-2026!');
    const response = await fetch(`${ctx.base}/api/platform/campaigns`, { method: 'POST', headers: { authorization: token, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Denied' }) });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error, 'FORBIDDEN');
  } finally { ctx.server.close(); ctx.store.close(); }
});
