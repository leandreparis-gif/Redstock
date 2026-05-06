'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { getUlFilter, getUlId } = require('../utils/resolveUL');
const logAction = require('../utils/logAction');

const router = express.Router();
router.use(authMiddleware);

const INCLUDE_RELATIONS = {
  article: { select: { id: true, nom: true, categorie: true, quantite_min: true, reference_fournisseur: true, code_barre: true } },
  created_by: { select: { id: true, prenom: true, login: true } },
};

// ─── PREVISIONNEL ────────────────────────────────────────────────────────────

/**
 * GET /api/commandes/previsionnel
 * TOUS les articles dont le stock total (somme des tiroirs) est < quantite_min,
 * avec quantité suggérée et statut "commande déjà en cours".
 *
 * On ne dépend plus de la table Alerte — on calcule directement depuis les stocks
 * pour garantir l'exhaustivité (même si la génération d'alertes a été oubliée).
 */
router.get('/previsionnel', async (req, res) => {
  try {
    const ulFilter = getUlFilter(req);

    // 1. Tous les articles de l'UL
    const articles = await prisma.article.findMany({
      where: { ...ulFilter },
      select: {
        id: true,
        nom: true,
        categorie: true,
        quantite_min: true,
        reference_fournisseur: true,
        code_barre: true,
      },
    });

    if (articles.length === 0) return res.json([]);

    // 2. Agrégation des stocks tiroirs par article (1 seule requête)
    const aggs = await prisma.stockTiroir.groupBy({
      by: ['article_id'],
      where: { ...ulFilter },
      _sum: { quantite_actuelle: true },
    });
    const stockByArticle = Object.fromEntries(
      aggs.map((a) => [a.article_id, a._sum.quantite_actuelle || 0])
    );

    // 3. Commandes en cours (1 seule requête)
    const commandesEnCours = await prisma.commande.findMany({
      where: { ...ulFilter, statut: 'EN_ATTENTE' },
      select: { article_id: true },
    });
    const enCoursSet = new Set(commandesEnCours.map((c) => c.article_id));

    // 4. Filtrer + composer la réponse — uniquement ceux sous le minimum
    const items = articles
      .map((a) => {
        const stockActuel = stockByArticle[a.id] || 0;
        return {
          article_id: a.id,
          article_nom: a.nom,
          categorie: a.categorie,
          reference_fournisseur: a.reference_fournisseur || null,
          code_barre: a.code_barre || null,
          stock_actuel: stockActuel,
          stock_minimum: a.quantite_min,
          manquant: Math.max(a.quantite_min - stockActuel, 0),
          quantite_suggeree: Math.max(a.quantite_min - stockActuel, 1),
          commande_existante: enCoursSet.has(a.id),
        };
      })
      .filter((i) => i.stock_actuel < i.stock_minimum)
      .sort((a, b) => {
        // Manquants d'abord (plus gros écart en premier), puis nom
        if (b.manquant !== a.manquant) return b.manquant - a.manquant;
        return a.article_nom.localeCompare(b.article_nom);
      });

    res.json(items);
  } catch (err) {
    console.error('[commandes/previsionnel]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── COMMANDES REELLES ───────────────────────────────────────────────────────

/**
 * GET /api/commandes
 * Liste des commandes avec filtre statut et pagination.
 */
router.get('/', async (req, res) => {
  const statut = req.query.statut || undefined;
  const page   = Math.max(parseInt(req.query.page)  || 1, 1);
  const limit  = Math.min(parseInt(req.query.limit) || 50, 200);

  try {
    const where = {
      ...getUlFilter(req),
      ...(statut ? { statut } : {}),
    };

    const [commandes, total, enAttente, recuesMois] = await Promise.all([
      prisma.commande.findMany({
        where,
        include: INCLUDE_RELATIONS,
        orderBy: { date_creation: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.commande.count({ where }),
      prisma.commande.count({ where: { ...getUlFilter(req), statut: 'EN_ATTENTE' } }),
      prisma.commande.count({
        where: {
          ...getUlFilter(req),
          statut: 'RECUE',
          date_reception: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);

    res.json({
      commandes, total, page, limit,
      summary: { enAttente, recuesMois },
    });
  } catch (err) {
    console.error('[commandes/GET]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/commandes
 * Creer une commande (statut EN_ATTENTE).
 */
router.post('/', async (req, res) => {
  const { article_id, quantite_demandee, remarques } = req.body;
  if (!article_id || !quantite_demandee || quantite_demandee < 1) {
    return res.status(400).json({ error: 'Article et quantite requis' });
  }

  const ulId = getUlId(req);
  if (!ulId) return res.status(400).json({ error: 'Unite locale non definie' });

  try {
    const article = await prisma.article.findFirst({
      where: { id: article_id, ...getUlFilter(req) },
    });
    if (!article) return res.status(404).json({ error: 'Article introuvable' });

    const commande = await prisma.commande.create({
      data: {
        article_id,
        quantite_demandee,
        remarques: remarques || null,
        statut: 'EN_ATTENTE',
        created_by_id: req.user.id,
        unite_locale_id: ulId,
      },
      include: INCLUDE_RELATIONS,
    });

    logAction(prisma, {
      uniteLocaleId: ulId,
      action: 'COMMANDE_CREATE',
      details: `Commande creee : ${quantite_demandee}x "${article.nom}"`,
      user: { prenom: req.user.prenom, login: req.user.login },
    });

    res.status(201).json(commande);
  } catch (err) {
    console.error('[commandes/POST]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/commandes/from-previsionnel
 * Creer des commandes en masse depuis le previsionnel.
 * Body : [{ article_id, quantite_demandee }]
 */
router.post('/from-previsionnel', async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Liste d\'articles requise' });
  }

  const ulId = getUlId(req);
  if (!ulId) return res.status(400).json({ error: 'Unite locale non definie' });

  try {
    const created = [];
    for (const item of items) {
      if (!item.article_id || !item.quantite_demandee || item.quantite_demandee < 1) continue;

      // Verifier pas de doublon
      const existing = await prisma.commande.findFirst({
        where: { article_id: item.article_id, unite_locale_id: ulId, statut: 'EN_ATTENTE' },
      });
      if (existing) continue;

      const commande = await prisma.commande.create({
        data: {
          article_id: item.article_id,
          quantite_demandee: item.quantite_demandee,
          remarques: 'Depuis previsionnel',
          statut: 'EN_ATTENTE',
          created_by_id: req.user.id,
          unite_locale_id: ulId,
        },
        include: INCLUDE_RELATIONS,
      });
      created.push(commande);
    }

    logAction(prisma, {
      uniteLocaleId: ulId,
      action: 'COMMANDE_CREATE',
      details: `${created.length} commande(s) creee(s) depuis previsionnel`,
      user: { prenom: req.user.prenom, login: req.user.login },
    });

    res.status(201).json({ created: created.length, commandes: created });
  } catch (err) {
    console.error('[commandes/from-previsionnel]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/commandes/:id/recevoir
 * EN_ATTENTE -> RECUE (pas de mise a jour auto du stock).
 */
router.patch('/:id/recevoir', async (req, res) => {
  try {
    const existing = await prisma.commande.findFirst({
      where: { id: req.params.id, ...getUlFilter(req) },
      include: { article: true },
    });
    if (!existing) return res.status(404).json({ error: 'Commande introuvable' });
    if (existing.statut !== 'EN_ATTENTE') {
      return res.status(409).json({ error: 'Seules les commandes en attente peuvent etre recues' });
    }

    const commande = await prisma.commande.update({
      where: { id: req.params.id },
      data: { statut: 'RECUE', date_reception: new Date() },
      include: INCLUDE_RELATIONS,
    });

    logAction(prisma, {
      uniteLocaleId: existing.unite_locale_id,
      action: 'COMMANDE_RECEVOIR',
      details: `Commande recue : ${existing.quantite_demandee}x "${existing.article.nom}"`,
      user: { prenom: req.user.prenom, login: req.user.login },
    });

    res.json(commande);
  } catch (err) {
    console.error('[commandes/recevoir]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/commandes/:id/annuler
 * Annuler une commande EN_ATTENTE.
 */
router.patch('/:id/annuler', async (req, res) => {
  try {
    const existing = await prisma.commande.findFirst({
      where: { id: req.params.id, ...getUlFilter(req) },
    });
    if (!existing) return res.status(404).json({ error: 'Commande introuvable' });
    if (existing.statut !== 'EN_ATTENTE') {
      return res.status(409).json({ error: 'Seules les commandes en attente peuvent etre annulees' });
    }

    const commande = await prisma.commande.update({
      where: { id: req.params.id },
      data: { statut: 'ANNULEE' },
      include: INCLUDE_RELATIONS,
    });

    logAction(prisma, {
      uniteLocaleId: existing.unite_locale_id,
      action: 'COMMANDE_ANNULER',
      details: `Commande annulee : article ${existing.article_id}`,
      user: { prenom: req.user.prenom, login: req.user.login },
    });

    res.json(commande);
  } catch (err) {
    console.error('[commandes/annuler]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
