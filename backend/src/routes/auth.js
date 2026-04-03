'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const logAction = require('../utils/logAction');

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
      qualification: user.qualification,
      role: user.role,
      unite_locale_id: user.unite_locale_id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    logAction(prisma, {
      uniteLocaleId: user.unite_locale_id,
      action: 'LOGIN',
      details: `Connexion réussie`,
      user: { prenom: user.prenom, login: user.login },
    });

    res.json({
      token,
      user: {
        ...payload,
        unite_locale_nom: user.unite_locale.nom,
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
      qualification: user.qualification,
      role: user.role,
      login: user.login,
      unite_locale_id: user.unite_locale_id,
      unite_locale_nom: user.unite_locale.nom,
    });
  } catch (err) {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
});

module.exports = router;
