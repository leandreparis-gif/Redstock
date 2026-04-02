'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed PharmaSecours…');

  // ─── NETTOYAGE (ordre respect des FK) ──────────────────────────────────────
  await prisma.alerte.deleteMany();
  await prisma.controle.deleteMany();
  await prisma.mouvementUniforme.deleteMany();
  await prisma.uniforme.deleteMany();
  await prisma.stockPochette.deleteMany();
  await prisma.stockTiroir.deleteMany();
  await prisma.pochette.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.tiroir.deleteMany();
  await prisma.armoire.deleteMany();
  await prisma.article.deleteMany();
  await prisma.user.deleteMany();
  await prisma.uniteLocale.deleteMany();

  // ─── UNITÉ LOCALE ──────────────────────────────────────────────────────────
  const ul = await prisma.uniteLocale.create({
    data: { nom: 'Versailles Grand Parc Ouest' },
  });
  console.log(`✅ UL créée : ${ul.nom}`);

  // ─── UTILISATEURS ──────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10);
  const controleurHash = await bcrypt.hash('secours123', 10);

  const admin = await prisma.user.create({
    data: {
      prenom: 'Sophie',
      qualification: 'CI',
      role: 'ADMIN',
      login: 'admin',
      password_hash: adminHash,
      unite_locale_id: ul.id,
    },
  });

  const controleur = await prisma.user.create({
    data: {
      prenom: 'Jean',
      qualification: 'PSE2',
      role: 'CONTROLEUR',
      login: 'jean.dupont',
      password_hash: controleurHash,
      unite_locale_id: ul.id,
    },
  });
  console.log(`✅ Utilisateurs créés : ${admin.login}, ${controleur.login}`);

  // ─── ARTICLES ──────────────────────────────────────────────────────────────
  const today = new Date();
  const inFiveDays = new Date(today); inFiveDays.setDate(today.getDate() + 5);
  const inThreeMonths = new Date(today); inThreeMonths.setMonth(today.getMonth() + 3);
  const inTwoYears = new Date(today); inTwoYears.setFullYear(today.getFullYear() + 2);
  const expired = new Date(today); expired.setDate(today.getDate() - 10);
  const inTwentyDays = new Date(today); inTwentyDays.setDate(today.getDate() + 20);

  const [masque, gants, seringue, compresse, couverture, defibrillateur] =
    await Promise.all([
      prisma.article.create({
        data: {
          nom: 'Masque de poche',
          description: 'Masque de ventilation pour RCP',
          quantite_min: 2,
          categorie: 'Airway',
          est_perimable: true,
          unite_locale_id: ul.id,
        },
      }),
      prisma.article.create({
        data: {
          nom: 'Gants latex M',
          description: 'Gants de protection taille M',
          quantite_min: 10,
          categorie: 'Protection',
          est_perimable: true,
          unite_locale_id: ul.id,
        },
      }),
      prisma.article.create({
        data: {
          nom: 'Seringue 10 mL',
          description: 'Seringue stérile 10 mL',
          quantite_min: 5,
          categorie: 'Circulation',
          est_perimable: true,
          unite_locale_id: ul.id,
        },
      }),
      prisma.article.create({
        data: {
          nom: 'Compresse stérile 10x10',
          description: 'Compresse stérile 10x10 cm',
          quantite_min: 20,
          categorie: 'Plaies',
          est_perimable: false,
          unite_locale_id: ul.id,
        },
      }),
      prisma.article.create({
        data: {
          nom: 'Couverture de survie',
          description: 'Couverture isothermique dorée/argentée',
          quantite_min: 3,
          categorie: 'Divers',
          est_perimable: false,
          unite_locale_id: ul.id,
        },
      }),
      prisma.article.create({
        data: {
          nom: 'Électrode DAE adulte',
          description: 'Électrodes pour défibrillateur adulte',
          quantite_min: 2,
          categorie: 'Circulation',
          est_perimable: true,
          unite_locale_id: ul.id,
        },
      }),
    ]);
  console.log('✅ 6 articles créés');

  // ─── ARMOIRE & TIROIRS ─────────────────────────────────────────────────────
  const armoire = await prisma.armoire.create({
    data: {
      nom: 'Armoire principale',
      description: 'Armoire de stockage du matériel secouriste',
      unite_locale_id: ul.id,
    },
  });

  const [tirAirway, tirCirculation, tirDivers] = await Promise.all([
    prisma.tiroir.create({ data: { nom: 'Airway', description: 'Matériel voies aériennes', armoire_id: armoire.id } }),
    prisma.tiroir.create({ data: { nom: 'Circulation', description: 'Matériel circulation et hémostase', armoire_id: armoire.id } }),
    prisma.tiroir.create({ data: { nom: 'Divers', description: 'Matériel divers et protection', armoire_id: armoire.id } }),
  ]);
  console.log('✅ Armoire + 3 tiroirs créés');

  // ─── STOCKS TIROIRS ────────────────────────────────────────────────────────
  // Masque dans Airway — 2 lots avec dates différentes (dont 1 périmé)
  await prisma.stockTiroir.create({
    data: {
      article_id: masque.id,
      tiroir_id: tirAirway.id,
      unite_locale_id: ul.id,
      quantite_actuelle: 3,
      lots: [
        { label: 'LOT-MASK-2023A', date_peremption: expired.toISOString().split('T')[0], quantite: 1 },
        { label: 'LOT-MASK-2024B', date_peremption: inThreeMonths.toISOString().split('T')[0], quantite: 2 },
      ],
    },
  });

  // Gants dans Divers — 2 lots dont 1 expire dans 5 jours
  await prisma.stockTiroir.create({
    data: {
      article_id: gants.id,
      tiroir_id: tirDivers.id,
      unite_locale_id: ul.id,
      quantite_actuelle: 14,
      lots: [
        { label: 'LOT-GLOVES-A', date_peremption: inFiveDays.toISOString().split('T')[0], quantite: 4 },
        { label: 'LOT-GLOVES-B', date_peremption: inTwentyDays.toISOString().split('T')[0], quantite: 10 },
      ],
    },
  });

  // Seringue dans Circulation — 2 lots OK
  await prisma.stockTiroir.create({
    data: {
      article_id: seringue.id,
      tiroir_id: tirCirculation.id,
      unite_locale_id: ul.id,
      quantite_actuelle: 6,
      lots: [
        { label: 'LOT-SER-2024A', date_peremption: inThreeMonths.toISOString().split('T')[0], quantite: 3 },
        { label: 'LOT-SER-2025B', date_peremption: inTwoYears.toISOString().split('T')[0], quantite: 3 },
      ],
    },
  });

  // Compresse dans Divers — non périmable, 1 lot
  await prisma.stockTiroir.create({
    data: {
      article_id: compresse.id,
      tiroir_id: tirDivers.id,
      unite_locale_id: ul.id,
      quantite_actuelle: 25,
      lots: [
        { label: 'LOT-COMP-A', date_peremption: null, quantite: 25 },
      ],
    },
  });

  // Couverture dans Divers — stock bas (2 < min 3)
  await prisma.stockTiroir.create({
    data: {
      article_id: couverture.id,
      tiroir_id: tirDivers.id,
      unite_locale_id: ul.id,
      quantite_actuelle: 2,
      lots: [
        { label: 'LOT-SURV-A', date_peremption: null, quantite: 2 },
      ],
    },
  });

  // Électrode DAE dans Circulation
  await prisma.stockTiroir.create({
    data: {
      article_id: defibrillateur.id,
      tiroir_id: tirCirculation.id,
      unite_locale_id: ul.id,
      quantite_actuelle: 2,
      lots: [
        { label: 'LOT-DAE-2024A', date_peremption: inTwoYears.toISOString().split('T')[0], quantite: 2 },
      ],
    },
  });
  console.log('✅ Stocks tiroirs créés');

  // ─── LOT SAC DPS ───────────────────────────────────────────────────────────
  const lot = await prisma.lot.create({
    data: {
      nom: 'SAC-DPS-01',
      unite_locale_id: ul.id,
    },
  });

  const [pochAirway, pochPlaies] = await Promise.all([
    prisma.pochette.create({ data: { nom: 'Airway', lot_id: lot.id } }),
    prisma.pochette.create({ data: { nom: 'Plaies', lot_id: lot.id } }),
  ]);

  // Stock pochette Airway
  await prisma.stockPochette.create({
    data: {
      article_id: masque.id,
      pochette_id: pochAirway.id,
      unite_locale_id: ul.id,
      quantite_actuelle: 2,
      lots: [
        { label: 'LOT-MASK-SAC-A', date_peremption: inThreeMonths.toISOString().split('T')[0], quantite: 2 },
      ],
    },
  });

  await prisma.stockPochette.create({
    data: {
      article_id: gants.id,
      pochette_id: pochAirway.id,
      unite_locale_id: ul.id,
      quantite_actuelle: 6,
      lots: [
        { label: 'LOT-GL-SAC-A', date_peremption: inTwentyDays.toISOString().split('T')[0], quantite: 6 },
      ],
    },
  });

  // Stock pochette Plaies
  await prisma.stockPochette.create({
    data: {
      article_id: compresse.id,
      pochette_id: pochPlaies.id,
      unite_locale_id: ul.id,
      quantite_actuelle: 10,
      lots: [
        { label: 'LOT-COMP-SAC-A', date_peremption: null, quantite: 10 },
      ],
    },
  });
  console.log(`✅ Lot "${lot.nom}" + 2 pochettes + stocks créés`);

  // ─── UNIFORMES ─────────────────────────────────────────────────────────────
  const [polo1, polo2, veste1, veste2, polo3] = await Promise.all([
    prisma.uniforme.create({ data: { nom: 'Polo CRF', taille: 'M', etat: 'BON', statut: 'DISPONIBLE', unite_locale_id: ul.id } }),
    prisma.uniforme.create({ data: { nom: 'Polo CRF', taille: 'L', etat: 'NEUF', statut: 'DISPONIBLE', unite_locale_id: ul.id } }),
    prisma.uniforme.create({ data: { nom: 'Veste softshell', taille: 'S', etat: 'BON', statut: 'DISPONIBLE', unite_locale_id: ul.id } }),
    prisma.uniforme.create({ data: { nom: 'Polo CRF', taille: 'XL', etat: 'BON', statut: 'PRETE', unite_locale_id: ul.id } }),
    prisma.uniforme.create({ data: { nom: 'Veste softshell', taille: 'M', etat: 'NEUF', statut: 'ATTRIBUE', unite_locale_id: ul.id } }),
  ]);
  console.log('✅ 5 uniformes créés');

  // ─── MOUVEMENTS UNIFORMES ──────────────────────────────────────────────────
  const dateRetourPrevue = new Date(today);
  dateRetourPrevue.setDate(today.getDate() + 14);

  // Prêt de veste4 (PRETE) à Marc
  await prisma.mouvementUniforme.create({
    data: {
      uniforme_id: veste2.id,
      type: 'PRET',
      beneficiaire_prenom: 'Marc',
      beneficiaire_qualification: 'PSE1',
      date_retour_prevue: dateRetourPrevue,
    },
  });

  // Attribution définitive de polo3 (ATTRIBUE) à Julie
  await prisma.mouvementUniforme.create({
    data: {
      uniforme_id: polo3.id,
      type: 'ATTRIBUTION',
      beneficiaire_prenom: 'Julie',
      beneficiaire_qualification: 'PSE2',
      date_retour_prevue: null, // Attribution définitive
    },
  });
  console.log('✅ 2 mouvements uniformes créés');

  // ─── ALERTES ACTIVES ───────────────────────────────────────────────────────
  await prisma.alerte.create({
    data: {
      type: 'PEREMPTION',
      message: `Article "Gants latex M" — lot LOT-GLOVES-A périme dans 5 jours (${inFiveDays.toISOString().split('T')[0]})`,
      date_echeance: inFiveDays,
      statut: 'ACTIVE',
      article_id: gants.id,
      unite_locale_id: ul.id,
    },
  });

  await prisma.alerte.create({
    data: {
      type: 'STOCK_BAS',
      message: `Article "Couverture de survie" — stock insuffisant : 2 unités (minimum : 3)`,
      statut: 'ACTIVE',
      article_id: couverture.id,
      unite_locale_id: ul.id,
    },
  });
  console.log('✅ 2 alertes actives créées');

  console.log('\n✨ Seed terminé avec succès !');
  console.log('   Admin     : login=admin        / mdp=admin123');
  console.log('   Contrôleur : login=jean.dupont  / mdp=secours123');
  console.log(`   QR lot SAC-DPS-01 : token=${lot.qr_code_token}`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
