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
  async createLayout(payload) { calls.push({ type: 'layout', payload }); return { ...payload, layoutId: 77 }; },
  async uploadMedia(payload) { calls.push({ type: 'media', payload }); return [{ mediaId: 88, name: payload.name || payload.fileName }]; },
  async publishLayout(layoutId) { return { layoutId, published: true }; },
};

function createFakeSceneStore() {
  const scenes = new Map();
  let counter = 0;
  return {
    async create(scene) {
      const token = `scene-token-${++counter}`;
      const saved = { ...scene, token };
      scenes.set(token, saved);
      return { token, scene: saved };
    },
    async update(token, scene) {
      if (!scenes.has(token)) return null;
      const saved = { ...scenes.get(token), ...scene, token };
      scenes.set(token, saved);
      return saved;
    },
    async get(token) { return scenes.get(token) || null; },
  };
}

function createFakeQueueStore() {
  const tickets = [];
  return {
    async issue(payload) { const ticket = { id: 't1', number: 'R001', status: 'waiting', ...payload }; tickets.push(ticket); return ticket; },
    async list() { return tickets; },
    async callNext(_queue, payload) { const ticket = tickets.find(item => item.status === 'waiting'); if (!ticket) return null; ticket.status = 'called'; ticket.desk = payload.desk; return ticket; },
    async complete(_queue, id) { const ticket = tickets.find(item => item.id === id); if (!ticket) return null; ticket.status = 'completed'; return ticket; },
  };
}

const fakeAi = {
  status() { return { configured: true, provider: 'ollama', model: 'tiny' }; },
  async generateScene(prompt) { return { name: 'Generated', duration: 10, background: '#000', items: [{ type: 'text', text: prompt, x: 0, y: 0, width: 100, height: 100 }] }; },
};

const fakeQr = {
  async render(value) { return { contentType: 'image/svg+xml', bytes: Buffer.from(`<svg><text>${value}</text></svg>`) }; },
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
      headers: { 'content-type': 'image/png', 'x-file-name': 'promo.png', 'x-media-name': 'Promo Principal', 'x-media-tags': 'open-signage,ia' },
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

test('browser player scenes can be created and fetched by token without login', async () => {
  const sceneStore = createFakeSceneStore();
  await withServer(createApp({ xiboClient: fakeXibo, sceneStore }), async base => {
    const created = await fetch(`${base}/api/player/scenes`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Lobby Demo', duration: 15, background: '#050b18', items: [{ type: 'text', text: 'Bienvenido', x: 0, y: 0, width: 100, height: 100 }] }),
    });
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    assert.match(createdBody.token, /^scene-token-/);
    const read = await fetch(`${base}/api/player/scenes/${createdBody.token}`);
    assert.equal(read.status, 200);
    const readBody = await read.json();
    assert.equal(readBody.scene.name, 'Lobby Demo');
  });
});

test('AI routes expose status and generate a preview scene without auto-publishing', async () => {
  await withServer(createApp({ xiboClient: fakeXibo, aiService: fakeAi }), async base => {
    const status = await fetch(`${base}/api/ai/status`);
    assert.deepEqual(await status.json(), { configured: true, provider: 'ollama', model: 'tiny' });
    const generated = await fetch(`${base}/api/ai/generate-scene`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'Promo verano' }) });
    assert.equal(generated.status, 200);
    const body = await generated.json();
    assert.equal(body.scene.items[0].text, 'Promo verano');
    assert.equal(body.token, undefined);
  });
});

test('ticket queue API issues, calls, lists and completes tickets', async () => {
  const queueStore = createFakeQueueStore();
  await withServer(createApp({ xiboClient: fakeXibo, queueStore }), async base => {
    const issued = await fetch(`${base}/api/queues/recepcion/tickets`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prefix: 'R', customerName: 'Luis' }) });
    assert.equal(issued.status, 201);
    assert.equal((await issued.json()).ticket.number, 'R001');

    const called = await fetch(`${base}/api/queues/recepcion/call-next`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ desk: 'Módulo 1' }) });
    const calledTicket = (await called.json()).ticket;
    assert.equal(calledTicket.status, 'called');

    const listed = await fetch(`${base}/api/queues/recepcion`);
    assert.equal((await listed.json()).tickets.length, 1);

    const completed = await fetch(`${base}/api/queues/recepcion/tickets/${calledTicket.id}/complete`, { method: 'POST' });
    assert.equal((await completed.json()).ticket.status, 'completed');
  });
});

test('QR route returns an image from the local renderer and validates input', async () => {
  await withServer(createApp({ xiboClient: fakeXibo, qrService: fakeQr }), async base => {
    const missing = await fetch(`${base}/api/qr`);
    assert.equal(missing.status, 400);
    const response = await fetch(`${base}/api/qr?value=${encodeURIComponent('https://example.com')}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /image\/svg\+xml/);
    assert.match(await response.text(), /example\.com/);
  });
});
