-- Migrazione contratti opportunity (allineamento legacy PHP)
DELETE FROM "Opportunity";

-- CreateEnum
CREATE TYPE "OpportunityCategory" AS ENUM ('TELEFONIA', 'LUCE', 'GAS');

-- CreateEnum
CREATE TYPE "OpportunityPaymentMethod" AS ENUM ('IBAN', 'BOLLETTINO');

-- DropForeignKey
ALTER TABLE "Opportunity" DROP CONSTRAINT IF EXISTS "Opportunity_ownerId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Opportunity_ownerId_idx";
DROP INDEX IF EXISTS "Opportunity_status_idx";

-- AlterTable
ALTER TABLE "Opportunity" DROP COLUMN IF EXISTS "closedAt",
DROP COLUMN IF EXISTS "commission",
DROP COLUMN IF EXISTS "notes",
DROP COLUMN IF EXISTS "ownerId",
DROP COLUMN IF EXISTS "status",
DROP COLUMN IF EXISTS "title",
DROP COLUMN IF EXISTS "value",
ADD COLUMN IF NOT EXISTS "additionalNotes" TEXT,
ADD COLUMN IF NOT EXISTS "adminNotes" TEXT,
ADD COLUMN IF NOT EXISTS "category" "OpportunityCategory" NOT NULL DEFAULT 'TELEFONIA',
ADD COLUMN IF NOT EXISTS "clientCode" TEXT,
ADD COLUMN IF NOT EXISTS "code" TEXT NOT NULL DEFAULT 'TEMP000000',
ADD COLUMN IF NOT EXISTS "collaboratorId" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "commissionAmount" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "contractCode" TEXT,
ADD COLUMN IF NOT EXISTS "customerAddress" TEXT,
ADD COLUMN IF NOT EXISTS "customerBirthDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "customerBirthPlace" TEXT,
ADD COLUMN IF NOT EXISTS "customerCity" TEXT,
ADD COLUMN IF NOT EXISTS "customerEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "customerFirstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "customerLastName" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "customerPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "customerPostalCode" TEXT,
ADD COLUMN IF NOT EXISTS "customerProvince" TEXT,
ADD COLUMN IF NOT EXISTS "customerTaxCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "documentExpiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "documentIssuedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "documentIssuedBy" TEXT,
ADD COLUMN IF NOT EXISTS "documentNumber" TEXT,
ADD COLUMN IF NOT EXISTS "documentType" TEXT,
ADD COLUMN IF NOT EXISTS "gasPdr" TEXT,
ADD COLUMN IF NOT EXISTS "lastStatusChange" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lucePod" TEXT,
ADD COLUMN IF NOT EXISTS "managedById" TEXT,
ADD COLUMN IF NOT EXISTS "metadata" JSONB,
ADD COLUMN IF NOT EXISTS "offerId" TEXT,
ADD COLUMN IF NOT EXISTS "offerLabel" TEXT,
ADD COLUMN IF NOT EXISTS "paymentHolderFirstName" TEXT,
ADD COLUMN IF NOT EXISTS "paymentHolderIsCustomer" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "paymentHolderLastName" TEXT,
ADD COLUMN IF NOT EXISTS "paymentHolderTaxCode" TEXT,
ADD COLUMN IF NOT EXISTS "paymentIban" TEXT,
ADD COLUMN IF NOT EXISTS "paymentMethod" "OpportunityPaymentMethod" NOT NULL DEFAULT 'IBAN',
ADD COLUMN IF NOT EXISTS "providerId" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "providerLabel" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "statusCode" TEXT NOT NULL DEFAULT 'in_verifica',
ADD COLUMN IF NOT EXISTS "telefoniaCurrentOperator" TEXT,
ADD COLUMN IF NOT EXISTS "telefoniaLineNumber" TEXT;

ALTER TABLE "Opportunity" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Opportunity" ALTER COLUMN "code" DROP DEFAULT;
ALTER TABLE "Opportunity" ALTER COLUMN "collaboratorId" DROP DEFAULT;
ALTER TABLE "Opportunity" ALTER COLUMN "customerEmail" DROP DEFAULT;
ALTER TABLE "Opportunity" ALTER COLUMN "customerFirstName" DROP DEFAULT;
ALTER TABLE "Opportunity" ALTER COLUMN "customerLastName" DROP DEFAULT;
ALTER TABLE "Opportunity" ALTER COLUMN "customerPhone" DROP DEFAULT;
ALTER TABLE "Opportunity" ALTER COLUMN "customerTaxCode" DROP DEFAULT;
ALTER TABLE "Opportunity" ALTER COLUMN "providerId" DROP DEFAULT;
ALTER TABLE "Opportunity" ALTER COLUMN "providerLabel" DROP DEFAULT;

-- DropEnum
DROP TYPE IF EXISTS "OpportunityStatus";

-- CreateTable
CREATE TABLE IF NOT EXISTS "OpportunityStatusDef" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "isCore" BOOLEAN NOT NULL DEFAULT true,
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OpportunityStatusDef_pkey" PRIMARY KEY ("code")
);

CREATE TABLE IF NOT EXISTS "OpportunityProvider" (
    "id" TEXT NOT NULL,
    "category" "OpportunityCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "defaultCommission" DECIMAL(10,2),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OpportunityProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpportunityOffer" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "commission" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OpportunityOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpportunityFile" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpportunityFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpportunityDraft" (
    "id" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OpportunityDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OpportunityProvider_category_slug_key" ON "OpportunityProvider"("category", "slug");
CREATE INDEX IF NOT EXISTS "OpportunityProvider_category_idx" ON "OpportunityProvider"("category");
CREATE UNIQUE INDEX IF NOT EXISTS "OpportunityOffer_providerId_slug_key" ON "OpportunityOffer"("providerId", "slug");
CREATE INDEX IF NOT EXISTS "OpportunityOffer_providerId_idx" ON "OpportunityOffer"("providerId");
CREATE INDEX IF NOT EXISTS "OpportunityFile_opportunityId_idx" ON "OpportunityFile"("opportunityId");
CREATE UNIQUE INDEX IF NOT EXISTS "OpportunityDraft_collaboratorId_key" ON "OpportunityDraft"("collaboratorId");
CREATE UNIQUE INDEX IF NOT EXISTS "Opportunity_code_key" ON "Opportunity"("code");
CREATE INDEX IF NOT EXISTS "Opportunity_collaboratorId_idx" ON "Opportunity"("collaboratorId");
CREATE INDEX IF NOT EXISTS "Opportunity_statusCode_idx" ON "Opportunity"("statusCode");
CREATE INDEX IF NOT EXISTS "Opportunity_category_idx" ON "Opportunity"("category");
CREATE INDEX IF NOT EXISTS "Opportunity_customerEmail_idx" ON "Opportunity"("customerEmail");
CREATE INDEX IF NOT EXISTS "Opportunity_customerTaxCode_idx" ON "Opportunity"("customerTaxCode");

DO $$ BEGIN
  ALTER TABLE "OpportunityOffer" ADD CONSTRAINT "OpportunityOffer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "OpportunityProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_statusCode_fkey" FOREIGN KEY ("statusCode") REFERENCES "OpportunityStatusDef"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "OpportunityProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "OpportunityOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "OpportunityFile" ADD CONSTRAINT "OpportunityFile_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
