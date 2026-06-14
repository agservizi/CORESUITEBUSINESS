-- Fix: enum may already exist from partial migration
DO $$ BEGIN
  CREATE TYPE "CashRegisterSessionStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CashRegisterSession" (
    "id" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "status" "CashRegisterSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openingAmount" DECIMAL(10,2) NOT NULL,
    "closingAmount" DECIMAL(10,2),
    "expectedClosingAmount" DECIMAL(10,2),
    "variance" DECIMAL(10,2),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openedById" TEXT NOT NULL,
    "closedById" TEXT,
    "openingNotes" TEXT,
    "closingNotes" TEXT,
    "journal" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashRegisterSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CashRegisterSession_businessDate_key" ON "CashRegisterSession"("businessDate");
CREATE INDEX IF NOT EXISTS "CashRegisterSession_status_idx" ON "CashRegisterSession"("status");
CREATE INDEX IF NOT EXISTS "CashRegisterSession_businessDate_idx" ON "CashRegisterSession"("businessDate");

DO $$ BEGIN
  ALTER TABLE "CashRegisterSession" ADD CONSTRAINT "CashRegisterSession_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CashRegisterSession" ADD CONSTRAINT "CashRegisterSession_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
