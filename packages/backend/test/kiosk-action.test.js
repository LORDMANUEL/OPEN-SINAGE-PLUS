const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAction } = require('../src/scene-store');

test('scene action accepts only valid PLUS player tokens', () => {
  assert.deepEqual(normalizeAction({ type: 'scene', token: 'abcdefghijklmnop' }), { type: 'scene', token: 'abcdefghijklmnop' });
  assert.throws(() => normalizeAction({ type: 'scene', token: '../admin' }), /valid scene token/);
});
