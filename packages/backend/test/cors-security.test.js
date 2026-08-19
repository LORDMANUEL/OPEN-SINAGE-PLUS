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

const xiboClient = { async authenticate() { return 'token'; } };

test('API does not reflect arbitrary cross-origin requests by default', async () => {
  await withServer(createApp({ xiboClient }), async base => {
    const response = await fetch(`${base}/api/health`, { headers: { origin: 'https://evil.example' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});

test('API can explicitly allow a configured frontend origin', async () => {
  await withServer(createApp({ xiboClient, corsOrigins: ['https://signage.example.com'] }), async base => {
    const allowed = await fetch(`${base}/api/health`, { headers: { origin: 'https://signage.example.com' } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://signage.example.com');

    const denied = await fetch(`${base}/api/health`, { headers: { origin: 'https://evil.example' } });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  });
});
