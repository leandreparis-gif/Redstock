-- CreateEnum
CREATE TYPE "Qualification" AS ENUM ('PSE1', 'PSE2', 'CI', 'AUTRE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CONTROLEUR');

-- CreateEnum
CREATE TYPE "TypeControle" AS ENUM ('TIROIR', 'LOT');

-- CreateEnum
CREATE TYPE "StatutControle" AS ENUM ('CONFORME', 'NON_CONFORME', 'PARTIEL');

-- CreateEnum
CREATE TYPE "TypeAlerte" AS ENUM ('PEREMPTION', 'STOCK_BAS');

-- CreateEnum
CREATE TYPE "StatutAlerte" AS ENUM ('ACTIVE', 'RESOLUE');

-- CreateEnum
CREATE TYPE "TailleUniforme" AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL');

-- CreateEnum
CREATE TYPE "EtatUniforme" AS ENUM ('NEUF', 'BON', 'USE');

-- CreateEnum
CREATE TYPE "StatutUniforme" AS ENUM ('DISPONIBLE', 'PRETE', 'ATTRIBUE');

-- CreateEnum
CREATE TYPE "TypeMouvement" AS ENUM ('PRET', 'ATTRIBUTION', 'RETOUR');

-- CreateTable
CREATE TABLE "UniteLocale" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UniteLocale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "qualification" "Qualification" NOT NULL,
    "role" "Role" NOT NULL,
    "login" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unite_locale_id" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "quantite_min" INTEGER NOT NULL DEFAULT 1,
    "categorie" TEXT NOT NULL,
    "est_perimable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unite_locale_id" TEXT NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Armoire" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unite_locale_id" TEXT NOT NULL,

    CONSTRAINT "Armoire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tiroir" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "armoire_id" TEXT NOT NULL,

    CONSTRAINT "Tiroir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTiroir" (
    "id" TEXT NOT NULL,
    "quantite_actuelle" INTEGER NOT NULL DEFAULT 0,
    "lots" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "article_id" TEXT NOT NULL,
    "tiroir_id" TEXT NOT NULL,
    "unite_locale_id" TEXT NOT NULL,

    CONSTRAINT "StockTiroir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "qr_code_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unite_locale_id" TEXT NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pochette" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lot_id" TEXT NOT NULL,

    CONSTRAINT "Pochette_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPochette" (
    "id" TEXT NOT NULL,
    "quantite_actuelle" INTEGER NOT NULL DEFAULT 0,
    "lots" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "article_id" TEXT NOT NULL,
    "pochette_id" TEXT NOT NULL,
    "unite_locale_id" TEXT NOT NULL,

    CONSTRAINT "StockPochette_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Controle" (
    "id" TEXT NOT NULL,
    "type" "TypeControle" NOT NULL,
    "reference_id" TEXT NOT NULL,
    "controleur_prenom" TEXT NOT NULL,
    "controleur_qualification" "Qualification" NOT NULL,
    "date_controle" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutControle" NOT NULL,
    "remarques" TEXT,
    "signature_data" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unite_locale_id" TEXT NOT NULL,

    CONSTRAINT "Controle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerte" (
    "id" TEXT NOT NULL,
    "type" "TypeAlerte" NOT NULL,
    "message" TEXT NOT NULL,
    "date_echeance" TIMESTAMP(3),
    "statut" "StatutAlerte" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "article_id" TEXT,
    "unite_locale_id" TEXT NOT NULL,

    CONSTRAINT "Alerte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Uniforme" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "taille" "TailleUniforme" NOT NULL,
    "etat" "EtatUniforme" NOT NULL,
    "statut" "StatutUniforme" NOT NULL DEFAULT 'DISPONIBLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unite_locale_id" TEXT NOT NULL,

    CONSTRAINT "Uniforme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MouvementUniforme" (
    "id" TEXT NOT NULL,
    "type" "TypeMouvement" NOT NULL,
    "beneficiaire_prenom" TEXT NOT NULL,
    "beneficiaire_qualification" "Qualification" NOT NULL,
    "date_mouvement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_retour_prevue" TIMESTAMP(3),
    "date_retour_effective" TIMESTAMP(3),
    "remarques" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uniforme_id" TEXT NOT NULL,

    CONSTRAINT "MouvementUniforme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "StockTiroir_article_id_tiroir_id_key" ON "StockTiroir"("article_id", "tiroir_id");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_qr_code_token_key" ON "Lot"("qr_code_token");

-- CreateIndex
CREATE UNIQUE INDEX "StockPochette_article_id_pochette_id_key" ON "StockPochette"("article_id", "pochette_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_unite_locale_id_fkey" FOREIGN KEY ("unite_locale_id") REFERENCES "UniteLocale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_unite_locale_id_fkey" FOREIGN KEY ("unite_locale_id") REFERENCES "UniteLocale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Armoire" ADD CONSTRAINT "Armoire_unite_locale_id_fkey" FOREIGN KEY ("unite_locale_id") REFERENCES "UniteLocale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tiroir" ADD CONSTRAINT "Tiroir_armoire_id_fkey" FOREIGN KEY ("armoire_id") REFERENCES "Armoire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTiroir" ADD CONSTRAINT "StockTiroir_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTiroir" ADD CONSTRAINT "StockTiroir_tiroir_id_fkey" FOREIGN KEY ("tiroir_id") REFERENCES "Tiroir"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTiroir" ADD CONSTRAINT "StockTiroir_unite_locale_id_fkey" FOREIGN KEY ("unite_locale_id") REFERENCES "UniteLocale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_unite_locale_id_fkey" FOREIGN KEY ("unite_locale_id") REFERENCES "UniteLocale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pochette" ADD CONSTRAINT "Pochette_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPochette" ADD CONSTRAINT "StockPochette_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPochette" ADD CONSTRAINT "StockPochette_pochette_id_fkey" FOREIGN KEY ("pochette_id") REFERENCES "Pochette"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPochette" ADD CONSTRAINT "StockPochette_unite_locale_id_fkey" FOREIGN KEY ("unite_locale_id") REFERENCES "UniteLocale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Controle" ADD CONSTRAINT "Controle_unite_locale_id_fkey" FOREIGN KEY ("unite_locale_id") REFERENCES "UniteLocale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_unite_locale_id_fkey" FOREIGN KEY ("unite_locale_id") REFERENCES "UniteLocale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Uniforme" ADD CONSTRAINT "Uniforme_unite_locale_id_fkey" FOREIGN KEY ("unite_locale_id") REFERENCES "UniteLocale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementUniforme" ADD CONSTRAINT "MouvementUniforme_uniforme_id_fkey" FOREIGN KEY ("uniforme_id") REFERENCES "Uniforme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
