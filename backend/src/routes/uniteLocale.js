'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/role');
const { getUlId } = require('../utils/resolveUL');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/unite-locale
 * - SUPER_ADMIN : liste toutes les UL
 * - ADMIN / CONTRIBUTEUR : retourne l'UL de l'utilisateur connecté
 */
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'SUPER_ADMIN') {
      const uls = await prisma.uniteLocale.findMany({
        select: { id: true, nom: true, telephone: true, email: true, adresse: true, destinataires_alertes: true, created_at: true },
        orderBy: { nom: 'asc' },
      });
      return res.json(uls);
    }

    const ul = await prisma.uniteLocale.findUnique({
      where: { id: req.user.unite_locale_id },
      select: { id: true, nom: true, telephone: true, email: true, adresse: true, destinataires_alertes: true },
    });
    if (!ul) return res.status(404).json({ error: 'Unité locale introuvable' });
    res.json(ul);
  } catch (err) {
    console.error('[unite-locale/GET]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/unite-locale/:id
 * SUPER_ADMIN : détails d'une UL spécifique avec ses users
 */
router.get('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const ul = await prisma.uniteLocale.findUnique({
      where: { id: req.params.id },
      include: {
        users: {
          select: { id: true, prenom: true, qualification: true, role: true, login: true, created_at: true },
          orderBy: { prenom: 'asc' },
        },
      },
    });
    if (!ul) return res.status(404).json({ error: 'Unité locale introuvable' });
    res.json(ul);
  } catch (err) {
    console.error('[unite-locale/GET/:id]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/unite-locale
 * SUPER_ADMIN : créer une nouvelle UL
 */
router.post('/', requireSuperAdmin, async (req, res) => {
  const { nom, telephone, email, adresse } = req.body;

  if (!nom?.trim()) {
    return res.status(400).json({ error: 'Le nom est requis' });
  }

  try {
    const ul = await prisma.uniteLocale.create({
      data: {
        nom: nom.trim(),
        telephone: telephone?.trim() || null,
        email: email?.trim() || null,
        adresse: adresse?.trim() || null,
      },
      select: { id: true, nom: true, telephone: true, email: true, adresse: true, created_at: true },
    });
    res.status(201).json(ul);
  } catch (err) {
    console.error('[unite-locale/POST]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/unite-locale/:id
 * SUPER_ADMIN uniquement : modifier les infos d'une UL
 */
router.put('/:id', requireSuperAdmin, async (req, res) => {
  const { nom, telephone, email, adresse } = req.body;

  if (!nom?.trim()) {
    return res.status(400).json({ error: 'Le nom est requis' });
  }

  try {
    const existing = await prisma.uniteLocale.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Unité locale introuvable' });

    const ul = await prisma.uniteLocale.update({
      where: { id: req.params.id },
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

/**
 * PATCH /api/unite-locale/alertes
 * ADMIN+ : configurer les emails destinataires des alertes
 */
router.patch('/alertes', requireAdmin, async (req, res) => {
  const { destinataires_alertes } = req.body;

  if (!Array.isArray(destinataires_alertes)) {
    return res.status(400).json({ error: 'destinataires_alertes doit être un tableau' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleaned = [...new Set(destinataires_alertes.map(e => String(e).trim().toLowerCase()))];
  for (const email of cleaned) {
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: `Email invalide : ${email}` });
    }
  }

  try {
    const ulId = getUlId(req);
    if (!ulId) return res.status(400).json({ error: 'Unité locale non identifiée' });

    const ul = await prisma.uniteLocale.update({
      where: { id: ulId },
      data: { destinataires_alertes: cleaned },
      select: { id: true, destinataires_alertes: true },
    });
    res.json(ul);
  } catch (err) {
    console.error('[unite-locale/PATCH/alertes]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/unite-locale/:id
 * SUPER_ADMIN uniquement : supprimer une UL (et cascade ses données)
 */
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const existing = await prisma.uniteLocale.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Unité locale introuvable' });

    // Suppression en cascade manuelle (Prisma ne cascade pas automatiquement sans onDelete)
    await prisma.$transaction([
      prisma.log.deleteMany({ where: { unite_locale_id: req.params.id } }),
      prisma.planningControle.deleteMany({ where: { unite_locale_id: req.params.id } }),
      prisma.alerte.deleteMany({ where: { unite_locale_id: req.params.id } }),
      prisma.controle.deleteMany({ where: { unite_locale_id: req.params.id } }),
      prisma.mouvementUniforme.deleteMany({ where: { uniforme: { unite_locale_id: req.params.id } } }),
      prisma.uniforme.deleteMany({ where: { unite_locale_id: req.params.id } }),
      prisma.stockPochette.deleteMany({ where: { unite_locale_id: req.params.id } }),
      prisma.stockTiroir.deleteMany({ where: { unite_locale_id: req.params.id } }),
      prisma.pochette.deleteMany({ where: { lot: { unite_locale_id: req.params.id } } }),
      prisma.lot.deleteMany({ where: { unite_locale_id: req.params.id } }),
      prisma.tiroir.deleteMany({ where: { armoire: { unite_locale_id: req.params.id } } }),
      prisma.armoire.deleteMany({ where: { unite_locale_id: req.params.id } }),
      prisma.article.deleteMany({ where: { unite_locale_id: req.params.id } }),
      prisma.user.deleteMany({ where: { unite_locale_id: req.params.id } }),
      prisma.uniteLocale.delete({ where: { id: req.params.id } }),
    ]);

    res.json({ message: 'Unité locale supprimée' });
  } catch (err) {
    console.error('[unite-locale/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
