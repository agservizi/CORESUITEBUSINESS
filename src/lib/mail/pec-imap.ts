import { ImapFlow } from "imapflow";
import { prisma } from "@/lib/prisma";

export function isPecImapConfigured(): boolean {
  if (process.env.PEC_SYNC_ENABLED !== "true") return false;
  const host = process.env.PEC_IMAP_HOST?.trim();
  const user = process.env.PEC_IMAP_USERNAME?.trim();
  const pass = process.env.PEC_IMAP_PASSWORD?.trim();
  return Boolean(host && user && pass);
}

function createImapClient() {
  const host = process.env.PEC_IMAP_HOST!.trim();
  const port = Number(process.env.PEC_IMAP_PORT?.trim() || 993);
  const user = process.env.PEC_IMAP_USERNAME!.trim();
  const pass = process.env.PEC_IMAP_PASSWORD!.trim();
  const encryption = (process.env.PEC_IMAP_ENCRYPTION || "ssl").toLowerCase();

  return new ImapFlow({
    host,
    port,
    secure: encryption === "ssl" || port === 993,
    auth: { user, pass },
    logger: false,
  });
}

function extractSnippet(source: Buffer | undefined): { snippet: string; body: string } {
  if (!source?.length) return { snippet: "", body: "" };
  const raw = source.toString("utf8");
  const plainMatch = raw.match(/Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(?:\r\n--|\r\n\r\nContent-Type:|$)/i);
  const body = (plainMatch?.[1] || raw).replace(/=\r\n/g, "").slice(0, 50000);
  const cleaned = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { snippet: cleaned.slice(0, 240), body: cleaned.slice(0, 10000) };
}

export async function syncPecInboxFromServer(): Promise<{ imported: number; total: number; mode: "imap" | "disabled" }> {
  if (!isPecImapConfigured()) {
    const total = await prisma.pecInboxMessage.count();
    return { imported: 0, total, mode: "disabled" };
  }

  const folder = process.env.PEC_IMAP_FOLDER?.trim() || "INBOX";
  const limit = Math.min(Number(process.env.PEC_SYNC_LIMIT || 50), 100);
  const client = createImapClient();
  let imported = 0;

  await client.connect();
  try {
    const lock = await client.getMailboxLock(folder);
    try {
      const status = await client.status(folder, { messages: true });
      const totalMessages = status.messages ?? 0;
      if (totalMessages === 0) {
        return { imported: 0, total: await prisma.pecInboxMessage.count(), mode: "imap" };
      }

      const startSeq = Math.max(1, totalMessages - limit + 1);
      const range = `${startSeq}:*`;

      for await (const message of client.fetch(range, { envelope: true, source: true, uid: true })) {
        const uid = String(message.uid);
        const existing = await prisma.pecInboxMessage.findUnique({
          where: { uid_mailbox: { uid, mailbox: folder } },
        });
        if (existing) continue;

        const sender = message.envelope?.from?.[0]?.address || message.envelope?.sender?.[0]?.address || "";
        const subject = message.envelope?.subject || "(senza oggetto)";
        const receivedAt = message.envelope?.date || new Date();
        const { snippet, body } = extractSnippet(message.source);

        await prisma.pecInboxMessage.create({
          data: { uid, mailbox: folder, sender, subject, receivedAt, snippet, body },
        });
        imported++;
      }

      return { imported, total: await prisma.pecInboxMessage.count(), mode: "imap" as const };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}
