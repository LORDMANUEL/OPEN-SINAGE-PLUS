const test = require('node:test');
const assert = require('node:assert/strict');

const { XiboClient, normalizeBaseUrl } = require('../src/xibo-client');

function createClient(calls, responder) {
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith('/api/authorize/access_token')) {
      return new Response(JSON.stringify({ access_token: 'abc', expires_in: 3600 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return responder(url, options);
  };

  return new XiboClient({
    baseUrl: 'https://signage.example.com',
    clientId: 'id',
    clientSecret: 'secret',
    fetchImpl,
  });
}

test('normalizeBaseUrl removes trailing slashes and requires http(s)', () => {
  assert.equal(normalizeBaseUrl('https://signage.example.com///'), 'https://signage.example.com');
  assert.throws(() => normalizeBaseUrl('ftp://example.com'), /http/i);
  assert.throws(() => normalizeBaseUrl(''), /required/i);
});

test('authenticate uses client_credentials and caches the access token', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ access_token: 'token-123', expires_in: 3600 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const client = new XiboClient({
    baseUrl: 'https://signage.example.com/',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    fetchImpl,
  });

  assert.equal(await client.authenticate(), 'token-123');
  assert.equal(await client.authenticate(), 'token-123');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://signage.example.com/api/authorize/access_token');
  assert.equal(calls[0].options.method, 'POST');

  const body = new URLSearchParams(calls[0].options.body);
  assert.equal(body.get('grant_type'), 'client_credentials');
  assert.equal(body.get('client_id'), 'client-id');
  assert.equal(body.get('client_secret'), 'client-secret');
});

test('getDisplays sends a Bearer token to Xibo display endpoint', async () => {
  const calls = [];
  const client = createClient(calls, async () => new Response(JSON.stringify([{ displayId: 7, display: 'Lobby' }]), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }));

  const displays = await client.getDisplays();
  assert.equal(displays[0].displayId, 7);
  assert.equal(calls[1].url, 'https://signage.example.com/api/display');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer abc');
});

test('createSchedule posts URL encoded data to the Xibo schedule endpoint', async () => {
  const calls = [];
  const client = createClient(calls, async () => new Response(JSON.stringify({ eventId: 42 }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  }));

  const result = await client.createSchedule({ eventTypeId: 1, displayGroupIds: '5', layoutId: 9 });
  assert.equal(result.eventId, 42);
  assert.equal(calls[1].url, 'https://signage.example.com/api/schedule');
  assert.equal(calls[1].options.method, 'POST');
  assert.match(calls[1].options.headers['Content-Type'], /application\/x-www-form-urlencoded/);
  const body = new URLSearchParams(calls[1].options.body);
  assert.equal(body.get('layoutId'), '9');
});

test('createLayout posts name and resolutionId using form encoding', async () => {
  const calls = [];
  const client = createClient(calls, async () => new Response(JSON.stringify({ layoutId: 77, layout: 'Promo Agosto' }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  }));

  const result = await client.createLayout({ name: 'Promo Agosto', resolutionId: 1, description: 'Creado desde Open Signage' });
  assert.equal(result.layoutId, 77);
  assert.equal(calls[1].url, 'https://signage.example.com/api/layout');
  assert.equal(calls[1].options.method, 'POST');
  const body = new URLSearchParams(calls[1].options.body);
  assert.equal(body.get('name'), 'Promo Agosto');
  assert.equal(body.get('resolutionId'), '1');
});

test('uploadMedia sends binary content to Xibo as multipart form data', async () => {
  const calls = [];
  const client = createClient(calls, async () => new Response(JSON.stringify([{ mediaId: 88, name: 'promo.png' }]), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }));

  const bytes = new Uint8Array([137, 80, 78, 71]);
  const result = await client.uploadMedia({
    bytes,
    fileName: 'promo.png',
    contentType: 'image/png',
    name: 'Promo Principal',
    tags: 'open-signage,ia',
  });

  assert.equal(result[0].mediaId, 88);
  assert.equal(calls[1].url, 'https://signage.example.com/api/library');
  assert.equal(calls[1].options.method, 'POST');
  assert.ok(calls[1].options.body instanceof FormData);
  assert.equal(calls[1].options.body.get('name'), 'Promo Principal');
  assert.equal(calls[1].options.body.get('tags'), 'open-signage,ia');
  const file = calls[1].options.body.get('files');
  assert.equal(file.name, 'promo.png');
  assert.equal(file.type, 'image/png');
});

test('createWebpageWidget adds and configures a Xibo webpage widget for a PLUS player URL', async () => {
  const calls = [];
  const client = createClient(calls, async (url) => {
    if (url.endsWith('/api/playlist/widget/webpage/41')) {
      return new Response(JSON.stringify({ widgetId: 501, type: 'webpage' }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/playlist/widget/501')) {
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected URL ${url}`);
  });

  const result = await client.createWebpageWidget({
    playlistId: 41,
    uri: 'https://signage.example.com/player/scene-token',
    name: 'Open Signage PLUS',
    duration: 60,
  });

  assert.equal(result.widgetId, 501);
  assert.equal(calls[1].url, 'https://signage.example.com/api/playlist/widget/webpage/41');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[2].url, 'https://signage.example.com/api/playlist/widget/501');
  assert.equal(calls[2].options.method, 'PUT');
  const body = new URLSearchParams(calls[2].options.body);
  assert.equal(body.get('uri'), 'https://signage.example.com/player/scene-token');
  assert.equal(body.get('modeid'), '1');
  assert.equal(body.get('useDuration'), '1');
  assert.equal(body.get('duration'), '60');
});

test('constructor rejects incomplete Xibo credentials', () => {
  assert.throws(() => new XiboClient({ baseUrl: 'https://example.com', clientId: '', clientSecret: 'x' }), /clientId/i);
  assert.throws(() => new XiboClient({ baseUrl: 'https://example.com', clientId: 'x', clientSecret: '' }), /clientSecret/i);
});