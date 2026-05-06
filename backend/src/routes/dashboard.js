'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { getUlFilter } = require('../utils/resolveUL');

const router = express.Router();
router.use(authMiddleware);

// ── Cache en mémoire (TTL 30s) ──────────────────────────────────────────────
const CACHE_TTL = 30_000;
const cacheStore = new Map();

function getCacheKey(req) {
  const ulFilter = getUlFilter(req);
  return `dashboard_${ulFilter.unite_locale_id || 'all'}`;
}

function getCache(key) {
  const entry = cacheStore.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL) return entry.data;
  cacheStore.delete(key);
  return null;
}

function setCache(key, data) {
  cacheStore.set(key, { data, time: Date.now() });
}

// ── Calcul du prochain contrôle dû ──────────────────────────────────────────
function computeNextDue(dernier, valeur, unite) {
  if (!dernier) return new Date(0);
  const d = new Date(dernier);
  switch (unite) {
    case 'JOURS':    d.setDate(d.getDate() + valeur); break;
    case 'SEMAINES': d.setDate(d.getDate() + valeur * 7); break;
    case 'MOIS':     d.setMonth(d.getMonth() + valeur); break;
  }
  return d;
}

/**
 * GET /api/dashboard/stats
 * Données agrégées — pharmacie (armoires) uniquement.
 * Query: ?limit=8&offset=0 (pour pagination activité récente)
 */
router.get('/stats', async (req, res) => {
  const ulFilter = getUlFilter(req);
  const logLimit = Math.min(parseInt(req.query.limit) || 8, 50);
  const logOffset = Math.max(parseInt(req.query.offset) || 0, 0);
  const now = new Date();

  // Cache (hors pagination)
  const cacheKey = getCacheKey(req);
  if (logOffset === 0) {
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
  }

  try {
    // Calcul de la date limite pour les contrôles (30 derniers jours)
    const date30j = new Date(now);
    date30j.setDate(date30j.getDate() - 30);

    // ── Requêtes en parallèle (pharmacie uniquement) ──────────────────────
    // Tout est fait en 1 seul Promise.all pour minimiser la latence cumulee.
    // Plus de boucle N+1 sur les tiroirs.
    const [
      alertesActives,
      countPeremption,
      countStockBas,
      controles,
      controlesTousTiroirs,
      stocksTiroir,
      articles,
      logs,
      totalLogs,
      plannings,
      armoiresAvecTiroirs,
    ] = await Promise.all([
      prisma.alerte.count({ where: { ...ulFilter, statut: 'ACTIVE' } }),
      prisma.alerte.count({ where: { ...ulFilter, statut: 'ACTIVE', type: 'PEREMPTION' } }),
      prisma.alerte.count({ where: { ...ulFilter, statut: 'ACTIVE', type: 'STOCK_BAS' } }),
      // Contrôles des 30 derniers jours (tendance conformité)
      prisma.controle.findMany({
        where: { ...ulFilter, type: 'TIROIR', date_controle: { gte: date30j } },
        select: { date_controle: true, statut: true },
        orderBy: { date_controle: 'desc' },
      }),
      // TOUS les contrôles tiroirs (recents en premier) — pour calculer
      // le dernier contrôle par tiroir en 1 seule requête au lieu de N+1.
      prisma.controle.findMany({
        where: { ...ulFilter, type: 'TIROIR' },
        select: { reference_id: true, date_controle: true, statut: true },
        orderBy: { date_controle: 'desc' },
      }),
      // Stocks tiroirs (pharmacie)
      prisma.stockTiroir.findMany({
        where: { ...ulFilter },
        select: {
          quantite_actuelle: true,
          lots: true,
          article_id: true,
          article: { select: { nom: true, categorie: true, est_perimable: true, quantite_min: true } },
          tiroir: {
            select: { id: true, nom: true, armoire: { select: { nom: true } } },
          },
        },
      }),
      // Articles
      prisma.article.findMany({
        where: { ...ulFilter },
        select: { categorie: true, quantite_min: true },
      }),
      // Logs récents
      prisma.log.findMany({
        where: { ...ulFilter },
        orderBy: { created_at: 'desc' },
        take: logLimit,
        skip: logOffset,
        select: { action: true, details: true, user_prenom: true, user_login: true, created_at: true },
      }),
      // Total logs
      prisma.log.count({ where: { ...ulFilter } }),
      // Plannings contrôle actifs
      prisma.planningControle.findMany({
        where: { ...ulFilter, actif: true },
        select: { type_cible: true, periodicite_valeur: true, periodicite_unite: true },
      }),
      // Armoires + tiroirs (pour prochains contrôles)
      prisma.armoire.findMany({
        where: { ...ulFilter },
        select: { nom: true, tiroirs: { select: { id: true, nom: true } } },
      }),
    ]);

    const totalControles = controles.length;
    const conforme = controles.filter(c => c.statut === 'CONFORME').length;
    const tauxConformite = totalControles > 0
      ? Math.round((conforme / totalControles) * 100)
      : 100;

    const kpis = {
      alertesActives,
      peremptions: countPeremption,
      stocksBas: countStockBas,
      tauxConformite,
      totalControles,
    };

    // ── Péremption timeline (pharmacie uniquement) ──────────────────────────
    const allLots = [];
    for (const st of stocksTiroir) {
      if (!st.article.est_perimable) continue;
      const lots = Array.isArray(st.lots) ? st.lots : [];
      for (const lot of lots) {
        if (lot.date_peremption) {
          allLots.push({ date: new Date(lot.date_peremption) });
        }
      }
    }

    const d7 = new Date(now); d7.setDate(d7.getDate() + 7);
    const d30 = new Date(now); d30.setDate(d30.getDate() + 30);
    const d60 = new Date(now); d60.setDate(d60.getDate() + 60);
    const d90 = new Date(now); d90.setDate(d90.getDate() + 90);

    const futureLots = allLots.filter(l => l.date >= now);
    const peremptionTimeline = [
      { periode: '< 7j', count: futureLots.filter(l => l.date < d7).length },
      { periode: '7-30j', count: futureLots.filter(l => l.date >= d7 && l.date < d30).length },
      { periode: '30-60j', count: futureLots.filter(l => l.date >= d30 && l.date < d60).length },
      { periode: '60-90j', count: futureLots.filter(l => l.date >= d60 && l.date < d90).length },
    ];

    // ── Tendance conformité (par jour, 10 derniers jours) ───────────────────
    const controlesByDay = {};
    for (const c of controles) {
      const day = c.date_controle.toISOString().slice(0, 10);
      if (!controlesByDay[day]) controlesByDay[day] = { conforme: 0, total: 0 };
      controlesByDay[day].total++;
      if (c.statut === 'CONFORME') controlesByDay[day].conforme++;
    }
    const controlesTendance = Object.entries(controlesByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([date, v]) => ({
        date,
        taux: Math.round((v.conforme / v.total) * 100),
        total: v.total,
      }));

    // ── Stock par catégorie (pharmacie uniquement) ──────────────────────────
    const catMap = {};
    for (const art of articles) {
      if (!catMap[art.categorie]) catMap[art.categorie] = { total: 0, minimum: 0 };
      catMap[art.categorie].minimum += art.quantite_min;
    }
    for (const st of stocksTiroir) {
      const cat = st.article.categorie;
      if (!catMap[cat]) catMap[cat] = { total: 0, minimum: 0 };
      catMap[cat].total += st.quantite_actuelle;
    }
    const stockParCategorie = Object.entries(catMap).map(([categorie, v]) => ({
      categorie,
      total: v.total,
      minimum: v.minimum,
      pourcentage: v.minimum > 0 ? Math.round((v.total / v.minimum) * 100) : 100,
    })).sort((a, b) => a.pourcentage - b.pourcentage);

    // ── Prochains contrôles (tiroirs) — sans N+1 ───────────────────────────
    const prochainsControles = [];
    const tiroirPlanning = plannings.find(p =>
      p.type_cible === 'TIROIR' || p.type_cible === 'ALL'
    );

    if (tiroirPlanning) {
      // Index : reference_id (tiroir) -> dernier contrôle (les contrôles sont déjà triés desc)
      const lastByTiroir = {};
      for (const c of controlesTousTiroirs) {
        if (!lastByTiroir[c.reference_id]) lastByTiroir[c.reference_id] = c;
      }

      for (const armoire of armoiresAvecTiroirs) {
        for (const tiroir of armoire.tiroirs) {
          const dernierControle = lastByTiroir[tiroir.id] || null;
          const nextDue = computeNextDue(
            dernierControle?.date_controle || null,
            tiroirPlanning.periodicite_valeur,
            tiroirPlanning.periodicite_unite,
          );
          prochainsControles.push({
            nom: `${armoire.nom} > ${tiroir.nom}`,
            dernierControle: dernierControle?.date_controle || null,
            dernierStatut: dernierControle?.statut || null,
            prochainControle: nextDue.toISOString(),
            enRetard: nextDue <= now,
          });
        }
      }

      prochainsControles.sort((a, b) => {
        if (a.enRetard !== b.enRetard) return a.enRetard ? -1 : 1;
        return new Date(a.prochainControle) - new Date(b.prochainControle);
      });
    }

    // ── Activité récente ────────────────────────────────────────────────────
    const activiteRecente = logs.map(l => ({
      action: l.action,
      details: l.details,
      user: l.user_prenom || l.user_login,
      date: l.created_at,
    }));

    // ── Réponse ─────────────────────────────────────────────────────────────
    const result = {
      kpis,
      peremptionTimeline,
      controlesTendance,
      stockParCategorie,
      prochainsControles,
      activiteRecente,
      activiteTotalCount: totalLogs,
    };

    if (logOffset === 0) setCache(cacheKey, result);

    res.json(result);
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Erreur lors du chargement du tableau de bord' });
  }
});

module.exports = router;
