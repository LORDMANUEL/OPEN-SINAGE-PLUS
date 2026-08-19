const test = require('node:test');
const assert = require('node:assert/strict');
const { permit, xiboPermissionFor } = require('../src/rbac-middleware');

function responseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

test('xibo permission mapping separates read and mutation capabilities', () => {
  assert.equal(xiboPermissionFor('GET', '/library'), 'media:read');
  assert.equal(xiboPermissionFor('POST', '/library/upload'), 'media:write');
  assert.equal(xiboPermissionFor('GET', '/schedules'), 'schedule:read');
  assert.equal(xiboPermissionFor('POST', '/schedules'), 'schedule:write');
  assert.equal(xiboPermissionFor('GET', '/displays'), 'screen:read');
  assert.equal(xiboPermissionFor('POST', '/layouts'), 'campaign:write');
});

test('viewer cannot mutate media while marketing can', () => {
  const denied = responseRecorder();
  let deniedNext = false;
  permit('media:write')({ auth: { role: 'viewer' } }, denied, () => { deniedNext = true; });
  assert.equal(denied.statusCode, 403);
  assert.equal(denied.payload.permission, 'media:write');
  assert.equal(deniedNext, false);

  const allowed = responseRecorder();
  let allowedNext = false;
  permit('media:write')({ auth: { role: 'marketing' } }, allowed, () => { allowedNext = true; });
  assert.equal(allowedNext, true);
});

test('operator can operate queues but cannot publish campaigns', () => {
  let queueNext = false;
  permit('queue:operate')({ auth: { role: 'operator' } }, responseRecorder(), () => { queueNext = true; });
  assert.equal(queueNext, true);

  const denied = responseRecorder();
  permit('campaign:write')({ auth: { role: 'operator' } }, denied, () => assert.fail('operator must not publish campaigns'));
  assert.equal(denied.statusCode, 403);
});
