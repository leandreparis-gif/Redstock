'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

/**
 * GET /api/controles
 * Liste tous les contrôles de l'UL.
 * Query : ?type=TIROIR|LOT, ?limit=N, ?page=N
 */
router.get('/', async (req, res) => {
  const { type, limit = 20, page = 1 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = {
      unite_locale_id: req.user.unite_locale_id,
      ...(type && { type }),
    };

    const [controles, total] = await Promise.all([
      prisma.controle.findMany({
        where,
        orderBy: { date_controle: 'desc' },
        take: parseInt(limit),
        skip,
      }),
      prisma.controle.count({ where }),
    ]);

    res.json({ controles, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[controles/GET]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/controles/stats
 * Statistiques de conformité pour le dashboard et reporting.
 * Retourne : { total, conforme, nonConforme, partiel, tauxConformite }
 */
router.get('/stats', async (req, res) => {
  try {
    const where = { unite_locale_id: req.user.unite_locale_id };

    const [total, conforme, nonConforme, partiel] = await Promise.all([
      prisma.controle.count({ where }),
      prisma.controle.count({ where: { ...where, statut: 'CONFORME' } }),
      prisma.controle.count({ where: { ...where, statut: 'NON_CONFORME' } }),
      prisma.controle.count({ where: { ...where, statut: 'PARTIEL' } }),
    ]);

    const tauxConformite = total > 0 ? Math.round((conforme / total) * 100) : 0;

    res.json({ total, conforme, nonConforme, partiel, tauxConformite });
  } catch (err) {
    console.error('[controles/stats]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/controles/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const controle = await prisma.controle.findFirst({
      where: { id: req.params.id, unite_locale_id: req.user.unite_locale_id },
    });
    if (!controle) return res.status(404).json({ error: 'Contrôle introuvable' });
    res.json(controle);
  } catch (err) {
    console.error('[controles/GET/:id]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/controles
 * Créer un contrôle (tiroir ou lot).
 * Body : {
 *   type, reference_id,
 *   controleur_prenom, controleur_qualification,
 *   statut, remarques
 * }
 * La signature est générée automatiquement côté serveur.
 */
router.post('/', async (req, res) => {
  const {
    type,
    reference_id,
    controleur_prenom,
    controleur_qualification,
    statut,
    remarques,
  } = req.body;

  if (!type || !reference_id || !controleur_prenom || !controleur_qualification || !statut) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }

  if (!['TIROIR', 'LOT'].includes(type)) {
    return res.status(400).json({ error: 'Type invalide (TIROIR | LOT)' });
  }

  if (!['CONFORME', 'NON_CONFORME', 'PARTIEL'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  // Règle métier : signature horodatée
  const dateISO = new Date().toISOString();
  const signature_data = `${controleur_prenom} (${controleur_qualification}) — contrôle effectué le ${dateISO}`;

  try {
    const controle = await prisma.controle.create({
      data: {
        type,
        reference_id,
        controleur_prenom,
        controleur_qualification,
        statut,
        remarques: remarques || null,
        signature_data,
        unite_locale_id: req.user.unite_locale_id,
      },
    });

    res.status(201).json(controle);
  } catch (err) {
    console.error('[controles/POST]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/controles/public
 * Contrôle depuis la page mobile QR (sans JWT — token du lot en body).
 * Body : { lot_token, controleur_prenom, controleur_qualification, statut, remarques }
 */
router.post('/public', async (req, res) => {
  const { lot_token, controleur_prenom, controleur_qualification, statut, remarques } = req.body;

  if (!lot_token || !controleur_prenom || !controleur_qualification || !statut) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }

  try {
    const lot = await prisma.lot.findUnique({ where: { qr_code_token: lot_token } });
    if (!lot) return res.status(404).json({ error: 'Lot introuvable' });

    const dateISO = new Date().toISOString();
    const signature_data = `${controleur_prenom} (${controleur_qualification}) — contrôle effectué le ${dateISO}`;

    const controle = await prisma.controle.create({
      data: {
        type: 'LOT',
        reference_id: lot.id,
        controleur_prenom,
        controleur_qualification,
        statut,
        remarques: remarques || null,
        signature_data,
        unite_locale_id: lot.unite_locale_id,
      },
    });

    res.status(201).json(controle);
  } catch (err) {
    console.error('[controles/public]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
