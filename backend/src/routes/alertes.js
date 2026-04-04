'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const { getUlFilter } = require('../utils/resolveUL');

const router = express.Router();

router.use(authMiddleware);

/**
 * GET /api/alertes
 * Retourne toutes les alertes de l'UL, triées par urgence.
 * Query : ?statut=ACTIVE|RESOLUE (défaut : ACTIVE)
 */
router.get('/', async (req, res) => {
  const statut = req.query.statut || 'ACTIVE';

  try {
    const alertes = await prisma.alerte.findMany({
      where: {
        ...getUlFilter(req),
        statut,
      },
      include: {
        article: { select: { id: true, nom: true, categorie: true } },
      },
      orderBy: [
        { date_echeance: 'asc' },
        { created_at: 'desc' },
      ],
    });

    res.json(alertes);
  } catch (err) {
    console.error('[alertes/GET]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/alertes/:id/resoudre
 * Marquer une alerte comme résolue (ADMIN uniquement).
 */
router.patch('/:id/resoudre', requireAdmin, async (req, res) => {
  try {
    const alerte = await prisma.alerte.findFirst({
      where: { id: req.params.id, ...getUlFilter(req) },
    });
    if (!alerte) return res.status(404).json({ error: 'Alerte introuvable' });

    const updated = await prisma.alerte.update({
      where: { id: req.params.id },
      data: { statut: 'RESOLUE' },
    });

    res.json(updated);
  } catch (err) {
    console.error('[alertes/PATCH/resoudre]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/alertes/count
 * Retourne le nombre d'alertes actives (pour badges dashboard).
 */
router.get('/count', async (req, res) => {
  try {
    const [peremption, stockBas] = await Promise.all([
      prisma.alerte.count({
        where: { ...getUlFilter(req), statut: 'ACTIVE', type: 'PEREMPTION' },
      }),
      prisma.alerte.count({
        where: { ...getUlFilter(req), statut: 'ACTIVE', type: 'STOCK_BAS' },
      }),
    ]);

    res.json({ peremption, stockBas, total: peremption + stockBas });
  } catch (err) {
    console.error('[alertes/count]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
