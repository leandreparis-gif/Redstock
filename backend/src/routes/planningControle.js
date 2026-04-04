'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const logAction = require('../utils/logAction');

const { getUlFilter, getUlId } = require('../utils/resolveUL');

const router = express.Router();
router.use(authMiddleware, requireAdmin);

const CIBLES_VALIDES = ['LOT', 'TIROIR', 'ALL'];
const UNITES_VALIDES = ['JOURS', 'SEMAINES', 'MOIS'];

/**
 * GET /api/planning-controle
 */
router.get('/', async (req, res) => {
  try {
    const plannings = await prisma.planningControle.findMany({
      where: { ...getUlFilter(req) },
      orderBy: { created_at: 'desc' },
    });
    res.json(plannings);
  } catch (err) {
    console.error('[planning-controle/GET]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/planning-controle
 */
router.post('/', async (req, res) => {
  const { type_cible, periodicite_valeur, periodicite_unite, destinataires, actif } = req.body;

  if (!CIBLES_VALIDES.includes(type_cible)) {
    return res.status(400).json({ error: 'Type cible invalide (LOT | TIROIR | ALL)' });
  }
  if (!periodicite_valeur || periodicite_valeur < 1) {
    return res.status(400).json({ error: 'Périodicité invalide' });
  }
  if (!UNITES_VALIDES.includes(periodicite_unite)) {
    return res.status(400).json({ error: 'Unité de périodicité invalide' });
  }
  if (!Array.isArray(destinataires) || destinataires.length === 0) {
    return res.status(400).json({ error: 'Au moins un destinataire requis' });
  }

  try {
    const planning = await prisma.planningControle.create({
      data: {
        type_cible,
        periodicite_valeur: parseInt(periodicite_valeur),
        periodicite_unite,
        destinataires,
        actif: actif ?? true,
        unite_locale_id: getUlId(req),
      },
    });

    logAction(prisma, {
      uniteLocaleId: getUlId(req),
      action: 'PLANNING_CREATE',
      details: `Planning créé — ${type_cible} tous les ${periodicite_valeur} ${periodicite_unite.toLowerCase()}`,
      user: req.user,
    });

    res.status(201).json(planning);
  } catch (err) {
    console.error('[planning-controle/POST]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/planning-controle/:id
 */
router.put('/:id', async (req, res) => {
  const { type_cible, periodicite_valeur, periodicite_unite, destinataires, actif } = req.body;

  if (type_cible && !CIBLES_VALIDES.includes(type_cible)) {
    return res.status(400).json({ error: 'Type cible invalide (LOT | TIROIR | ALL)' });
  }
  if (periodicite_unite && !UNITES_VALIDES.includes(periodicite_unite)) {
    return res.status(400).json({ error: 'Unité de périodicité invalide' });
  }
  if (destinataires && (!Array.isArray(destinataires) || destinataires.length === 0)) {
    return res.status(400).json({ error: 'Au moins un destinataire requis' });
  }

  try {
    const existing = await prisma.planningControle.findFirst({
      where: { id: req.params.id, ...getUlFilter(req) },
    });
    if (!existing) return res.status(404).json({ error: 'Planning introuvable' });

    const planning = await prisma.planningControle.update({
      where: { id: req.params.id },
      data: {
        ...(type_cible && { type_cible }),
        ...(periodicite_valeur && { periodicite_valeur: parseInt(periodicite_valeur) }),
        ...(periodicite_unite && { periodicite_unite }),
        ...(destinataires && { destinataires }),
        ...(actif !== undefined && { actif }),
      },
    });

    logAction(prisma, {
      uniteLocaleId: getUlId(req),
      action: 'PLANNING_UPDATE',
      details: `Planning modifié — ${planning.type_cible}`,
      user: req.user,
    });

    res.json(planning);
  } catch (err) {
    console.error('[planning-controle/PUT]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/planning-controle/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.planningControle.findFirst({
      where: { id: req.params.id, ...getUlFilter(req) },
    });
    if (!existing) return res.status(404).json({ error: 'Planning introuvable' });

    await prisma.planningControle.delete({ where: { id: req.params.id } });

    logAction(prisma, {
      uniteLocaleId: getUlId(req),
      action: 'PLANNING_DELETE',
      details: `Planning supprimé — ${existing.type_cible}`,
      user: req.user,
    });

    res.json({ message: 'Planning supprimé' });
  } catch (err) {
    console.error('[planning-controle/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/planning-controle/:id/toggle
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const existing = await prisma.planningControle.findFirst({
      where: { id: req.params.id, ...getUlFilter(req) },
    });
    if (!existing) return res.status(404).json({ error: 'Planning introuvable' });

    const planning = await prisma.planningControle.update({
      where: { id: req.params.id },
      data: { actif: !existing.actif },
    });

    res.json(planning);
  } catch (err) {
    console.error('[planning-controle/PATCH/toggle]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
