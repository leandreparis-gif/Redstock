'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const router = express.Router();
const prisma = new PrismaClient();

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
      unite_locale_id: req.user.unite_locale_id,
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
