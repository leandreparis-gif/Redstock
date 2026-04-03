'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const router = express.Router();

router.use(authMiddleware);

/**
 * GET /api/articles
 * Catalogue complet des articles de l'UL.
 */
router.get('/', async (req, res) => {
  try {
    const articles = await prisma.article.findMany({
      where: { unite_locale_id: req.user.unite_locale_id },
      orderBy: [{ categorie: 'asc' }, { nom: 'asc' }],
    });
    res.json(articles);
  } catch (err) {
    console.error('[articles/GET]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/articles
 * Body : { nom, description, quantite_min, categorie, est_perimable }
 */
router.post('/', requireAdmin, async (req, res) => {
  const { nom, description, quantite_min, categorie, est_perimable } = req.body;
  if (!nom || !categorie) return res.status(400).json({ error: 'Nom et catégorie requis' });

  try {
    const article = await prisma.article.create({
      data: {
        nom,
        description: description || null,
        quantite_min: quantite_min ?? 1,
        categorie,
        est_perimable: est_perimable ?? false,
        unite_locale_id: req.user.unite_locale_id,
      },
    });
    res.status(201).json(article);
  } catch (err) {
    console.error('[articles/POST]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/articles/:id
 */
router.put('/:id', requireAdmin, async (req, res) => {
  const { nom, description, quantite_min, categorie, est_perimable } = req.body;

  try {
    const existing = await prisma.article.findFirst({
      where: { id: req.params.id, unite_locale_id: req.user.unite_locale_id },
    });
    if (!existing) return res.status(404).json({ error: 'Article introuvable' });

    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(description !== undefined && { description }),
        ...(quantite_min !== undefined && { quantite_min }),
        ...(categorie !== undefined && { categorie }),
        ...(est_perimable !== undefined && { est_perimable }),
      },
    });
    res.json(article);
  } catch (err) {
    console.error('[articles/PUT]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/articles/:id
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.article.findFirst({
      where: { id: req.params.id, unite_locale_id: req.user.unite_locale_id },
    });
    if (!existing) return res.status(404).json({ error: 'Article introuvable' });

    await prisma.article.delete({ where: { id: req.params.id } });
    res.json({ message: 'Article supprimé' });
  } catch (err) {
    if (err.code === 'P2003') {
      return res.status(409).json({ error: 'Impossible de supprimer : article utilisé dans des stocks' });
    }
    console.error('[articles/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
