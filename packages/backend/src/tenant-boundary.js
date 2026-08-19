const { hasPermission } = require('./platform-store');

/**
 * Protect resources that are still deployment-global (Xibo, media, scenes,
 * analytics, queues, etc.) from being exposed across organizations.
 *
 * Until each of those resources carries an explicit organization/location key:
 * - Admin may operate deployment-global resources.
 * - Legacy deployments with zero organizations remain compatible.
 * - A non-admin may use global resources only when exactly one active
 *   organization exists and the user is a member of it.
 * - Multi-organization deployments fail closed for non-admin global access.
 *
 * This is deliberately restrictive: denying a workflow is safer than silently
 * leaking another tenant's data.
 */
function createGlobalResourceScopeGuard({ organizationStore }) {
  if (!organizationStore) throw new Error('organizationStore is required');
  return (req, res, next) => {
    if (hasPermission(req.auth?.role, 'user:manage')) return next();

    const organizations = organizationStore.listOrganizations().filter(item => item.active !== false);
    if (organizations.length === 0) return next();

    const memberships = organizationStore.listMemberships(req.auth?.email || '');
    if (organizations.length === 1 && memberships.some(item => item.organizationId === organizations[0].id)) return next();

    return res.status(403).json({
      error: 'TENANT_SCOPE_REQUIRED',
      message: organizations.length > 1
        ? 'Este recurso es global y no puede usarse por un usuario no-admin en modo multiempresa hasta tener scope de organización explícito.'
        : 'El usuario no pertenece a la organización activa.',
    });
  };
}

module.exports = { createGlobalResourceScopeGuard };
