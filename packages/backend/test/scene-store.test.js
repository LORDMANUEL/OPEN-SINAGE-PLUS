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
