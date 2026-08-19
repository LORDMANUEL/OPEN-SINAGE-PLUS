const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { OrganizationStore } = require('../src/organization-store');

test('non-admin users only see organizations and locations they belong to', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osp-org-isolation-'));
  const store = new OrganizationStore({ dataDir });
  try {
    const orgA = store.createOrganization({ name: 'Empresa A', slug: 'empresa-a' });
    const orgB = store.createOrganization({ name: 'Empresa B', slug: 'empresa-b' });
    const locA = store.createLocation({ organizationId: orgA.id, name: 'Sucursal A1', code: 'A1' });
    store.createLocation({ organizationId: orgB.id, name: 'Sucursal B1', code: 'B1' });
    store.addMembership({ userEmail: 'viewer@example.com', organizationId: orgA.id, locationId: locA.id });

    assert.deepEqual(store.listOrganizationsForUser('viewer@example.com').map(item => item.id), [orgA.id]);
    assert.deepEqual(store.listLocationsForUser('viewer@example.com').map(item => item.id), [locA.id]);
    assert.equal(store.canAccessOrganization('viewer@example.com', orgA.id), true);
    assert.equal(store.canAccessOrganization('viewer@example.com', orgB.id), false);
  } finally {
    store.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test('organization-wide membership exposes all locations in that organization only', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'osp-org-wide-'));
  const store = new OrganizationStore({ dataDir });
  try {
    const orgA = store.createOrganization({ name: 'Empresa A', slug: 'empresa-a' });
    const orgB = store.createOrganization({ name: 'Empresa B', slug: 'empresa-b' });
    const a1 = store.createLocation({ organizationId: orgA.id, name: 'A1', code: 'A1' });
    const a2 = store.createLocation({ organizationId: orgA.id, name: 'A2', code: 'A2' });
    store.createLocation({ organizationId: orgB.id, name: 'B1', code: 'B1' });
    store.addMembership({ userEmail: 'marketing@example.com', organizationId: orgA.id });

    assert.deepEqual(new Set(store.listLocationsForUser('marketing@example.com').map(item => item.id)), new Set([a1.id, a2.id]));
  } finally {
    store.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
