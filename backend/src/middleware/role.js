/**
 * Middleware de vérification de rôle SUPER_ADMIN.
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux super administrateurs' });
  }
  next();
}

/**
 * Middleware de vérification de rôle ADMIN (ou SUPER_ADMIN).
 * Doit être utilisé après authMiddleware.
 */
function requireAdmin(req, res, next) {
  if (!req.user || !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}

/**
 * Factory pour accepter plusieurs rôles.
 * SUPER_ADMIN passe toujours.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || (req.user.role !== 'SUPER_ADMIN' && !roles.includes(req.user.role))) {
      return res.status(403).json({ error: `Accès réservé aux rôles : ${roles.join(', ')}` });
    }
    next();
  };
}

module.exports = { requireSuperAdmin, requireAdmin, requireRole };
