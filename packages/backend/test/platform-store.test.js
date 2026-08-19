const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { PlatformStore, ROLE_PERMISSIONS } = require('../src/platform-store');

async function makeStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'osp-platform-'));
  const store = new PlatformStore({ dataDir: dir });
  await store.initialize({ adminEmail: 'admin@example.com', adminPassword: 'StrongPassword-2026!' });
  return { dir, store };
}

test('platform database bootstraps admin and authenticates hashed password', async () => {
  const { store } = await makeStore();
  const admin = store.findUserByEmail('admin@example.com');
  assert.equal(admin.role, 'admin');
  assert.equal(admin.passwordHash, undefined);
  const authenticated = await store.authenticate('admin@example.com', 'StrongPassword-2026!');
  assert.equal(authenticated.email, 'admin@example.com');
  assert.equal(await store.authenticate('admin@example.com', 'wrong-password'), null);
});

test('user management enforces unique email and exposes role permissions', async () => {
  const { store } = await makeStore();
  const user = await store.createUser({ email: 'marketing@example.com', name: 'Marketing', role: 'marketing', password: 'AnotherStrong-2026!' });
  assert.equal(user.role, 'marketing');
  assert.ok(ROLE_PERMISSIONS.marketing.includes('campaign:write'));
  await assert.rejects(() => store.createUser({ email: 'marketing@example.com', role: 'viewer', password: 'AnotherStrong-2026!' }), /already exists/);
});

test('audit log and settings are durable and queryable', async () => {
  const { dir, store } = await makeStore();
  store.setSetting('brand.name', 'Open Signage Plus');
  store.audit({ actorEmail: 'admin@example.com', action: 'setting.update', resourceType: 'setting', resourceId: 'brand.name', detail: { value: 'Open Signage Plus' }, ip: '127.0.0.1' });
  assert.equal(store.getSetting('brand.name'), 'Open Signage Plus');
  assert.equal(store.listAudit({ limit: 10 })[0].action, 'setting.update');
  store.close();
  const reopened = new PlatformStore({ dataDir: dir });
  await reopened.initialize();
  assert.equal(reopened.getSetting('brand.name'), 'Open Signage Plus');
});

test('campaign workflow creates immutable versions, approvals and rollback target', async () => {
  const { store } = await makeStore();
  const campaign = store.createCampaign({ name: 'Promo Agosto', createdBy: 'admin@example.com', target: { displayGroupIds: [1] } });
  const v1 = store.addCampaignVersion(campaign.id, { scene: { name: 'Promo', items: [] }, createdBy: 'admin@example.com' });
  const review = store.setCampaignStatus(campaign.id, 'review', 'admin@example.com');
  assert.equal(review.status, 'review');
  const approved = store.setCampaignStatus(campaign.id, 'approved', 'admin@example.com');
  assert.equal(approved.status, 'approved');
  const v2 = store.addCampaignVersion(campaign.id, { scene: { name: 'Promo v2', items: [] }, createdBy: 'admin@example.com' });
  assert.equal(v2.version, 2);
  const rolled = store.rollbackCampaign(campaign.id, v1.id, 'admin@example.com');
  assert.equal(rolled.activeVersionId, v1.id);
});
