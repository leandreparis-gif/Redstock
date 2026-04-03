'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const router = express.Router();

router.use(authMiddleware);

/**
 * Genere un code EAN-13 interne unique (prefixe 200 = usage interne).
 * Format : 200 + 9 chiffres aleatoires + 1 chiffre de controle.
 */
function generateEAN13() {
  const digits = [2, 0, 0];
  for (let i = 0; i < 9; i++) digits.push(Math.floor(Math.random() * 10));
  // Calcul du chiffre de controle EAN-13
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  digits.push((10 - (sum % 10)) % 10);
  return digits.join('');
}

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
 * GET /api/articles/barcode/:code
 * Recherche un article par code-barres + ses stocks (tiroirs et pochettes).
 */
router.get('/barcode/:code', async (req, res) => {
  try {
    const article = await prisma.article.findFirst({
      where: {
        code_barre: req.params.code,
        unite_locale_id: req.user.unite_locale_id,
      },
    });
    if (!article) return res.status(404).json({ error: 'Article non trouvé' });

    const [stockTiroirs, stockPochettes] = await Promise.all([
      prisma.stockTiroir.findMany({
        where: { article_id: article.id, unite_locale_id: req.user.unite_locale_id },
        include: { tiroir: { include: { armoire: true } } },
      }),
      prisma.stockPochette.findMany({
        where: { article_id: article.id, unite_locale_id: req.user.unite_locale_id },
        include: { pochette: { include: { lot: true } } },
      }),
    ]);

    res.json({ article, stockTiroirs, stockPochettes });
  } catch (err) {
    console.error('[articles/barcode]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/articles
 * Body : { nom, description, quantite_min, categorie, est_perimable, code_barre }
 */
router.post('/', requireAdmin, async (req, res) => {
  const { nom, description, quantite_min, categorie, est_perimable, code_barre } = req.body;
  if (!nom || !categorie) return res.status(400).json({ error: 'Nom et catégorie requis' });

  try {
    // Generer un EAN-13 automatiquement si pas de code fourni
    let finalCode = code_barre || null;
    if (!finalCode) {
      // Tenter jusqu'a 5 fois en cas de collision (improbable)
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateEAN13();
        const exists = await prisma.article.findFirst({ where: { code_barre: candidate } });
        if (!exists) { finalCode = candidate; break; }
      }
    }

    const article = await prisma.article.create({
      data: {
        nom,
        description: description || null,
        code_barre: finalCode,
        quantite_min: quantite_min ?? 1,
        categorie,
        est_perimable: est_perimable ?? false,
        unite_locale_id: req.user.unite_locale_id,
      },
    });
    res.status(201).json(article);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ce code-barres est déjà utilisé' });
    }
    console.error('[articles/POST]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/articles/:id
 */
router.put('/:id', requireAdmin, async (req, res) => {
  const { nom, description, quantite_min, categorie, est_perimable, code_barre } = req.body;

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
        ...(code_barre !== undefined && { code_barre: code_barre || null }),
      },
    });
    res.json(article);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ce code-barres est déjà utilisé' });
    }
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
