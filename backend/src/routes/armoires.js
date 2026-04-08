'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const { getUlFilter, getUlId } = require('../utils/resolveUL');
const logAction = require('../utils/logAction');

const router = express.Router();

router.use(authMiddleware);

// ─── ARMOIRES ─────────────────────────────────────────────────────────────────

/**
 * GET /api/armoires
 * Vue arborescence complète : Armoire > Tiroirs > Stocks (articles + lots).
 */
router.get('/', async (req, res) => {
  try {
    const armoires = await prisma.armoire.findMany({
      where: { ...getUlFilter(req) },
      include: {
        tiroirs: {
          include: {
            stocks: {
              include: {
                article: true,
              },
            },
          },
          orderBy: { nom: 'asc' },
        },
      },
      orderBy: { nom: 'asc' },
    });
    res.json(armoires);
  } catch (err) {
    console.error('[armoires/GET]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/armoires
 * Body : { nom, description }
 */
router.post('/', requireAdmin, async (req, res) => {
  const { nom, description } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis' });

  const ulId = getUlId(req);
  if (!ulId) return res.status(400).json({ error: 'Unité locale non définie' });

  try {
    const armoire = await prisma.armoire.create({
      data: { nom, description: description || null, unite_locale_id: ulId },
    });
    res.status(201).json(armoire);
  } catch (err) {
    console.error('[armoires/POST]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/armoires/:id
 */
router.put('/:id', requireAdmin, async (req, res) => {
  const { nom, description } = req.body;
  try {
    const existing = await prisma.armoire.findFirst({
      where: { id: req.params.id, ...getUlFilter(req) },
    });
    if (!existing) return res.status(404).json({ error: 'Armoire introuvable' });

    const armoire = await prisma.armoire.update({
      where: { id: req.params.id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(description !== undefined && { description }),
      },
    });
    res.json(armoire);
  } catch (err) {
    console.error('[armoires/PUT]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/armoires/:id
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.armoire.findFirst({
      where: { id: req.params.id, ...getUlFilter(req) },
    });
    if (!existing) return res.status(404).json({ error: 'Armoire introuvable' });

    await prisma.armoire.delete({ where: { id: req.params.id } });
    res.json({ message: 'Armoire supprimée' });
  } catch (err) {
    console.error('[armoires/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── TIROIRS ──────────────────────────────────────────────────────────────────

/**
 * POST /api/armoires/:armoireId/tiroirs
 * Body : { nom, description }
 */
router.post('/:armoireId/tiroirs', requireAdmin, async (req, res) => {
  const { nom, description } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis' });

  try {
    const armoire = await prisma.armoire.findFirst({
      where: { id: req.params.armoireId, ...getUlFilter(req) },
    });
    if (!armoire) return res.status(404).json({ error: 'Armoire introuvable' });

    const tiroir = await prisma.tiroir.create({
      data: { nom, description: description || null, armoire_id: req.params.armoireId },
    });
    res.status(201).json(tiroir);
  } catch (err) {
    console.error('[tiroirs/POST]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/armoires/:armoireId/tiroirs/:id
 */
router.put('/:armoireId/tiroirs/:id', requireAdmin, async (req, res) => {
  const { nom, description } = req.body;
  try {
    const tiroir = await prisma.tiroir.findFirst({
      where: { id: req.params.id, armoire_id: req.params.armoireId },
    });
    if (!tiroir) return res.status(404).json({ error: 'Tiroir introuvable' });

    const updated = await prisma.tiroir.update({
      where: { id: req.params.id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(description !== undefined && { description }),
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('[tiroirs/PUT]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/armoires/:armoireId/tiroirs/:id
 */
router.delete('/:armoireId/tiroirs/:id', requireAdmin, async (req, res) => {
  try {
    const tiroir = await prisma.tiroir.findFirst({
      where: { id: req.params.id, armoire_id: req.params.armoireId },
    });
    if (!tiroir) return res.status(404).json({ error: 'Tiroir introuvable' });

    await prisma.tiroir.delete({ where: { id: req.params.id } });
    res.json({ message: 'Tiroir supprimé' });
  } catch (err) {
    console.error('[tiroirs/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── STOCKS TIROIRS ───────────────────────────────────────────────────────────

/**
 * PUT /api/armoires/tiroirs/:tiroirId/stock/:articleId
 * Mettre à jour le stock (quantite_actuelle + lots JSON).
 * Body : { quantite_actuelle, lots }
 */
router.put('/tiroirs/:tiroirId/stock/:articleId', requireAdmin, async (req, res) => {
  const { quantite_actuelle, lots } = req.body;

  try {
    // Verify tiroir belongs to user's UL
    const tiroir = await prisma.tiroir.findFirst({
      where: { id: req.params.tiroirId },
      include: { armoire: { select: { unite_locale_id: true } } },
    });
    if (!tiroir || (req.user.role !== 'SUPER_ADMIN' && tiroir.armoire.unite_locale_id !== req.user.unite_locale_id)) {
      return res.status(404).json({ error: 'Tiroir introuvable' });
    }

    const stock = await prisma.stockTiroir.upsert({
      where: {
        article_id_tiroir_id: {
          article_id: req.params.articleId,
          tiroir_id: req.params.tiroirId,
        },
      },
      update: {
        quantite_actuelle: quantite_actuelle ?? 0,
        lots: lots ?? [],
      },
      create: {
        article_id: req.params.articleId,
        tiroir_id: req.params.tiroirId,
        unite_locale_id: tiroir.armoire.unite_locale_id,
        quantite_actuelle: quantite_actuelle ?? 0,
        lots: lots ?? [],
      },
    });

    logAction(prisma, {
      uniteLocaleId: tiroir.armoire.unite_locale_id,
      action: 'STOCK_UPDATE',
      details: `Stock tiroir mis a jour — article ${req.params.articleId}, qte: ${quantite_actuelle ?? 0}`,
      user: { prenom: req.user.prenom, login: req.user.login },
    });

    res.json(stock);
  } catch (err) {
    console.error('[stocks-tiroir/PUT]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/armoires/tiroirs/:tiroirId/stock/:articleId
 */
router.delete('/tiroirs/:tiroirId/stock/:articleId', requireAdmin, async (req, res) => {
  try {
    // Verify tiroir belongs to user's UL
    const tiroir = await prisma.tiroir.findFirst({
      where: { id: req.params.tiroirId },
      include: { armoire: { select: { unite_locale_id: true } } },
    });
    if (!tiroir || (req.user.role !== 'SUPER_ADMIN' && tiroir.armoire.unite_locale_id !== req.user.unite_locale_id)) {
      return res.status(404).json({ error: 'Tiroir introuvable' });
    }

    await prisma.stockTiroir.delete({
      where: {
        article_id_tiroir_id: {
          article_id: req.params.articleId,
          tiroir_id: req.params.tiroirId,
        },
      },
    });
    res.json({ message: 'Stock supprimé' });
  } catch (err) {
    console.error('[stocks-tiroir/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
