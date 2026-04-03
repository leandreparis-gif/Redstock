'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

/**
 * GET /api/search?q=masque
 * Recherche globale : articles, lots, uniformes.
 * Retourne max 5 résultats par catégorie.
 */
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ articles: [], lots: [], uniformes: [] });

  const ulId = req.user.unite_locale_id;
  const contains = (val) => ({ contains: val, mode: 'insensitive' });

  try {
    const [articles, lots, uniformes] = await Promise.all([

      // ── Articles (nom + catégorie) ──────────────────────────────────────────
      prisma.article.findMany({
        where: {
          unite_locale_id: ulId,
          OR: [{ nom: contains(q) }, { categorie: contains(q) }],
        },
        select: { id: true, nom: true, categorie: true },
        take: 5,
      }),

      // ── Lots (nom) ─────────────────────────────────────────────────────────
      prisma.lot.findMany({
        where: {
          unite_locale_id: ulId,
          nom: contains(q),
        },
        select: { id: true, nom: true },
        take: 5,
      }),

      // ── Uniformes (type ou bénéficiaire actuel) ────────────────────────────
      prisma.uniforme.findMany({
        where: {
          unite_locale_id: ulId,
          OR: [
            { nom: contains(q) },
            {
              mouvements: {
                some: {
                  date_retour_effective: null,
                  beneficiaire_prenom: contains(q),
                },
              },
            },
          ],
        },
        select: {
          id: true,
          nom: true,
          taille: true,
          statut: true,
          mouvements: {
            where: { date_retour_effective: null },
            select: { beneficiaire_prenom: true },
            orderBy: { date_mouvement: 'desc' },
            take: 1,
          },
        },
        take: 5,
      }),

    ]);

    res.json({ articles, lots, uniformes });
  } catch (err) {
    console.error('[search/GET]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
