'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const { z } = require('zod');

const { getUlFilter, getUlId } = require('../utils/resolveUL');

const router = express.Router();

// ─── Schemas de validation (C4) ──────────────────────────────────────────────

const lotSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(100),
  couleur: z.string().max(20).nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
});

const pochetteSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(100),
  couleur: z.string().max(20).nullable().optional(),
});

const stockSchema = z.object({
  quantite_actuelle: z.number().int().min(0).default(0),
  quantite_minimum: z.number().int().min(0).default(0),
  lots: z.array(z.object({
    label: z.string().max(100).optional().default(''),
    date_peremption: z.string().nullable().optional(),
    quantite: z.number().int().min(0).default(0),
  })).default([]),
});

const minimumSchema = z.object({
  quantite_minimum: z.number({ coerce: true }).int().min(0),
});

/** Helper pour verifier que la pochette appartient a l'UL de l'utilisateur */
function checkPochetteAccess(req, pochette) {
  // S3 fix: parentheses explicites
  return pochette && (req.user.role === 'SUPER_ADMIN' || pochette.lot.unite_locale_id === req.user.unite_locale_id);
}

// ─── ROUTES PUBLIQUES (pas de JWT) ────────────────────────────────────────────

/**
 * GET /api/lots/public/:token
 * Recupere les infos d'un lot via son QR token — sans authentification.
 */
router.get('/public/:token', async (req, res) => {
  try {
    // S4: validation basique du format token UUID
    const token = req.params.token;
    if (!/^[0-9a-f-]{36}$/i.test(token)) {
      return res.status(400).json({ error: 'Token invalide' });
    }

    const lot = await prisma.lot.findUnique({
      where: { qr_code_token: token },
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

// ─── ROUTES PROTEGEES ─────────────────────────────────────────────────────────
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

// BE4: endpoint GET /:id/qrcode supprime — dead code, le QR est genere cote client

/**
 * POST /api/lots
 * Body : { nom, couleur? }
 */
router.post('/', requireAdmin, async (req, res) => {
  const parsed = lotSchema.pick({ nom: true, couleur: true }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  try {
    const lot = await prisma.lot.create({
      data: { nom: parsed.data.nom, couleur: parsed.data.couleur || null, unite_locale_id: getUlId(req) },
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
  const parsed = lotSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  try {
    const existing = await prisma.lot.findFirst({
      where: { id: req.params.id, ...getUlFilter(req) },
    });
    if (!existing) return res.status(404).json({ error: 'Lot introuvable' });

    const { nom, photo_url, couleur } = parsed.data;
    const lot = await prisma.lot.update({
      where: { id: req.params.id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(photo_url !== undefined && { photo_url }),
        ...(couleur !== undefined && { couleur: couleur || null }),
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
    res.json({ message: 'Lot supprime' });
  } catch (err) {
    console.error('[lots/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POCHETTES ────────────────────────────────────────────────────────────────

/**
 * POST /api/lots/:lotId/pochettes
 * Body : { nom, couleur? }
 */
router.post('/:lotId/pochettes', requireAdmin, async (req, res) => {
  const parsed = pochetteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  try {
    const lot = await prisma.lot.findFirst({
      where: { id: req.params.lotId, ...getUlFilter(req) },
    });
    if (!lot) return res.status(404).json({ error: 'Lot introuvable' });

    const pochette = await prisma.pochette.create({
      data: { nom: parsed.data.nom, couleur: parsed.data.couleur || null, lot_id: req.params.lotId },
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
  const parsed = pochetteSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  try {
    const pochette = await prisma.pochette.findFirst({
      where: { id: req.params.id, lot_id: req.params.lotId },
    });
    if (!pochette) return res.status(404).json({ error: 'Pochette introuvable' });

    const { nom, couleur } = parsed.data;
    const updated = await prisma.pochette.update({
      where: { id: req.params.id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(couleur !== undefined && { couleur: couleur || null }),
      },
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
    res.json({ message: 'Pochette supprimee' });
  } catch (err) {
    console.error('[pochettes/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── STOCKS POCHETTES ─────────────────────────────────────────────────────────

/**
 * PUT /api/lots/pochettes/:pochetteId/stock/:articleId
 * Body : { quantite_actuelle, quantite_minimum, lots }
 */
router.put('/pochettes/:pochetteId/stock/:articleId', requireAdmin, async (req, res) => {
  const parsed = stockSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { quantite_actuelle, quantite_minimum, lots } = parsed.data;

  try {
    const pochette = await prisma.pochette.findFirst({
      where: { id: req.params.pochetteId },
      include: { lot: { select: { unite_locale_id: true } } },
    });
    if (!checkPochetteAccess(req, pochette)) {
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
        quantite_actuelle,
        quantite_minimum,
        lots,
      },
      create: {
        article_id: req.params.articleId,
        pochette_id: req.params.pochetteId,
        unite_locale_id: pochette.lot.unite_locale_id,
        quantite_actuelle,
        quantite_minimum,
        lots,
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
 * Met a jour uniquement le minimum requis.
 * Body : { quantite_minimum }
 */
router.patch('/pochettes/:pochetteId/stock/:articleId/minimum', requireAdmin, async (req, res) => {
  const parsed = minimumSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  try {
    const pochette = await prisma.pochette.findFirst({
      where: { id: req.params.pochetteId },
      include: { lot: { select: { unite_locale_id: true } } },
    });
    if (!checkPochetteAccess(req, pochette)) {
      return res.status(404).json({ error: 'Pochette introuvable' });
    }

    const stock = await prisma.stockPochette.update({
      where: {
        article_id_pochette_id: {
          article_id: req.params.articleId,
          pochette_id: req.params.pochetteId,
        },
      },
      data: { quantite_minimum: parsed.data.quantite_minimum },
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
    const pochette = await prisma.pochette.findFirst({
      where: { id: req.params.pochetteId },
      include: { lot: { select: { unite_locale_id: true } } },
    });
    if (!checkPochetteAccess(req, pochette)) {
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
    res.json({ message: 'Stock supprime' });
  } catch (err) {
    console.error('[stocks-pochette/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
