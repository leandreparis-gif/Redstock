'use strict';

const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

const { notifPretUniforme, notifRetourUniforme } = require('../services/mailService');

const router = express.Router();


router.use(authMiddleware);

/**
 * GET /api/uniformes
 * Liste tous les uniformes avec bénéficiaire actuel si prêté/attribué.
 * Query : ?statut=DISPONIBLE|PRETE|ATTRIBUE, ?taille=XS|S|M|L|XL|XXL
 */
router.get('/', async (req, res) => {
  const { statut, taille } = req.query;

  try {
    const uniformes = await prisma.uniforme.findMany({
      where: {
        unite_locale_id: req.user.unite_locale_id,
        ...(statut && { statut }),
        ...(taille && { taille }),
      },
      include: {
        // Dernier mouvement actif pour afficher le bénéficiaire
        mouvements: {
          where: { date_retour_effective: null },
          orderBy: { date_mouvement: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ nom: 'asc' }, { taille: 'asc' }],
    });
    res.json(uniformes);
  } catch (err) {
    console.error('[uniformes/GET]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/uniformes/en-cours
 * Tous les prêts/attributions en cours (sans retour).
 */
router.get('/en-cours', async (req, res) => {
  try {
    const mouvements = await prisma.mouvementUniforme.findMany({
      where: {
        date_retour_effective: null,
        type: { in: ['PRET', 'ATTRIBUTION'] },
        uniforme: { unite_locale_id: req.user.unite_locale_id },
      },
      include: {
        uniforme: true,
      },
      orderBy: { date_mouvement: 'desc' },
    });
    res.json(mouvements);
  } catch (err) {
    console.error('[uniformes/en-cours]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/uniformes/:id/historique
 * Historique complet des mouvements d'un uniforme.
 */
router.get('/:id/historique', async (req, res) => {
  try {
    const uniforme = await prisma.uniforme.findFirst({
      where: { id: req.params.id, unite_locale_id: req.user.unite_locale_id },
    });
    if (!uniforme) return res.status(404).json({ error: 'Uniforme introuvable' });

    const mouvements = await prisma.mouvementUniforme.findMany({
      where: { uniforme_id: req.params.id },
      orderBy: { date_mouvement: 'desc' },
    });
    res.json({ uniforme, mouvements });
  } catch (err) {
    console.error('[uniformes/historique]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/uniformes
 * Créer un uniforme (ADMIN uniquement).
 * Body : { nom, taille, etat }
 */
router.post('/', requireAdmin, async (req, res) => {
  const { nom, taille, etat } = req.body;

  if (!nom || !taille || !etat) {
    return res.status(400).json({ error: 'Nom, taille et état requis' });
  }

  const tailles = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const etats = ['NEUF', 'BON', 'USE'];

  if (!tailles.includes(taille)) return res.status(400).json({ error: 'Taille invalide' });
  if (!etats.includes(etat)) return res.status(400).json({ error: 'État invalide' });

  try {
    const uniforme = await prisma.uniforme.create({
      data: { nom, taille, etat, statut: 'DISPONIBLE', unite_locale_id: req.user.unite_locale_id },
    });
    res.status(201).json(uniforme);
  } catch (err) {
    console.error('[uniformes/POST]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/uniformes/:id
 * Modifier nom, taille ou état (ADMIN).
 */
router.put('/:id', requireAdmin, async (req, res) => {
  const { nom, taille, etat } = req.body;
  try {
    const existing = await prisma.uniforme.findFirst({
      where: { id: req.params.id, unite_locale_id: req.user.unite_locale_id },
    });
    if (!existing) return res.status(404).json({ error: 'Uniforme introuvable' });

    const uniforme = await prisma.uniforme.update({
      where: { id: req.params.id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(taille !== undefined && { taille }),
        ...(etat !== undefined && { etat }),
      },
    });
    res.json(uniforme);
  } catch (err) {
    console.error('[uniformes/PUT]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/uniformes/:id (ADMIN)
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.uniforme.findFirst({
      where: { id: req.params.id, unite_locale_id: req.user.unite_locale_id },
    });
    if (!existing) return res.status(404).json({ error: 'Uniforme introuvable' });

    await prisma.uniforme.delete({ where: { id: req.params.id } });
    res.json({ message: 'Uniforme supprimé' });
  } catch (err) {
    console.error('[uniformes/DELETE]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── MOUVEMENTS ───────────────────────────────────────────────────────────────

/**
 * POST /api/uniformes/:id/pret
 * Enregistrer un prêt temporaire.
 * Body : { beneficiaire_prenom, beneficiaire_qualification, date_retour_prevue }
 */
router.post('/:id/pret', async (req, res) => {
  const { beneficiaire_prenom, beneficiaire_email, beneficiaire_qualification, date_retour_prevue } = req.body;

  if (!beneficiaire_prenom || !beneficiaire_qualification || !date_retour_prevue) {
    return res.status(400).json({ error: 'Prénom, qualification et date de retour prévue requis' });
  }

  try {
    const uniforme = await prisma.uniforme.findFirst({
      where: { id: req.params.id, unite_locale_id: req.user.unite_locale_id },
    });
    if (!uniforme) return res.status(404).json({ error: 'Uniforme introuvable' });

    // Règle métier : ne peut pas être prêté si déjà PRETE ou ATTRIBUE
    if (uniforme.statut !== 'DISPONIBLE') {
      return res.status(409).json({
        error: `Impossible : uniforme actuellement ${uniforme.statut}. Un retour est requis.`,
      });
    }

    const [mouvement] = await prisma.$transaction([
      prisma.mouvementUniforme.create({
        data: {
          uniforme_id: req.params.id,
          type: 'PRET',
          beneficiaire_prenom,
          beneficiaire_email: beneficiaire_email || null,
          beneficiaire_qualification,
          date_retour_prevue: new Date(date_retour_prevue),
        },
      }),
      prisma.uniforme.update({
        where: { id: req.params.id },
        data: { statut: 'PRETE' },
      }),
    ]);

    // Email au bénéficiaire (silent fail)
    if (beneficiaire_email) {
      try {
        await notifPretUniforme({
          uniformeNom: uniforme.nom,
          taille: uniforme.taille,
          beneficiaire: beneficiaire_prenom,
          qualification: beneficiaire_qualification,
          dateRetourPrevue: date_retour_prevue,
          destinataires: [beneficiaire_email],
        });
      } catch (mailErr) {
        console.error('[uniformes/pret] Erreur envoi email:', mailErr.message);
      }
    }

    res.status(201).json(mouvement);
  } catch (err) {
    console.error('[uniformes/pret]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/uniformes/:id/attribution
 * Enregistrer une attribution définitive.
 * Body : { beneficiaire_prenom, beneficiaire_qualification }
 */
router.post('/:id/attribution', async (req, res) => {
  const { beneficiaire_prenom, beneficiaire_email, beneficiaire_qualification } = req.body;

  if (!beneficiaire_prenom || !beneficiaire_qualification) {
    return res.status(400).json({ error: 'Prénom et qualification requis' });
  }

  try {
    const uniforme = await prisma.uniforme.findFirst({
      where: { id: req.params.id, unite_locale_id: req.user.unite_locale_id },
    });
    if (!uniforme) return res.status(404).json({ error: 'Uniforme introuvable' });

    if (uniforme.statut !== 'DISPONIBLE') {
      return res.status(409).json({
        error: `Impossible : uniforme actuellement ${uniforme.statut}. Un retour est requis.`,
      });
    }

    const [mouvement] = await prisma.$transaction([
      prisma.mouvementUniforme.create({
        data: {
          uniforme_id: req.params.id,
          type: 'ATTRIBUTION',
          beneficiaire_prenom,
          beneficiaire_email: beneficiaire_email || null,
          beneficiaire_qualification,
          date_retour_prevue: null, // Attribution définitive
        },
      }),
      prisma.uniforme.update({
        where: { id: req.params.id },
        data: { statut: 'ATTRIBUE' },
      }),
    ]);

    res.status(201).json(mouvement);
  } catch (err) {
    console.error('[uniformes/attribution]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/uniformes/:id/retour
 * Enregistrer un retour.
 * Body : { remarques? }
 */
router.post('/:id/retour', async (req, res) => {
  const { remarques } = req.body;

  try {
    const uniforme = await prisma.uniforme.findFirst({
      where: { id: req.params.id, unite_locale_id: req.user.unite_locale_id },
    });
    if (!uniforme) return res.status(404).json({ error: 'Uniforme introuvable' });

    if (uniforme.statut === 'DISPONIBLE') {
      return res.status(409).json({ error: 'Cet uniforme est déjà disponible' });
    }

    // Trouver le mouvement actif
    const mouvementActif = await prisma.mouvementUniforme.findFirst({
      where: { uniforme_id: req.params.id, date_retour_effective: null },
      orderBy: { date_mouvement: 'desc' },
    });

    const remarqueFinal = uniforme.statut === 'ATTRIBUE'
      ? `Retour d'attribution définitive${remarques ? ` — ${remarques}` : ''}`
      : remarques || null;

    const dateRetour = new Date();

    await prisma.$transaction([
      // Clôturer le mouvement actif
      ...(mouvementActif
        ? [prisma.mouvementUniforme.update({
            where: { id: mouvementActif.id },
            data: { date_retour_effective: dateRetour },
          })]
        : []),
      // Créer un mouvement RETOUR
      prisma.mouvementUniforme.create({
        data: {
          uniforme_id: req.params.id,
          type: 'RETOUR',
          beneficiaire_prenom: mouvementActif?.beneficiaire_prenom || 'Inconnu',
          beneficiaire_qualification: mouvementActif?.beneficiaire_qualification || 'AUTRE',
          date_retour_effective: dateRetour,
          remarques: remarqueFinal,
        },
      }),
      // Remettre en DISPONIBLE
      prisma.uniforme.update({
        where: { id: req.params.id },
        data: { statut: 'DISPONIBLE' },
      }),
    ]);

    // Email au bénéficiaire (silent fail)
    if (mouvementActif?.beneficiaire_email) {
      try {
        const enRetard = mouvementActif?.date_retour_prevue && new Date(mouvementActif.date_retour_prevue) < dateRetour;
        await notifRetourUniforme({
          uniformeNom: uniforme.nom,
          taille: uniforme.taille,
          beneficiaire: mouvementActif.beneficiaire_prenom,
          enRetard: !!enRetard,
          remarques: remarqueFinal,
          destinataires: [mouvementActif.beneficiaire_email],
        });
      } catch (mailErr) {
        console.error('[uniformes/retour] Erreur envoi email:', mailErr.message);
      }
    }

    res.json({ message: 'Retour enregistré' });
  } catch (err) {
    console.error('[uniformes/retour]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
