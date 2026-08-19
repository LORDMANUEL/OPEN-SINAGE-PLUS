const { hasPermission } = require('./platform-store');

function permit(permission) {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: 'AUTH_REQUIRED' });
    if (!hasPermission(req.auth.role, permission)) return res.status(403).json({ error: 'FORBIDDEN', permission });
    return next();
  };
}

function xiboPermissionFor(method, path) {
  const verb = String(method || 'GET').toUpperCase();
  const resource = String(path || '');
  if (resource.startsWith('/library')) return verb === 'GET' ? 'media:read' : 'media:write';
  if (resource.startsWith('/schedules')) return verb === 'GET' ? 'schedule:read' : 'schedule:write';
  if (verb === 'GET') return 'screen:read';
  return 'campaign:write';
}

function xiboPermissionGuard(req, res, next) {
  return permit(xiboPermissionFor(req.method, req.path))(req, res, next);
}

module.exports = { permit, xiboPermissionFor, xiboPermissionGuard };
