'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');

const crypto = require('crypto');
const logAction = require('../utils/logAction');
const { resetPassword: sendResetEmail } = require('../services/mailService');

const router = express.Router();

/**
 * POST /api/auth/login
 * Body : { login, password }
 * Retourne : { token, user: { id, prenom, qualification, role, unite_locale_id } }
 */
router.post('/login', async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { login },
      include: { unite_locale: { select: { id: true, nom: true } } },
    });

    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const payload = {
      id: user.id,
      prenom: user.prenom,
      nom: user.nom,
      email: user.email,
      qualification: user.qualification,
      role: user.role,
      unite_locale_id: user.unite_locale_id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    if (user.unite_locale_id) {
      logAction(prisma, {
        uniteLocaleId: user.unite_locale_id,
        action: 'LOGIN',
        details: `Connexion réussie`,
        user: { prenom: user.prenom, login: user.login },
      });
    }

    res.json({
      token,
      user: {
        ...payload,
        unite_locale_nom: user.unite_locale?.nom || null,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/auth/me
 * Vérifie le token et retourne les infos de l'utilisateur courant.
 */
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        qualification: true,
        role: true,
        login: true,
        unite_locale_id: true,
        unite_locale: { select: { id: true, nom: true } },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable' });
    }

    res.json({
      id: user.id,
      prenom: user.prenom,
      nom: user.nom,
      email: user.email,
      qualification: user.qualification,
      role: user.role,
      login: user.login,
      unite_locale_id: user.unite_locale_id,
      unite_locale_nom: user.unite_locale?.nom || null,
    });
  } catch (err) {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
});

/**
 * PUT /api/auth/profile
 * Modifier ses informations personnelles (prenom, nom, email).
 */
router.put('/profile', authMiddleware, async (req, res) => {
  const { prenom, nom, email } = req.body;

  if (!prenom || prenom.trim().length === 0) {
    return res.status(400).json({ error: 'Le prénom est requis' });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide' });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        prenom: prenom.trim(),
        nom: nom?.trim() || null,
        email: email?.trim() || null,
      },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        qualification: true,
        role: true,
        login: true,
        unite_locale_id: true,
        unite_locale: { select: { id: true, nom: true } },
      },
    });

    res.json({
      ...updated,
      unite_locale_nom: updated.unite_locale?.nom || null,
    });
  } catch (err) {
    console.error('[auth/profile]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/auth/password
 * Modifier son propre mot de passe.
 * Body : { currentPassword, newPassword }
 */
router.patch('/password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const passwordOk = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password_hash } });

    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) {
    console.error('[auth/password]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Body : { email }
 * Génère un token de reset, l'enregistre en DB, envoie l'email.
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  try {
    const user = await prisma.user.findFirst({ where: { email } });

    // Toujours répondre 200 pour ne pas révéler si l'email existe
    if (!user) {
      return res.json({ message: 'Si un compte est associé à cet email, un lien de réinitialisation a été envoyé.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await prisma.user.update({
      where: { id: user.id },
      data: { reset_token: token, reset_token_expires: expires },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await sendResetEmail({ to: email, prenom: user.prenom, resetLink });

    res.json({ message: 'Si un compte est associé à cet email, un lien de réinitialisation a été envoyé.' });
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/auth/reset-password
 * Body : { token, newPassword }
 * Vérifie le token et met à jour le mot de passe.
 */
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        reset_token: token,
        reset_token_expires: { gte: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Lien invalide ou expiré. Veuillez refaire une demande.' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash, reset_token: null, reset_token_expires: null },
    });

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/auth/logout
 * Déconnexion (invalidation côté client).
 */
router.post('/logout', (req, res) => {
  // Le token JWT est invalidé côté client (suppression localStorage).
  // Pour une invalidation serveur, un token blacklist serait nécessaire.
  res.json({ message: 'Déconnecté' });
});

module.exports = router;
