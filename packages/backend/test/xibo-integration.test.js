const test = require('node:test');
const assert = require('node:assert/strict');

const { createXiboIntegrationFromEnv } = require('../src/xibo-integration');

test('missing Xibo environment does not prevent API startup', async () => {
  const integration = createXiboIntegrationFromEnv({});

  await assert.rejects(() => integration.authenticate(), /not configured/i);
  await assert.rejects(() => integration.getDisplays(), /not configured/i);
});

test('complete environment creates a configured Xibo client', () => {
  const integration = createXiboIntegrationFromEnv({
    XIBO_BASE_URL: 'https://signage.example.com',
    XIBO_CLIENT_ID: 'client',
    XIBO_CLIENT_SECRET: 'secret',
  }, async () => new Response('{}', { status: 200 }));

  assert.equal(integration.baseUrl, 'https://signage.example.com');
});
