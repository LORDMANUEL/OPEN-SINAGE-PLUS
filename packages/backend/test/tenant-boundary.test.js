const test = require('node:test');
const assert = require('node:assert/strict');
const { createGlobalResourceScopeGuard } = require('../src/tenant-boundary');

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

function runGuard({ role = 'viewer', email = 'user@example.com', organizations = [], memberships = [] } = {}) {
  const guard = createGlobalResourceScopeGuard({
    organizationStore: {
      listOrganizations: () => organizations,
      listMemberships: () => memberships,
    },
  });
  const res = responseRecorder();
  let nextCalled = false;
  guard({ auth: { role, email } }, res, () => { nextCalled = true; });
  return { nextCalled, res };
}

test('admin always passes deployment-global tenant guard', () => {
  const result = runGuard({ role: 'admin', organizations: [{ id: 'a' }, { id: 'b' }] });
  assert.equal(result.nextCalled, true);
});

test('legacy deployment without organizations remains compatible', () => {
  const result = runGuard({ organizations: [] });
  assert.equal(result.nextCalled, true);
});

test('single-organization member may use global resources', () => {
  const result = runGuard({ organizations: [{ id: 'a', active: true }], memberships: [{ organizationId: 'a' }] });
  assert.equal(result.nextCalled, true);
});

test('single-organization non-member is denied', () => {
  const result = runGuard({ organizations: [{ id: 'a', active: true }], memberships: [] });
  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 403);
  assert.equal(result.res.body.error, 'TENANT_SCOPE_REQUIRED');
});

test('multi-organization non-admin fails closed even with one membership', () => {
  const result = runGuard({
    organizations: [{ id: 'a', active: true }, { id: 'b', active: true }],
    memberships: [{ organizationId: 'a' }],
  });
  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 403);
  assert.equal(result.res.body.error, 'TENANT_SCOPE_REQUIRED');
});
