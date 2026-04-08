'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { getUlFilter } = require('../utils/resolveUL');

const router = express.Router();
router.use(authMiddleware);

/**
 * Calcule le statut peremption a partir du nombre de jours restants.
 */
function getStatut(daysRemaining) {
  if (daysRemaining < 0)   return 'expired';
  if (daysRemaining <= 7)  return 'j7';
  if (daysRemaining <= 30) return 'j30';
  if (daysRemaining <= 60) return 'j60';
  if (daysRemaining <= 90) return 'j90';
  return 'ok';
}

/**
 * GET /api/peremptions
 * Vue consolidee de toutes les dates de peremption.
 * Query: ?range=expired|j7|j30|j60|j90|all  &location=armoire|lot|all  &search=  &page=  &limit=
 */
router.get('/', async (req, res) => {
  const range    = req.query.range    || 'all';
  const location = req.query.location || 'all';
  const search   = (req.query.search  || '').toLowerCase();
  const page     = Math.max(parseInt(req.query.page)  || 1, 1);
  const limit    = Math.min(parseInt(req.query.limit) || 50, 200);
  const ulFilter = getUlFilter(req);
  const now = new Date();

  try {
    const items = [];

    // ── Stocks Tiroirs (pharmacie) ────────────────────────────────────────────
    if (location === 'all' || location === 'armoire') {
      const stocksTiroir = await prisma.stockTiroir.findMany({
        where: { ...ulFilter },
        select: {
          id: true,
          lots: true,
          article: { select: { id: true, nom: true, categorie: true, est_perimable: true } },
          tiroir: {
            select: {
              id: true, nom: true,
              armoire: { select: { id: true, nom: true } },
            },
          },
        },
      });

      for (const st of stocksTiroir) {
        if (!st.article.est_perimable) continue;
        const lots = Array.isArray(st.lots) ? st.lots : [];
        for (let i = 0; i < lots.length; i++) {
          const lot = lots[i];
          if (!lot.date_peremption) continue;
          const datePeremption = new Date(lot.date_peremption);
          const daysRemaining = Math.ceil((datePeremption - now) / 86400000);
          items.push({
            id: `t_${st.id}_${i}`,
            article_nom: st.article.nom,
            article_id: st.article.id,
            categorie: st.article.categorie,
            location_type: 'armoire',
            location_name: `${st.tiroir.armoire.nom} > ${st.tiroir.nom}`,
            location_link: '/armoires',
            lot_label: lot.label || '—',
            date_peremption: lot.date_peremption,
            days_remaining: daysRemaining,
            quantite: lot.quantite || 0,
            statut: getStatut(daysRemaining),
          });
        }
      }
    }

    // ── Stocks Pochettes (lots d'urgence) ─────────────────────────────────────
    if (location === 'all' || location === 'lot') {
      const stocksPochette = await prisma.stockPochette.findMany({
        where: { ...ulFilter },
        select: {
          id: true,
          lots: true,
          article: { select: { id: true, nom: true, categorie: true, est_perimable: true } },
          pochette: {
            select: {
              id: true, nom: true,
              lot: { select: { id: true, nom: true } },
            },
          },
        },
      });

      for (const sp of stocksPochette) {
        if (!sp.article.est_perimable) continue;
        const lots = Array.isArray(sp.lots) ? sp.lots : [];
        for (let i = 0; i < lots.length; i++) {
          const lot = lots[i];
          if (!lot.date_peremption) continue;
          const datePeremption = new Date(lot.date_peremption);
          const daysRemaining = Math.ceil((datePeremption - now) / 86400000);
          items.push({
            id: `p_${sp.id}_${i}`,
            article_nom: sp.article.nom,
            article_id: sp.article.id,
            categorie: sp.article.categorie,
            location_type: 'lot',
            location_name: `${sp.pochette.lot.nom} > ${sp.pochette.nom}`,
            location_link: '/lots',
            lot_label: lot.label || '—',
            date_peremption: lot.date_peremption,
            days_remaining: daysRemaining,
            quantite: lot.quantite || 0,
            statut: getStatut(daysRemaining),
          });
        }
      }
    }

    // ── Filtrage ───────────────────────────────────────────────────────────────
    let filtered = items;

    // Filtre par plage
    if (range !== 'all') {
      filtered = filtered.filter(item => item.statut === range);
    }

    // Filtre par recherche article
    if (search) {
      filtered = filtered.filter(item => item.article_nom.toLowerCase().includes(search));
    }

    // ── Tri par date peremption (plus proche en premier) ──────────────────────
    filtered.sort((a, b) => a.days_remaining - b.days_remaining);

    // ── Summary (avant pagination) ────────────────────────────────────────────
    const summary = {
      total: filtered.length,
      expired: filtered.filter(i => i.statut === 'expired').length,
      j7: filtered.filter(i => i.statut === 'j7').length,
      j30: filtered.filter(i => i.statut === 'j30').length,
      j60: filtered.filter(i => i.statut === 'j60').length,
    };

    // ── Pagination ────────────────────────────────────────────────────────────
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    res.json({ items: paginated, summary, total: filtered.length, page, limit });
  } catch (err) {
    console.error('[peremptions/GET]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
