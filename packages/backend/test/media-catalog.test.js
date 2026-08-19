const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { MediaCatalog } = require('../src/media-catalog');

test('media catalog deduplicates identical bytes and tracks usage', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'osp-media-'));
  const catalog = new MediaCatalog({ dataDir: dir });
  const bytes = Buffer.from('same-media');
  const first = catalog.record({ bytes, fileName: 'promo.mp4', contentType: 'video/mp4', tags: 'promo', xiboPayload: { mediaId: 7 } });
  const second = catalog.record({ bytes, fileName: 'copy.mp4', contentType: 'video/mp4', tags: 'promo', xiboPayload: { mediaId: 999 } });
  assert.equal(first.deduplicated, false);
  assert.equal(second.deduplicated, true);
  assert.equal(second.xiboPayload.mediaId, 7);
  assert.equal(second.usageCount, 2);
  assert.equal(catalog.search({ q: 'promo' }).length, 1);
  catalog.close();
});
