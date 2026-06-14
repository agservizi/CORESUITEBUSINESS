-- AlterTable
ALTER TABLE "PostaMessage" ADD COLUMN IF NOT EXISTS "receiptPdfUrl" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PostaMessage_clientId_idx" ON "PostaMessage"("clientId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PostaMessage_clientId_fkey'
  ) THEN
    ALTER TABLE "PostaMessage"
      ADD CONSTRAINT "PostaMessage_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
