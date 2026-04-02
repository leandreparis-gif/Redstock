'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const router = express.Router();
const prisma = new PrismaClient();

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
        unite_locale_id: req.user.unite_locale_id,
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
      where: { id: req.params.id, unite_locale_id: req.user.unite_locale_id },
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
        where: { unite_locale_id: req.user.unite_locale_id, statut: 'ACTIVE', type: 'PEREMPTION' },
      }),
      prisma.alerte.count({
        where: { unite_locale_id: req.user.unite_locale_id, statut: 'ACTIVE', type: 'STOCK_BAS' },
      }),
    ]);

    res.json({ peremption, stockBas, total: peremption + stockBas });
  } catch (err) {
    console.error('[alertes/count]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
