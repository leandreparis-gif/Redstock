'use strict';

/**
 * Retourne le filtre unite_locale_id pour les requêtes Prisma.
 * - SUPER_ADMIN avec ?unite_locale_id= → filtre sur cette UL
 * - SUPER_ADMIN sans paramètre → {} (pas de filtre = toutes les UL)
 * - Autres rôles → filtre sur leur UL
 */
function getUlFilter(req) {
  if (req.user.role === 'SUPER_ADMIN') {
    const ulId = req.query.unite_locale_id;
    return ulId ? { unite_locale_id: ulId } : {};
  }
  return { unite_locale_id: req.user.unite_locale_id };
}

/**
 * Retourne l'ID de l'UL cible (pour les écritures).
 * - SUPER_ADMIN : depuis query ou body (requis)
 * - Autres : depuis le token JWT
 * Retourne null si SUPER_ADMIN n'a pas spécifié d'UL.
 */
function getUlId(req) {
  if (req.user.role === 'SUPER_ADMIN') {
    return req.query.unite_locale_id || req.body?.unite_locale_id || null;
  }
  return req.user.unite_locale_id;
}

module.exports = { getUlFilter, getUlId };
