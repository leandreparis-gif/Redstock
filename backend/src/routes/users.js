'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const router = express.Router();
const prisma = new PrismaClient();

// Toutes les routes utilisateurs nécessitent d'être ADMIN
router.use(authMiddleware, requireAdmin);

/**
 * GET /api/users
 * Liste tous les utilisateurs de l'UL courante.
 */
router.get('/', async (req, res) => {
  try {
    const users = await prisma.utilisateur.findMany({
      where: { unite_locale_id: req.user.unite_locale_id },
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
 * Body : { prenom, qualification, role, login, password }
 */
router.post('/', async (req, res) => {
  const { prenom, qualification, role, login, password } = req.body;

  if (!prenom || !qualification || !role || !login || !password) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  if (!['PSE1', 'PSE2', 'CI', 'AUTRE'].includes(qualification)) {
    return res.status(400).json({ error: 'Qualification invalide' });
  }

  if (!['ADMIN', 'CONTROLEUR'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  try {
    const existing = await prisma.utilisateur.findUnique({ where: { login } });
    if (existing) {
      return res.status(409).json({ error: 'Cet identifiant est déjà utilisé' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.utilisateur.create({
      data: {
        prenom,
        qualification,
        role,
        login,
        password_hash,
        unite_locale_id: req.user.unite_locale_id,
      },
      select: { id: true, prenom: true, qualification: true, role: true, login: true, created_at: true },
    });

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
    const user = await prisma.utilisateur.findFirst({
      where: { id: req.params.id, unite_locale_id: req.user.unite_locale_id },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const updated = await prisma.utilisateur.update({
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
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe trop court (min. 6 caractères)' });
  }

  try {
    const user = await prisma.utilisateur.findFirst({
      where: { id: req.params.id, unite_locale_id: req.user.unite_locale_id },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const password_hash = await bcrypt.hash(password, 10);
    await prisma.utilisateur.update({ where: { id: req.params.id }, data: { password_hash } });

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
    const user = await prisma.utilisateur.findFirst({
      where: { id: req.params.id, unite_locale_id: req.user.unite_locale_id },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    await prisma.utilisateur.delete({ where: { id: req.params.id } });
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    console.error('[users/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
