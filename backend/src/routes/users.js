'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const logAction = require('../utils/logAction');
const { bienvenueUtilisateur } = require('../services/mailService');

const router = express.Router();

// Toutes les routes utilisateurs nécessitent d'être ADMIN ou SUPER_ADMIN
router.use(authMiddleware, requireAdmin);

/**
 * Résout l'UL cible :
 * - SUPER_ADMIN : utilise le query param ?unite_locale_id= (obligatoire)
 * - ADMIN : utilise son propre unite_locale_id
 */
function resolveUL(req, res) {
  if (req.user.role === 'SUPER_ADMIN') {
    const ulId = req.query.unite_locale_id;
    if (!ulId) {
      res.status(400).json({ error: 'unite_locale_id requis pour super admin' });
      return null;
    }
    return ulId;
  }
  return req.user.unite_locale_id;
}

/**
 * GET /api/users
 * Liste tous les utilisateurs de l'UL ciblée.
 */
router.get('/', async (req, res) => {
  const ulId = resolveUL(req, res);
  if (!ulId) return;

  try {
    const users = await prisma.user.findMany({
      where: { unite_locale_id: ulId },
      select: {
        id: true,
        prenom: true,
        qualification: true,
        role: true,
        login: true,
        created_at: true,
      },
      orderBy: { prenom: 'asc' },
    });
    res.json(users);
  } catch (err) {
    console.error('[users/GET]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/users
 * Créer un nouvel utilisateur.
 * Body : { prenom, qualification, role, login, password, unite_locale_id? }
 */
router.post('/', async (req, res) => {
  const { prenom, qualification, role, login, password, email } = req.body;

  if (!prenom || !qualification || !role || !login || !password) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  if (!['PSE1', 'PSE2', 'CI', 'AUTRE'].includes(qualification)) {
    return res.status(400).json({ error: 'Qualification invalide' });
  }

  // ADMIN ne peut créer que ADMIN ou CONTRIBUTEUR
  // SUPER_ADMIN peut aussi créer SUPER_ADMIN
  const allowedRoles = req.user.role === 'SUPER_ADMIN'
    ? ['SUPER_ADMIN', 'ADMIN', 'CONTRIBUTEUR']
    : ['ADMIN', 'CONTRIBUTEUR'];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Mot de passe trop court (min. 8 caractères)' });
  }

  // Déterminer l'UL cible
  let targetUlId;
  if (role === 'SUPER_ADMIN') {
    targetUlId = null; // Super admin n'a pas d'UL
  } else if (req.user.role === 'SUPER_ADMIN') {
    targetUlId = req.body.unite_locale_id || req.query.unite_locale_id;
    if (!targetUlId) {
      return res.status(400).json({ error: 'unite_locale_id requis pour créer un utilisateur d\'UL' });
    }
  } else {
    targetUlId = req.user.unite_locale_id;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) {
      return res.status(409).json({ error: 'Cet identifiant est déjà utilisé' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        prenom,
        qualification,
        role,
        login,
        password_hash,
        email: email?.trim() || null,
        unite_locale_id: targetUlId,
      },
      select: { id: true, prenom: true, qualification: true, role: true, login: true, created_at: true },
    });

    if (targetUlId) {
      logAction(prisma, {
        uniteLocaleId: targetUlId,
        action: 'USER_CREATE',
        details: `Compte créé : ${prenom} (${login}) — rôle ${role}`,
        user: req.user,
      });
    }

    // Envoyer email de bienvenue si l'email est renseigné
    if (email) {
      bienvenueUtilisateur({ to: email, prenom, login }).catch(err => {
        console.error('[users/POST] Erreur envoi email bienvenue:', err.message);
      });
    }

    res.status(201).json(user);
  } catch (err) {
    console.error('[users/POST]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/users/:id
 * Modifier un utilisateur (prenom, qualification, role).
 */
router.put('/:id', async (req, res) => {
  const { prenom, qualification, role } = req.body;

  try {
    // SUPER_ADMIN peut modifier n'importe quel user, ADMIN seulement ceux de son UL
    const whereClause = req.user.role === 'SUPER_ADMIN'
      ? { id: req.params.id }
      : { id: req.params.id, unite_locale_id: req.user.unite_locale_id };

    const user = await prisma.user.findFirst({ where: whereClause });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // ADMIN ne peut pas promouvoir en SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Seul un super admin peut attribuer ce rôle' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(prenom && { prenom }),
        ...(qualification && { qualification }),
        ...(role && { role }),
      },
      select: { id: true, prenom: true, qualification: true, role: true, login: true, created_at: true },
    });

    res.json(updated);
  } catch (err) {
    console.error('[users/PUT]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/users/:id/password
 * Réinitialiser le mot de passe.
 * Body : { password }
 */
router.patch('/:id/password', async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Mot de passe trop court (min. 8 caractères)' });
  }

  try {
    const whereClause = req.user.role === 'SUPER_ADMIN'
      ? { id: req.params.id }
      : { id: req.params.id, unite_locale_id: req.user.unite_locale_id };

    const user = await prisma.user.findFirst({ where: whereClause });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const password_hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: req.params.id }, data: { password_hash } });

    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) {
    console.error('[users/PATCH/password]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', async (req, res) => {
  // Empêcher l'auto-suppression
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
  }

  try {
    const whereClause = req.user.role === 'SUPER_ADMIN'
      ? { id: req.params.id }
      : { id: req.params.id, unite_locale_id: req.user.unite_locale_id };

    const user = await prisma.user.findFirst({ where: whereClause });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // ADMIN ne peut pas supprimer un SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Impossible de supprimer un super administrateur' });
    }

    await prisma.user.delete({ where: { id: req.params.id } });

    if (user.unite_locale_id) {
      logAction(prisma, {
        uniteLocaleId: user.unite_locale_id,
        action: 'USER_DELETE',
        details: `Compte supprimé : ${user.prenom} (${user.login})`,
        user: req.user,
      });
    }

    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    console.error('[users/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
