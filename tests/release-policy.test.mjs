import test from 'node:test';
import assert from 'node:assert/strict';
import { channelStatus, nextTag, assertPromotion, parseReleaseTag } from '../scripts/release/release-policy.mjs';

const alpha4 = ['v2.1.0-alpha.1','v2.1.0-alpha.2','v2.1.0-alpha.3','v2.1.0-alpha.4'];
const alpha5 = [...alpha4, 'v2.1.0-alpha.5'];
const beta2 = [...alpha5, 'v2.1.0-beta.1','v2.1.0-beta.2'];
const beta3 = [...beta2, 'v2.1.0-beta.3'];

test('parses stable and prerelease tags', () => {
  assert.deepEqual(parseReleaseTag('v2.1.0-alpha.5'), { version:'2.1.0', channel:'alpha', number:5, tag:'v2.1.0-alpha.5' });
  assert.deepEqual(parseReleaseTag('v2.1.0'), { version:'2.1.0', channel:'stable', number:null, tag:'v2.1.0' });
  assert.equal(parseReleaseTag('bad-tag'), null);
});

test('cuts alphas sequentially and blocks alpha 6', () => {
  assert.equal(nextTag({ tags: alpha4, version:'2.1.0', channel:'alpha' }), 'v2.1.0-alpha.5');
  assert.throws(() => nextTag({ tags: alpha5, version:'2.1.0', channel:'alpha' }), /promote to beta/);
});

test('requires five alphas before beta', () => {
  assert.throws(() => nextTag({ tags: alpha4, version:'2.1.0', channel:'beta' }), /need 5 alpha/);
  assert.equal(nextTag({ tags: alpha5, version:'2.1.0', channel:'beta' }), 'v2.1.0-beta.1');
  assert.equal(assertPromotion({ tags: alpha5, version:'2.1.0', from:'alpha', to:'beta' }), true);
});

test('requires three betas before stable', () => {
  assert.throws(() => nextTag({ tags: beta2, version:'2.1.0', channel:'stable' }), /need 3 beta/);
  assert.equal(nextTag({ tags: beta3, version:'2.1.0', channel:'stable' }), 'v2.1.0');
  assert.equal(assertPromotion({ tags: beta3, version:'2.1.0', from:'beta', to:'stable' }), true);
});

test('reports promotion readiness', () => {
  assert.deepEqual(channelStatus({ tags: beta3, version:'2.1.0' }), {
    version:'2.1.0', alphaCount:5, betaCount:3, stableCount:0,
    nextAlpha:6, nextBeta:4, alphaPromotionReady:true, stablePromotionReady:true,
    alphasPerBeta:5, betasPerStable:3,
  });
});

test('never releases the same stable version twice', () => {
  assert.throws(() => nextTag({ tags: [...beta3,'v2.1.0'], version:'2.1.0', channel:'stable' }), /already stable/);
});
