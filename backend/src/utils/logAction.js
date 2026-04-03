'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Enregistre une action dans le journal.
 * Ne lève jamais d'erreur — les logs ne doivent pas casser l'app.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ uniteLocaleId: string, action: string, details?: string, user?: { prenom?: string, login?: string } }} opts
 */
async function logAction(prisma, { uniteLocaleId, action, details, user }) {
  try {
    await prisma.log.create({
      data: {
        id: uuidv4(),
        action,
        details: details || null,
        user_prenom: user?.prenom || null,
        user_login: user?.login || null,
        unite_locale_id: uniteLocaleId,
      },
    });
  } catch {
    // silent — les logs ne doivent jamais bloquer une requête
  }
}

module.exports = logAction;
