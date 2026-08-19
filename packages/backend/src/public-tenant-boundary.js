const { hasPermission } = require('./platform-store');

/**
 * Public resources that use human-readable identifiers (for example queue
 * names) cannot prove tenant ownership. They are allowed in legacy/single-org
 * deployments and fail closed once the installation contains >1 organization.
 *
 * Random public capability URLs such as /form/<uuid> or /player/<token> are
 * handled by their own token validation and are not routed through this guard.
 */
function createPublicGlobalResourceGuard({ organizationStore }) {
  if (!organizationStore) throw new Error('organizationStore is required');
  return (_req, res, next) => {
    const organizations = organizationStore.listOrganizations().filter(item => item.active !== false);
    if (organizations.length <= 1) return next();
    return res.status(503).json({
      error: 'TENANT_SCOPE_REQUIRED',
      message: 'La operación pública usa un recurso global y está deshabilitada en modo multiempresa hasta tener scope explícito de organización.',
    });
  };
}

module.exports = { createPublicGlobalResourceGuard };
