const test = require('node:test');
const assert = require('node:assert/strict');
const { XiboClient } = require('../src/xibo-client');

function clientWithRecorder() {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith('/api/authorize/access_token')) {
      return new Response(JSON.stringify({ access_token: 'catalog-token', expires_in: 3600 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify([{ id: 1 }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  return {
    calls,
    client: new XiboClient({
      baseUrl: 'https://signage.example.com',
      clientId: 'id',
      clientSecret: 'secret',
      fetchImpl,
    }),
  };
}

for (const [methodName, endpoint] of [
  ['getLayouts', '/api/layout'],
  ['getLibrary', '/api/library'],
  ['getPlaylists', '/api/playlist'],
  ['getDisplayGroups', '/api/displaygroup'],
  ['getSchedules', '/api/schedule'],
]) {
  test(`${methodName} reads ${endpoint}`, async () => {
    const { client, calls } = clientWithRecorder();
    const result = await client[methodName]();
    assert.equal(Array.isArray(result), true);
    assert.equal(calls[1].url, `https://signage.example.com${endpoint}`);
    assert.equal(calls[1].options.headers.Authorization, 'Bearer catalog-token');
  });
}

test('publishLayout sends an urlencoded PUT to the publish endpoint', async () => {
  const { client, calls } = clientWithRecorder();
  await client.publishLayout(17);
  assert.equal(calls[1].url, 'https://signage.example.com/api/layout/publish/17');
  assert.equal(calls[1].options.method, 'PUT');
  assert.match(calls[1].options.headers['Content-Type'], /application\/x-www-form-urlencoded/);
});
