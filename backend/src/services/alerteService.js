'use strict';
/**
 * alerteService.js — Cron de vérification des alertes
 * Exécuté chaque nuit à 2h00.
 */
const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { alertePeremption, alerteStockBas, notifRetardUniforme } = require('./mailService');
const JOURS_ALERTE = 30; // alerter si péremption < 30 jours

async function verifierAlertes() {
  console.log('[CRON] Vérification des alertes — démarrage à', new Date().toISOString());

  try {
    const uniteLocales = await prisma.uniteLocale.findMany({ select: { id: true, nom: true } });

    for (const ul of uniteLocales) {
      await verifierAlertesUL(ul.id);
    }
    console.log('[CRON] Vérification terminée');
  } catch (err) {
    console.error('[CRON] Erreur vérification alertes:', err);
  }
}

async function verifierAlertesUL(uniteLocaleId) {
  const aujourd_hui = new Date();
  const limiteDateAlerte = new Date();
  limiteDateAlerte.setDate(aujourd_hui.getDate() + JOURS_ALERTE);

  // ── 1. Vérifier les péremptions ───────────────────────────────────────────
  const stocks = await prisma.stockTiroir.findMany({
    where: { unite_locale_id: uniteLocaleId },
    include: {
      article: true,
      tiroir: { include: { armoire: true } },
    },
  });

  for (const stock of stocks) {
    if (!stock.article.est_perimable || !stock.lots?.length) continue;

    for (const lot of stock.lots) {
      if (!lot.date_peremption) continue;
      const datePeremption = new Date(lot.date_peremption);
      if (datePeremption <= limiteDateAlerte) {
        // Créer ou réactiver l'alerte si elle n'existe pas
        const existante = await prisma.alerte.findFirst({
          where: {
            unite_locale_id: uniteLocaleId,
            type: 'PEREMPTION',
            article_id: stock.article_id,
            statut: 'ACTIVE',
          },
        });

        if (!existante) {
          const localisation = `${stock.tiroir.armoire.nom} > ${stock.tiroir.nom}`;
          await prisma.alerte.create({
            data: {
              type: 'PEREMPTION',
              message: `Article "${stock.article.nom}" — lot ${lot.label} périme le ${datePeremption.toLocaleDateString('fr-FR')}`,
              date_echeance: datePeremption,
              statut: 'ACTIVE',
              article_id: stock.article_id,
              unite_locale_id: uniteLocaleId,
            },
          });
          console.log(`[CRON] Alerte PEREMPTION créée — ${stock.article.nom}`);
        }
      }
    }
  }

  // ── 2. Vérifier les stocks bas ────────────────────────────────────────────
  for (const stock of stocks) {
    if (stock.quantite_actuelle >= stock.article.quantite_min) continue;

    const existante = await prisma.alerte.findFirst({
      where: {
        unite_locale_id: uniteLocaleId,
        type: 'STOCK_BAS',
        article_id: stock.article_id,
        statut: 'ACTIVE',
      },
    });

    if (!existante) {
      await prisma.alerte.create({
        data: {
          type: 'STOCK_BAS',
          message: `Article "${stock.article.nom}" — stock insuffisant : ${stock.quantite_actuelle} unités (minimum : ${stock.article.quantite_min})`,
          statut: 'ACTIVE',
          article_id: stock.article_id,
          unite_locale_id: uniteLocaleId,
        },
      });
      console.log(`[CRON] Alerte STOCK_BAS créée — ${stock.article.nom}`);
    }
  }

  // ── 3. Résoudre automatiquement les alertes stock bas si stock remonté ────
  const alertesStockBas = await prisma.alerte.findMany({
    where: { unite_locale_id: uniteLocaleId, type: 'STOCK_BAS', statut: 'ACTIVE' },
    include: { article: true },
  });

  for (const alerte of alertesStockBas) {
    const stock = await prisma.stockTiroir.findFirst({
      where: { article_id: alerte.article_id, unite_locale_id: uniteLocaleId },
    });
    if (stock && stock.quantite_actuelle >= alerte.article.quantite_min) {
      await prisma.alerte.update({ where: { id: alerte.id }, data: { statut: 'RESOLUE' } });
      console.log(`[CRON] Alerte STOCK_BAS résolue automatiquement — ${alerte.article.nom}`);
    }
  }
}

// ─── RETARDS UNIFORMES ────────────────────────────────────────────────────────

async function verifierRetardsUniformes() {
  console.log('[CRON] Vérification retards uniformes — démarrage à', new Date().toISOString());

  try {
    const maintenant = new Date();

    // Trouver tous les prêts en cours avec date de retour dépassée
    const mouvementsEnRetard = await prisma.mouvementUniforme.findMany({
      where: {
        type: 'PRET',
        date_retour_effective: null,
        date_retour_prevue: { lt: maintenant },
      },
      include: {
        uniforme: { include: { unite_locale: true } },
      },
    });

    if (!mouvementsEnRetard.length) {
      console.log('[CRON] Aucun retard uniforme détecté');
      return;
    }

    for (const m of mouvementsEnRetard) {
      if (!m.beneficiaire_email) continue;

      const joursRetard = Math.floor((maintenant - new Date(m.date_retour_prevue)) / (1000 * 60 * 60 * 24));
      try {
        await notifRetardUniforme({
          uniformeNom: m.uniforme.nom,
          taille: m.uniforme.taille,
          beneficiaire: m.beneficiaire_prenom,
          qualification: m.beneficiaire_qualification,
          dateRetourPrevue: m.date_retour_prevue,
          joursRetard,
          destinataires: [m.beneficiaire_email],
        });
        console.log(`[CRON] Email retard envoyé à ${m.beneficiaire_email} — ${m.uniforme.nom} (+${joursRetard}j)`);
      } catch (err) {
        console.error(`[CRON] Erreur email retard uniforme:`, err.message);
      }
    }
  } catch (err) {
    console.error('[CRON] Erreur vérification retards uniformes:', err);
  }
}

// Planifié pour tourner à 02:00 chaque nuit
cron.schedule('0 2 * * *', verifierAlertes);

// Retards uniformes à 08:00 chaque matin
cron.schedule('0 8 * * *', verifierRetardsUniformes);

console.log('[CRON] alerteService chargé — crons planifiés (alertes 02h00, retards uniformes 08h00)');

module.exports = { verifierAlertes, verifierRetardsUniformes };
