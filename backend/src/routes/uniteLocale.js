'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/unite-locale
 * Retourne les infos de l'unité locale de l'utilisateur connecté.
 */
router.get('/', async (req, res) => {
  try {
    const ul = await prisma.uniteLocale.findUnique({
      where: { id: req.user.unite_locale_id },
      select: { id: true, nom: true, telephone: true, email: true, adresse: true },
    });
    if (!ul) return res.status(404).json({ error: 'Unité locale introuvable' });
    res.json(ul);
  } catch (err) {
    console.error('[unite-locale/GET]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/unite-locale
 * Met à jour les infos de l'unité locale (admin uniquement).
 */
router.put('/', requireAdmin, async (req, res) => {
  const { nom, telephone, email, adresse } = req.body;

  if (!nom?.trim()) {
    return res.status(400).json({ error: 'Le nom est requis' });
  }

  try {
    const ul = await prisma.uniteLocale.update({
      where: { id: req.user.unite_locale_id },
      data: {
        nom: nom.trim(),
        telephone: telephone?.trim() || null,
        email: email?.trim() || null,
        adresse: adresse?.trim() || null,
      },
      select: { id: true, nom: true, telephone: true, email: true, adresse: true },
    });
    res.json(ul);
  } catch (err) {
    console.error('[unite-locale/PUT]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
