const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { SceneStore } = require('../src/scene-store');

test('scene store creates a token and persists scenes across instances', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'open-signage-scenes-'));
  try {
    const store = new SceneStore({ dataDir: dir });
    const created = await store.create({
      name: 'Lobby demo',
      duration: 15,
      background: '#050b18',
      items: [{ type: 'text', text: 'Bienvenido', x: 10, y: 10, width: 80, height: 20 }],
    });

    assert.match(created.token, /^[a-zA-Z0-9_-]{12,}$/);
    assert.equal(created.scene.name, 'Lobby demo');

    const secondStore = new SceneStore({ dataDir: dir });
    const loaded = await secondStore.get(created.token);
    assert.equal(loaded.name, 'Lobby demo');
    assert.equal(loaded.items[0].text, 'Bienvenido');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('scene store preserves concurrent scene creation without lost scenes', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'open-signage-scenes-'));
  try {
    const store = new SceneStore({ dataDir: dir });
    const created = await Promise.all(Array.from({ length: 12 }, (_, index) => store.create({
      name: `Scene ${index + 1}`,
      items: [{ type: 'text', text: `Item ${index + 1}` }],
    })));
    assert.equal(new Set(created.map(entry => entry.token)).size, 12);
    const loaded = await Promise.all(created.map(entry => store.get(entry.token)));
    assert.equal(loaded.filter(Boolean).length, 12);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('scene store accepts safe touch buttons and QR items', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'open-signage-scenes-'));
  try {
    const store = new SceneStore({ dataDir: dir });
    const created = await store.create({
      name: 'Kiosco',
      items: [
        {
          type: 'button', text: 'Reservar', x: 20, y: 70, width: 30, height: 10,
          action: { type: 'openUrl', url: 'https://example.com/reservar' }
        },
        { type: 'qr', value: 'https://example.com/promo', x: 60, y: 60, width: 20, height: 20 }
      ],
    });
    assert.equal(created.scene.items[0].action.type, 'openUrl');
    assert.equal(created.scene.items[0].action.url, 'https://example.com/reservar');
    assert.equal(created.scene.items[1].type, 'qr');
    assert.equal(created.scene.items[1].value, 'https://example.com/promo');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('scene store accepts ticket actions but rejects unsafe URLs and unsupported actions', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'open-signage-scenes-'));
  try {
    const store = new SceneStore({ dataDir: dir });
    const created = await store.create({
      name: 'Turnos',
      items: [{ type: 'button', text: 'Tomar turno', action: { type: 'ticket', queue: 'recepcion', prefix: 'R' } }],
    });
    assert.equal(created.scene.items[0].action.queue, 'recepcion');

    await assert.rejects(
      store.create({ name: 'Bad URL', items: [{ type: 'button', text: 'X', action: { type: 'openUrl', url: 'javascript:alert(1)' } }] }),
      /http/i,
    );
    await assert.rejects(
      store.create({ name: 'Bad action', items: [{ type: 'button', text: 'X', action: { type: 'shell', command: 'rm -rf /' } }] }),
      /action/i,
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('scene store rejects unsafe or unsupported scene items', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'open-signage-scenes-'));
  try {
    const store = new SceneStore({ dataDir: dir });
    await assert.rejects(
      store.create({ name: 'Bad', items: [{ type: 'script', code: 'alert(1)' }] }),
      /unsupported/i,
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
