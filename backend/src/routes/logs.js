'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const { getUlFilter } = require('../utils/resolveUL');

const router = express.Router();

/**
 * GET /api/logs/users
 * Utilisateurs distincts ayant des logs dans l'UL.
 */
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const rows = await prisma.log.findMany({
      where: { ...getUlFilter(req), user_login: { not: null } },
      distinct: ['user_login'],
      select: { user_login: true, user_prenom: true },
      orderBy: { user_prenom: 'asc' },
    });
    res.json(rows);
  } catch (err) {
    console.error('[logs/users]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/logs/export
 * Export CSV avec les mêmes filtres que GET /api/logs (sans pagination).
 */
router.get('/export', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const where = buildWhere(req);

    const logs = await prisma.log.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 10000,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=journal_activite.csv');

    // BOM UTF-8 pour Excel
    res.write('\uFEFF');
    res.write('Date;Action;Utilisateur;Login;Details\n');

    for (const log of logs) {
      const date = new Date(log.created_at).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const details = (log.details || '').replace(/"/g, '""');
      res.write(`"${date}";"${log.action}";"${log.user_prenom || ''}";"${log.user_login || ''}";"${details}"\n`);
    }

    res.end();
  } catch (err) {
    console.error('[logs/export]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/logs
 * Journal d'activité de l'UL — admin uniquement.
 * Query: ?limit=50&page=1&action=LOGIN&actions=LOGIN,CONTROLE&from=&to=&user=&search=
 */
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
  const page   = Math.max(parseInt(req.query.page)  || 1, 1);

  try {
    const where = buildWhere(req);

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.log.count({ where }),
    ]);

    res.json({ logs, total, page, limit });
  } catch (err) {
    console.error('[logs/GET]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Construit le filtre Prisma where à partir des query params.
 */
function buildWhere(req) {
  const { action, actions, from, to, user, search } = req.query;

  const where = { ...getUlFilter(req) };

  // Multi-actions (comma-separated) ou single action (rétrocompat)
  if (actions) {
    const list = actions.split(',').map(a => a.trim()).filter(Boolean);
    if (list.length > 0) where.action = { in: list };
  } else if (action) {
    where.action = action;
  }

  // Plage de dates
  if (from || to) {
    where.created_at = {};
    if (from) where.created_at.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.created_at.lte = toDate;
    }
  }

  // Filtre utilisateur
  if (user) where.user_login = user;

  // Recherche texte dans details
  if (search) where.details = { contains: search, mode: 'insensitive' };

  return where;
}

module.exports = router;
