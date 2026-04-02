/**
 * Middleware de vérification de rôle ADMIN.
 * Doit être utilisé après authMiddleware.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}

/**
 * Factory pour accepter plusieurs rôles.
 * Ex: requireRole('ADMIN', 'CONTROLEUR')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Accès réservé aux rôles : ${roles.join(', ')}` });
    }
    next();
  };
}

module.exports = { requireAdmin, requireRole };
