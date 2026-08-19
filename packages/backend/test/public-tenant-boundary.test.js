const test = require('node:test');
const assert = require('node:assert/strict');
const { createPublicGlobalResourceGuard } = require('../src/public-tenant-boundary');

function run(count) {
  const guard = createPublicGlobalResourceGuard({ organizationStore: { listOrganizations: () => Array.from({ length: count }, (_, index) => ({ id: String(index + 1), active: true })) } });
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  let nextCalled = false;
  guard({}, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

test('public global resource remains available for legacy and single-tenant installs', () => {
  assert.equal(run(0).nextCalled, true);
  assert.equal(run(1).nextCalled, true);
});

test('public global resource fails closed for multi-tenant installs', () => {
  const result = run(2);
  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 503);
  assert.equal(result.res.body.error, 'TENANT_SCOPE_REQUIRED');
});
