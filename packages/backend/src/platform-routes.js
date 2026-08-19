const express = require('express');
const { hasPermission, ROLE_PERMISSIONS } = require('./platform-store');

function createPlatformRouter({ platformStore }) {
  if (!platformStore) throw new Error('platformStore is required');
  const router = express.Router();

  router.get('/me', (req, res) => res.json({ user: req.auth, permissions: ROLE_PERMISSIONS[req.auth?.role] || [] }));

  router.get('/users', permit('user:manage'), (_req, res) => res.json({ users: platformStore.listUsers() }));
  router.post('/users', permit('user:manage'), async (req, res) => {
    try {
      const user = await platformStore.createUser(req.body || {});
      auditRequest(platformStore, req, 'user.create', 'user', user.id, { email: user.email, role: user.role });
      return res.status(201).json({ user });
    } catch (error) { return validationError(res, error); }
  });
  router.patch('/users/:id', permit('user:manage'), (req, res) => {
    try {
      const user = platformStore.updateUser(req.params.id, req.body || {});
      if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });
      auditRequest(platformStore, req, 'user.update', 'user', user.id, { role: user.role, active: user.active });
      return res.json({ user });
    } catch (error) { return validationError(res, error); }
  });
  router.post('/users/:id/password', permit('user:manage'), async (req, res) => {
    try {
      const changed = await platformStore.setUserPassword(req.params.id, req.body?.password);
      if (!changed) return res.status(404).json({ error: 'USER_NOT_FOUND' });
      auditRequest(platformStore, req, 'user.password.reset', 'user', req.params.id);
      return res.status(204).end();
    } catch (error) { return validationError(res, error); }
  });

  router.get('/audit', permit('audit:read'), (req, res) => res.json({ events: platformStore.listAudit({ limit: req.query.limit, actorEmail: req.query.actorEmail || '' }) }));

  router.get('/settings', permit('settings:read'), (req, res) => res.json({ settings: platformStore.listSettings(req.query.prefix || '') }));
  router.put('/settings/:key', permit('settings:write'), (req, res) => {
    try {
      const value = platformStore.setSetting(req.params.key, req.body?.value);
      auditRequest(platformStore, req, 'setting.update', 'setting', req.params.key, { value });
      return res.json({ key: req.params.key, value });
    } catch (error) { return validationError(res, error); }
  });

  router.get('/campaigns', permit('campaign:read'), (_req, res) => res.json({ campaigns: platformStore.listCampaigns() }));
  router.post('/campaigns', permit('campaign:write'), (req, res) => {
    try {
      const campaign = platformStore.createCampaign({ name: req.body?.name, target: req.body?.target || {}, createdBy: req.auth.email });
      auditRequest(platformStore, req, 'campaign.create', 'campaign', campaign.id, { name: campaign.name });
      return res.status(201).json({ campaign });
    } catch (error) { return validationError(res, error); }
  });
  router.get('/campaigns/:id', permit('campaign:read'), (req, res) => {
    const campaign = platformStore.getCampaign(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'CAMPAIGN_NOT_FOUND' });
    return res.json({ campaign, versions: platformStore.listCampaignVersions(req.params.id) });
  });
  router.post('/campaigns/:id/versions', permit('campaign:write'), (req, res) => {
    try {
      const version = platformStore.addCampaignVersion(req.params.id, { scene: req.body?.scene || {}, createdBy: req.auth.email });
      auditRequest(platformStore, req, 'campaign.version.create', 'campaign', req.params.id, { version: version.version, versionId: version.id });
      return res.status(201).json({ version });
    } catch (error) { return validationError(res, error); }
  });
  router.post('/campaigns/:id/status', permit('campaign:review'), (req, res) => {
    try {
      const campaign = platformStore.setCampaignStatus(req.params.id, String(req.body?.status || ''), req.auth.email);
      auditRequest(platformStore, req, `campaign.${campaign.status}`, 'campaign', campaign.id);
      return res.json({ campaign });
    } catch (error) { return validationError(res, error); }
  });
  router.post('/campaigns/:id/rollback', permit('campaign:write'), (req, res) => {
    try { return res.json({ campaign: platformStore.rollbackCampaign(req.params.id, req.body?.versionId, req.auth.email) }); }
    catch (error) { return validationError(res, error); }
  });

  router.get('/qr', permit('qr:manage'), (_req, res) => res.json({ qr: platformStore.listDynamicQr() }));
  router.post('/qr', permit('qr:manage'), (req, res) => {
    try {
      const qr = platformStore.createDynamicQr(req.body || {});
      auditRequest(platformStore, req, 'qr.create', 'dynamic_qr', qr.id, { slug: qr.slug, destination: qr.destination });
      return res.status(201).json({ qr });
    } catch (error) { return validationError(res, error); }
  });

  router.post('/forms', permit('form:manage'), (req, res) => {
    try {
      const form = platformStore.createForm({ name: req.body?.name, schema: req.body?.schema || {} });
      auditRequest(platformStore, req, 'form.create', 'form', form.id, { name: form.name });
      return res.status(201).json({ form });
    } catch (error) { return validationError(res, error); }
  });
  router.get('/forms/:id/responses', permit('form:manage'), (req, res) => res.json({ responses: platformStore.listFormResponses(req.params.id, req.query.limit) }));

  return router;
}

function permit(permission) {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: 'AUTH_REQUIRED' });
    if (!hasPermission(req.auth.role, permission)) return res.status(403).json({ error: 'FORBIDDEN', permission });
    return next();
  };
}

function auditRequest(store, req, action, resourceType, resourceId, detail = {}) {
  store.audit({ actorEmail: req.auth?.email || '', action, resourceType, resourceId, detail, ip: req.ip || '' });
}
function validationError(res, error) { return res.status(400).json({ error: 'INVALID_REQUEST', message: error instanceof Error ? error.message : 'Invalid request' }); }

module.exports = { createPlatformRouter, permit, auditRequest };
