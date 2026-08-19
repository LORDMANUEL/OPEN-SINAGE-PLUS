const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { AnalyticsStore } = require('../src/analytics-store');

test('analytics records proof of play and interactions then summarizes them', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'osp-analytics-'));
  const store = new AnalyticsStore({ dataDir: dir });
  store.recordPlayback({ sceneToken: 'abcdefghijklmnop', deviceToken: 'abcdefghijklmnopqrstuvwx', durationMs: 15000 });
  store.recordPlayback({ sceneToken: 'abcdefghijklmnop', durationMs: 10000 });
  store.recordInteraction({ sceneToken: 'abcdefghijklmnop', eventType: 'ticket', itemId: 'button-1' });
  const summary = store.summary({ sinceHours: 1 });
  assert.equal(summary.playback.total, 2);
  assert.equal(summary.playback.durationMs, 25000);
  assert.equal(summary.interactions, 1);
  assert.equal(summary.topScenes[0].sceneToken, 'abcdefghijklmnop');
  store.close();
});
