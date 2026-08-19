const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFfmpegArgs, safeMediaStem } = require('../src/media-transcoder');

test('transcode plan uses fixed ffmpeg arguments without shell input interpolation', () => {
  const args = buildFfmpegArgs('/data/in file.mov', '/data/out.mp4', 'screen-1080p');
  assert.deepEqual(args.slice(0, 3), ['-y', '-i', '/data/in file.mov']);
  assert.equal(args.at(-1), '/data/out.mp4');
  assert.ok(args.includes('libx264'));
  assert.ok(args.includes('yuv420p'));
});

test('media stem removes path traversal and shell characters', () => {
  assert.equal(safeMediaStem('../../promo;rm -rf.mov'), 'promo-rm-rf');
  assert.equal(safeMediaStem('Oferta Agosto!!.MP4'), 'Oferta-Agosto');
});
