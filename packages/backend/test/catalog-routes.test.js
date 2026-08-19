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
  async authenticate() { return 'ok'; },
  async getDisplays() { return [{ displayId: 1 }]; },
  async getLayouts() { return [{ layoutId: 2, layout: 'Promo' }]; },
  async getLibrary() { return [{ mediaId: 3, name: 'hero.jpg' }]; },
  async getPlaylists() { return [{ playlistId: 4, name: 'Lobby' }]; },
  async getDisplayGroups() { return [{ displayGroupId: 5, displayGroup: 'Recepción' }]; },
  async getSchedules() { return [{ eventId: 6 }]; },
  async publishLayout(layoutId) { return { layoutId, published: true }; },
  async createSchedule(payload) { return { eventId: 7, ...payload }; },
};

for (const [route, key] of [
  ['/api/xibo/layouts', 'layouts'],
  ['/api/xibo/library', 'media'],
  ['/api/xibo/playlists', 'playlists'],
  ['/api/xibo/display-groups', 'displayGroups'],
  ['/api/xibo/schedules', 'schedules'],
]) {
  test(`${route} returns ${key}`, async () => {
    await withServer(createApp({ xiboClient: fakeXibo }), async base => {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(Array.isArray(body[key]), true);
    });
  });
}

test('publish endpoint validates and forwards layout id', async () => {
  await withServer(createApp({ xiboClient: fakeXibo }), async base => {
    const response = await fetch(`${base}/api/xibo/layouts/12/publish`, { method: 'POST' });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.layout.layoutId, 12);
  });
});
