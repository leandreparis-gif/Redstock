'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

/**
 * GET /api/dashboard/stats
 * Endpoint agrégé pour le tableau de bord.
 */
router.get('/stats', async (req, res) => {
  const ulId = req.user.unite_locale_id;
  const now = new Date();

  try {
    // ── Requêtes en parallèle ──────────────────────────────────────────────
    const [
      alertesActives,
      controles,
      stocksTiroir,
      stocksPochette,
      articles,
      logs,
    ] = await Promise.all([
      // 1. Alertes actives
      prisma.alerte.findMany({
        where: { unite_locale_id: ulId, statut: 'ACTIVE' },
        include: { article: true },
        orderBy: { date_echeance: 'asc' },
      }),
      // 2. Tous les contrôles (pour tendance)
      prisma.controle.findMany({
        where: { unite_locale_id: ulId },
        orderBy: { date_controle: 'desc' },
        take: 100,
      }),
      // 3. Stocks tiroirs
      prisma.stockTiroir.findMany({
        where: { unite_locale_id: ulId },
        include: {
          article: true,
          tiroir: { include: { armoire: true } },
        },
      }),
      // 4. Stocks pochettes
      prisma.stockPochette.findMany({
        where: { unite_locale_id: ulId },
        include: {
          article: true,
          pochette: { include: { lot: true } },
        },
      }),
      // 5. Articles
      prisma.article.findMany({
        where: { unite_locale_id: ulId },
      }),
      // 6. Logs récents
      prisma.log.findMany({
        where: { unite_locale_id: ulId },
        orderBy: { created_at: 'desc' },
        take: 8,
      }),
    ]);

    // ── KPIs ────────────────────────────────────────────────────────────────
    const countPeremption = alertesActives.filter(a => a.type === 'PEREMPTION').length;
    const countStockBas = alertesActives.filter(a => a.type === 'STOCK_BAS').length;

    const totalControles = controles.length;
    const conforme = controles.filter(c => c.statut === 'CONFORME').length;
    const tauxConformite = totalControles > 0
      ? Math.round((conforme / totalControles) * 100)
      : 100;

    const kpis = {
      alertesActives: alertesActives.length,
      peremptions: countPeremption,
      stocksBas: countStockBas,
      tauxConformite,
      totalControles,
      articlesTotal: articles.length,
    };

    // ── Péremption timeline ─────────────────────────────────────────────────
    const allLots = [];
    for (const st of stocksTiroir) {
      const lots = Array.isArray(st.lots) ? st.lots : [];
      for (const lot of lots) {
        if (lot.date_peremption) {
          allLots.push({
            date: new Date(lot.date_peremption),
            articleNom: st.article.nom,
          });
        }
      }
    }
    for (const sp of stocksPochette) {
      const lots = Array.isArray(sp.lots) ? sp.lots : [];
      for (const lot of lots) {
        if (lot.date_peremption) {
          allLots.push({
            date: new Date(lot.date_peremption),
            articleNom: sp.article.nom,
          });
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

    // ── Tendance conformité (par jour, 10 derniers jours avec contrôles) ───
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

    // ── Articles critiques ──────────────────────────────────────────────────
    const articlesCritiques = alertesActives.slice(0, 5).map(a => {
      const info = { id: a.id, nom: a.article?.nom || 'Inconnu', type: a.type, message: a.message };
      if (a.date_echeance) info.datePeremption = a.date_echeance;
      return info;
    });

    // ── Stock par catégorie ─────────────────────────────────────────────────
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
    for (const sp of stocksPochette) {
      const cat = sp.article.categorie;
      if (!catMap[cat]) catMap[cat] = { total: 0, minimum: 0 };
      catMap[cat].total += sp.quantite_actuelle;
    }
    const stockParCategorie = Object.entries(catMap).map(([categorie, v]) => ({
      categorie,
      total: v.total,
      minimum: v.minimum,
      pourcentage: v.minimum > 0 ? Math.round((v.total / v.minimum) * 100) : 100,
    })).sort((a, b) => a.pourcentage - b.pourcentage);

    // ── Activité récente ────────────────────────────────────────────────────
    const activiteRecente = logs.map(l => ({
      action: l.action,
      details: l.details,
      user: l.user_prenom || l.user_login,
      date: l.created_at,
    }));

    // ── Réponse ─────────────────────────────────────────────────────────────
    res.json({
      kpis,
      peremptionTimeline,
      controlesTendance,
      articlesCritiques,
      stockParCategorie,
      activiteRecente,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Erreur lors du chargement du tableau de bord' });
  }
});

module.exports = router;
