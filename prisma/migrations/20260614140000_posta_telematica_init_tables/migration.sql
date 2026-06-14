-- Posta telematica core tables (idempotent — safe if already present via db push)

CREATE TABLE IF NOT EXISTS "PecMailbox" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "provider" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Attiva',
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PecMailbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PecMailbox_clientId_idx" ON "PecMailbox"("clientId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PecMailbox_clientId_fkey'
  ) THEN
    ALTER TABLE "PecMailbox"
      ADD CONSTRAINT "PecMailbox_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PostaMessage" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "messageIdHeader" TEXT,
    "pecReceiptInvioAt" TIMESTAMP(3),
    "pecReceiptAccettazioneAt" TIMESTAMP(3),
    "pecReceiptConsegnaAt" TIMESTAMP(3),
    "receiptPdfUrl" TEXT,
    "clientId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PostaMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PostaMessage_status_idx" ON "PostaMessage"("status");
CREATE INDEX IF NOT EXISTS "PostaMessage_createdAt_idx" ON "PostaMessage"("createdAt");
CREATE INDEX IF NOT EXISTS "PostaMessage_clientId_idx" ON "PostaMessage"("clientId");

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

CREATE TABLE IF NOT EXISTS "PostaMessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostaMessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PostaMessageAttachment_messageId_idx" ON "PostaMessageAttachment"("messageId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PostaMessageAttachment_messageId_fkey'
  ) THEN
    ALTER TABLE "PostaMessageAttachment"
      ADD CONSTRAINT "PostaMessageAttachment_messageId_fkey"
      FOREIGN KEY ("messageId") REFERENCES "PostaMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PecInboxMessage" (
    "id" TEXT NOT NULL,
    "uid" TEXT,
    "mailbox" TEXT NOT NULL DEFAULT 'INBOX',
    "sender" TEXT,
    "subject" TEXT,
    "receivedAt" TIMESTAMP(3),
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "snippet" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PecInboxMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PecInboxMessage_uid_mailbox_key" ON "PecInboxMessage"("uid", "mailbox");
CREATE INDEX IF NOT EXISTS "PecInboxMessage_receivedAt_idx" ON "PecInboxMessage"("receivedAt");
CREATE INDEX IF NOT EXISTS "PecInboxMessage_seen_idx" ON "PecInboxMessage"("seen");
