'use strict';

const express = require('express');
const QRCode = require('qrcode');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const { getUlFilter, getUlId } = require('../utils/resolveUL');

const router = express.Router();

// ─── ROUTES PUBLIQUES (pas de JWT) ────────────────────────────────────────────

/**
 * GET /api/lots/public/:token
 * Récupère les infos d'un lot via son QR token — sans authentification.
 * Utilisé par la page mobile /controle/lot/:token
 */
router.get('/public/:token', async (req, res) => {
  try {
    const lot = await prisma.lot.findUnique({
      where: { qr_code_token: req.params.token },
      include: {
        unite_locale: {
          select: { nom: true, telephone: true, email: true, adresse: true },
        },
        pochettes: {
          include: {
            stocks: {
              include: { article: true },
            },
          },
          orderBy: { nom: 'asc' },
        },
      },
    });

    if (!lot) return res.status(404).json({ error: 'Lot introuvable' });
    res.json(lot);
  } catch (err) {
    console.error('[lots/public/:token]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── ROUTES PROTÉGÉES ─────────────────────────────────────────────────────────
router.use(authMiddleware);

/**
 * GET /api/lots
 * Vue arborescence : Lot > Pochettes > Stocks.
 */
router.get('/', async (req, res) => {
  try {
    const lots = await prisma.lot.findMany({
      where: { ...getUlFilter(req) },
      include: {
        pochettes: {
          include: {
            stocks: {
              include: { article: true },
            },
          },
          orderBy: { nom: 'asc' },
        },
      },
      orderBy: { nom: 'asc' },
    });
    res.json(lots);
  } catch (err) {
    console.error('[lots/GET]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/lots/:id/qrcode
 * Génère le QR code en base64 PNG pour l'impression.
 */
router.get('/:id/qrcode', async (req, res) => {
  try {
    const lot = await prisma.lot.findFirst({
      where: { id: req.params.id, ...getUlFilter(req) },
    });
    if (!lot) return res.status(404).json({ error: 'Lot introuvable' });

    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:5173';
    const qrUrl = `${publicUrl}/controle/lot/${lot.qr_code_token}`;

    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    res.json({ qr_data_url: qrDataUrl, url: qrUrl, lot_nom: lot.nom });
  } catch (err) {
    console.error('[lots/qrcode]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/lots
 * Body : { nom }
 */
router.post('/', requireAdmin, async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis' });

  try {
    const lot = await prisma.lot.create({
      data: { nom, unite_locale_id: getUlId(req) },
    });
    res.status(201).json(lot);
  } catch (err) {
    console.error('[lots/POST]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/lots/:id
 */
router.put('/:id', requireAdmin, async (req, res) => {
  const { nom, photo_url } = req.body;
  try {
    const existing = await prisma.lot.findFirst({
      where: { id: req.params.id, ...getUlFilter(req) },
    });
    if (!existing) return res.status(404).json({ error: 'Lot introuvable' });

    const lot = await prisma.lot.update({
      where: { id: req.params.id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(photo_url !== undefined && { photo_url }),
      },
    });
    res.json(lot);
  } catch (err) {
    console.error('[lots/PUT]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/lots/:id
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.lot.findFirst({
      where: { id: req.params.id, ...getUlFilter(req) },
    });
    if (!existing) return res.status(404).json({ error: 'Lot introuvable' });

    await prisma.lot.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lot supprimé' });
  } catch (err) {
    console.error('[lots/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POCHETTES ────────────────────────────────────────────────────────────────

/**
 * POST /api/lots/:lotId/pochettes
 * Body : { nom }
 */
router.post('/:lotId/pochettes', requireAdmin, async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis' });

  try {
    const lot = await prisma.lot.findFirst({
      where: { id: req.params.lotId, ...getUlFilter(req) },
    });
    if (!lot) return res.status(404).json({ error: 'Lot introuvable' });

    const pochette = await prisma.pochette.create({
      data: { nom, lot_id: req.params.lotId },
    });
    res.status(201).json(pochette);
  } catch (err) {
    console.error('[pochettes/POST]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/lots/:lotId/pochettes/:id
 */
router.put('/:lotId/pochettes/:id', requireAdmin, async (req, res) => {
  const { nom } = req.body;
  try {
    const pochette = await prisma.pochette.findFirst({
      where: { id: req.params.id, lot_id: req.params.lotId },
    });
    if (!pochette) return res.status(404).json({ error: 'Pochette introuvable' });

    const updated = await prisma.pochette.update({
      where: { id: req.params.id },
      data: { ...(nom !== undefined && { nom }) },
    });
    res.json(updated);
  } catch (err) {
    console.error('[pochettes/PUT]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/lots/:lotId/pochettes/:id
 */
router.delete('/:lotId/pochettes/:id', requireAdmin, async (req, res) => {
  try {
    const pochette = await prisma.pochette.findFirst({
      where: { id: req.params.id, lot_id: req.params.lotId },
    });
    if (!pochette) return res.status(404).json({ error: 'Pochette introuvable' });

    await prisma.pochette.delete({ where: { id: req.params.id } });
    res.json({ message: 'Pochette supprimée' });
  } catch (err) {
    console.error('[pochettes/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── STOCKS POCHETTES ─────────────────────────────────────────────────────────

/**
 * PUT /api/lots/pochettes/:pochetteId/stock/:articleId
 * Body : { quantite_actuelle, lots }
 */
router.put('/pochettes/:pochetteId/stock/:articleId', requireAdmin, async (req, res) => {
  const { quantite_actuelle, quantite_minimum, lots } = req.body;

  try {
    // Verify pochette belongs to user's UL
    const pochette = await prisma.pochette.findFirst({
      where: { id: req.params.pochetteId },
      include: { lot: { select: { unite_locale_id: true } } },
    });
    if (!pochette || req.user.role !== 'SUPER_ADMIN' && pochette.lot.unite_locale_id !== req.user.unite_locale_id) {
      return res.status(404).json({ error: 'Pochette introuvable' });
    }

    const stock = await prisma.stockPochette.upsert({
      where: {
        article_id_pochette_id: {
          article_id: req.params.articleId,
          pochette_id: req.params.pochetteId,
        },
      },
      update: {
        quantite_actuelle: quantite_actuelle ?? 0,
        quantite_minimum: quantite_minimum ?? 0,
        lots: lots ?? [],
      },
      create: {
        article_id: req.params.articleId,
        pochette_id: req.params.pochetteId,
        unite_locale_id: pochette.lot.unite_locale_id,
        quantite_actuelle: quantite_actuelle ?? 0,
        quantite_minimum: quantite_minimum ?? 0,
        lots: lots ?? [],
      },
    });
    res.json(stock);
  } catch (err) {
    console.error('[stocks-pochette/PUT]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/lots/pochettes/:pochetteId/stock/:articleId/minimum
 * Met à jour uniquement le minimum requis.
 * Body : { quantite_minimum }
 */
router.patch('/pochettes/:pochetteId/stock/:articleId/minimum', requireAdmin, async (req, res) => {
  const { quantite_minimum } = req.body;
  if (quantite_minimum === undefined) return res.status(400).json({ error: 'quantite_minimum requis' });

  try {
    // Verify pochette belongs to user's UL
    const pochette = await prisma.pochette.findFirst({
      where: { id: req.params.pochetteId },
      include: { lot: { select: { unite_locale_id: true } } },
    });
    if (!pochette || req.user.role !== 'SUPER_ADMIN' && pochette.lot.unite_locale_id !== req.user.unite_locale_id) {
      return res.status(404).json({ error: 'Pochette introuvable' });
    }

    const stock = await prisma.stockPochette.update({
      where: {
        article_id_pochette_id: {
          article_id: req.params.articleId,
          pochette_id: req.params.pochetteId,
        },
      },
      data: { quantite_minimum: parseInt(quantite_minimum) || 0 },
    });
    res.json(stock);
  } catch (err) {
    console.error('[stocks-pochette/minimum]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/lots/pochettes/:pochetteId/stock/:articleId
 * Supprime un stock d'une pochette.
 */
router.delete('/pochettes/:pochetteId/stock/:articleId', requireAdmin, async (req, res) => {
  try {
    // Verify pochette belongs to user's UL
    const pochette = await prisma.pochette.findFirst({
      where: { id: req.params.pochetteId },
      include: { lot: { select: { unite_locale_id: true } } },
    });
    if (!pochette || req.user.role !== 'SUPER_ADMIN' && pochette.lot.unite_locale_id !== req.user.unite_locale_id) {
      return res.status(404).json({ error: 'Pochette introuvable' });
    }

    await prisma.stockPochette.delete({
      where: {
        article_id_pochette_id: {
          article_id: req.params.articleId,
          pochette_id: req.params.pochetteId,
        },
      },
    });
    res.json({ message: 'Stock supprimé' });
  } catch (err) {
    console.error('[stocks-pochette/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
