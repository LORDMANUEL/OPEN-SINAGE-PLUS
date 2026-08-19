const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeScene } = require('../src/scene-store');

test('scene normalization preserves responsive format and bounded timeline animation', () => {
  const scene = normalizeScene({
    name: 'Retail vertical',
    duration: 10,
    format: '9:16',
    items: [{
      id: 'headline', type: 'text', text: 'OFERTA ESPECIAL',
      x: 8, y: 10, width: 84, height: 20, color: '#fff', fontSize: 64,
      animation: 'fade', startAt: 1, endAt: 8,
    }],
  });

  assert.equal(scene.format, '9:16');
  assert.equal(scene.items[0].animation, 'fade');
  assert.equal(scene.items[0].startAt, 1);
  assert.equal(scene.items[0].endAt, 8);
});

test('scene normalization clamps timeline to scene duration and rejects unknown formats safely', () => {
  const scene = normalizeScene({
    name: 'Bounded', duration: 5, format: 'unsupported',
    items: [{ type: 'text', text: 'x', animation: 'unknown', startAt: -4, endAt: 99 }],
  });
  assert.equal(scene.format, '16:9');
  assert.equal(scene.items[0].animation, 'none');
  assert.equal(scene.items[0].startAt, 0);
  assert.equal(scene.items[0].endAt, 5);
});
