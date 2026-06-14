-- CreateTable
CREATE TABLE "ExpressScanSession" (
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "iccid" TEXT,
    "assignedNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpressScanSession_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE INDEX "ExpressScanSession_userId_idx" ON "ExpressScanSession"("userId");

-- CreateIndex
CREATE INDEX "ExpressScanSession_expiresAt_idx" ON "ExpressScanSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "ExpressScanSession" ADD CONSTRAINT "ExpressScanSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
