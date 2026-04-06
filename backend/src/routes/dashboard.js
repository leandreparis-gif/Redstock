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
    const [
      alertesActives,
      controles,
      stocksTiroir,
      articles,
      logs,
      totalLogs,
      plannings,
    ] = await Promise.all([
      // 1. Alertes actives (count seulement — le détail vient de useAlertes)
      prisma.alerte.count({
        where: { ...ulFilter, statut: 'ACTIVE' },
      }),
      // 2. Contrôles des 30 derniers jours
      prisma.controle.findMany({
        where: {
          ...ulFilter,
          type: 'TIROIR',
          date_controle: { gte: date30j },
        },
        select: { date_controle: true, statut: true },
        orderBy: { date_controle: 'desc' },
      }),
      // 3. Stocks tiroirs (pharmacie) — champs nécessaires seulement
      prisma.stockTiroir.findMany({
        where: { ...ulFilter },
        select: {
          quantite_actuelle: true,
          lots: true,
          article_id: true,
          article: { select: { nom: true, categorie: true, est_perimable: true, quantite_min: true } },
          tiroir: {
            select: {
              id: true,
              nom: true,
              armoire: { select: { nom: true } },
            },
          },
        },
      }),
      // 4. Articles (pour stock par catégorie — quantité min)
      prisma.article.findMany({
        where: { ...ulFilter },
        select: { categorie: true, quantite_min: true },
      }),
      // 5. Logs récents (avec pagination)
      prisma.log.findMany({
        where: { ...ulFilter },
        orderBy: { created_at: 'desc' },
        take: logLimit,
        skip: logOffset,
        select: { action: true, details: true, user_prenom: true, user_login: true, created_at: true },
      }),
      // 6. Total logs (pour savoir s'il y a plus)
      prisma.log.count({ where: { ...ulFilter } }),
      // 7. Plannings contrôle actifs
      prisma.planningControle.findMany({
        where: { ...ulFilter, actif: true },
        select: {
          type_cible: true,
          periodicite_valeur: true,
          periodicite_unite: true,
        },
      }),
    ]);

    // ── KPIs ────────────────────────────────────────────────────────────────
    // Compter péremptions et stocks bas depuis les alertes
    const [countPeremption, countStockBas] = await Promise.all([
      prisma.alerte.count({ where: { ...ulFilter, statut: 'ACTIVE', type: 'PEREMPTION' } }),
      prisma.alerte.count({ where: { ...ulFilter, statut: 'ACTIVE', type: 'STOCK_BAS' } }),
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

    // ── Prochains contrôles (tiroirs uniquement) ────────────────────────────
    const prochainsControles = [];
    const tiroirPlanning = plannings.find(p =>
      p.type_cible === 'TIROIR' || p.type_cible === 'ALL'
    );

    if (tiroirPlanning) {
      // Récupérer tous les tiroirs de l'UL
      const armoires = await prisma.armoire.findMany({
        where: { ...ulFilter },
        select: {
          nom: true,
          tiroirs: { select: { id: true, nom: true } },
        },
      });

      for (const armoire of armoires) {
        for (const tiroir of armoire.tiroirs) {
          const dernierControle = await prisma.controle.findFirst({
            where: { type: 'TIROIR', reference_id: tiroir.id, ...ulFilter },
            orderBy: { date_controle: 'desc' },
            select: { date_controle: true, statut: true },
          });

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

      // Trier : en retard d'abord, puis par date
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
