const express = require('express');
const { hasPermission } = require('./platform-store');

function createOrganizationRouter({ organizationStore, platformStore }) {
  const router = express.Router();
  router.use(express.json({ limit: '256kb' }));

  router.get('/', (req, res) => {
    const organizations = isAdmin(req)
      ? organizationStore.listOrganizations()
      : organizationStore.listOrganizationsForUser(req.auth.email);
    return res.json({ organizations });
  });

  router.post('/', adminOnly, (req, res) => {
    try {
      const organization = organizationStore.createOrganization(req.body || {});
      platformStore.audit({ actorEmail: req.auth.email, action: 'organization.create', resourceType: 'organization', resourceId: organization.id, detail: { name: organization.name }, ip: req.ip });
      return res.status(201).json({ organization });
    } catch (error) { return invalid(res, error); }
  });

  router.get('/locations', (req, res) => {
    const organizationId = String(req.query.organizationId || '');
    if (isAdmin(req)) return res.json({ locations: organizationStore.listLocations(organizationId) });
    if (organizationId && !organizationStore.canAccessOrganization(req.auth.email, organizationId)) return res.json({ locations: [] });
    return res.json({ locations: organizationStore.listLocationsForUser(req.auth.email, organizationId) });
  });

  router.post('/locations', adminOnly, (req, res) => {
    try {
      const location = organizationStore.createLocation(req.body || {});
      platformStore.audit({ actorEmail: req.auth.email, action: 'location.create', resourceType: 'location', resourceId: location.id, detail: { organizationId: location.organizationId, name: location.name }, ip: req.ip });
      return res.status(201).json({ location });
    } catch (error) { return invalid(res, error); }
  });

  router.get('/memberships/me', (req, res) => res.json({ memberships: organizationStore.listMemberships(req.auth.email) }));

  router.post('/memberships', adminOnly, (req, res) => {
    try {
      const memberships = organizationStore.addMembership(req.body || {});
      platformStore.audit({ actorEmail: req.auth.email, action: 'membership.assign', resourceType: 'user', resourceId: req.body?.userEmail || '', detail: { organizationId: req.body?.organizationId, locationId: req.body?.locationId || null }, ip: req.ip });
      return res.json({ memberships });
    } catch (error) { return invalid(res, error); }
  });

  return router;
}
function isAdmin(req) { return hasPermission(req.auth?.role, 'user:manage'); }
function adminOnly(req, res, next) { return isAdmin(req) ? next() : res.status(403).json({ error: 'FORBIDDEN' }); }
function invalid(res, error) { return res.status(400).json({ error: 'INVALID_REQUEST', message: String(error?.message || 'invalid request').slice(0, 300) }); }
module.exports = { createOrganizationRouter };
