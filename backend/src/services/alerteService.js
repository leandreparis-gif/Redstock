'use strict';
/**
 * alerteService.js — Cron de vérification des alertes
 * Exécuté chaque nuit à 2h00.
 */
const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { alertePeremption, alerteStockBas } = require('./mailService');
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

// Planifié pour tourner à 02:00 chaque nuit
cron.schedule('0 2 * * *', verifierAlertes);

console.log('[CRON] alerteService chargé — cron planifié à 02h00 chaque nuit');

module.exports = { verifierAlertes };
