-- CreateEnum
CREATE TYPE "WebQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "WebQuote" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "authorId" TEXT,
    "status" "WebQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "projectType" TEXT NOT NULL DEFAULT 'website',
    "validUntil" TIMESTAMP(3),
    "introduction" TEXT,
    "scopeNotes" TEXT,
    "terms" TEXT,
    "paymentPlan" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 22,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "templateStyle" TEXT NOT NULL DEFAULT 'premium',
    "accentColor" TEXT NOT NULL DEFAULT '#6366f1',
    "showBranding" BOOLEAN NOT NULL DEFAULT true,
    "includeTimeline" BOOLEAN NOT NULL DEFAULT true,
    "includePackages" BOOLEAN NOT NULL DEFAULT false,
    "packages" JSONB NOT NULL DEFAULT '[]',
    "milestones" JSONB NOT NULL DEFAULT '[]',
    "pdfGeneratedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebQuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WebQuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebQuote_number_key" ON "WebQuote"("number");
CREATE INDEX "WebQuote_clientId_idx" ON "WebQuote"("clientId");
CREATE INDEX "WebQuote_status_idx" ON "WebQuote"("status");
CREATE INDEX "WebQuote_createdAt_idx" ON "WebQuote"("createdAt");
CREATE INDEX "WebQuoteItem_quoteId_idx" ON "WebQuoteItem"("quoteId");

-- AddForeignKey
ALTER TABLE "WebQuote" ADD CONSTRAINT "WebQuote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebQuote" ADD CONSTRAINT "WebQuote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WebQuoteItem" ADD CONSTRAINT "WebQuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "WebQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
