'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const { getUlFilter } = require('../utils/resolveUL');

const router = express.Router();

/**
 * GET /api/logs
 * Journal d'activité de l'UL — admin uniquement.
 * Query: ?limit=50&page=1&action=LOGIN
 */
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
  const page   = Math.max(parseInt(req.query.page)  || 1, 1);
  const action = req.query.action || undefined;

  try {
    const where = {
      ...getUlFilter(req),
      ...(action ? { action } : {}),
    };

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

module.exports = router;
