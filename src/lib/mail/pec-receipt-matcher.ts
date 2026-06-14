import { prisma } from "@/lib/prisma";

type ReceiptKind = "accettazione" | "consegna";

function detectReceiptKind(subject: string, body: string): ReceiptKind | null {
  const text = `${subject} ${body}`.toLowerCase();
  if (
    text.includes("accettazione") ||
    text.includes("accepted") ||
    text.includes("presa in carico")
  ) {
    return "accettazione";
  }
  if (
    text.includes("consegna") ||
    text.includes("delivered") ||
    text.includes("avvenuta consegna")
  ) {
    return "consegna";
  }
  return null;
}

export async function matchPecReceiptsFromInbox(): Promise<{ updated: number; messageIds: string[] }> {
  const inbox = await prisma.pecInboxMessage.findMany({
    orderBy: { receivedAt: "desc" },
    take: 200,
  });

  const pending = await prisma.postaMessage.findMany({
    where: {
      channel: "pec",
      status: "sent",
      OR: [{ pecReceiptAccettazioneAt: null }, { pecReceiptConsegnaAt: null }],
    },
  });

  if (!pending.length) return { updated: 0, messageIds: [] };

  const messageIds: string[] = [];

  for (const msg of pending) {
    if (!msg.messageIdHeader) continue;
    const normalizedId = msg.messageIdHeader.replace(/^<|>$/g, "");

    for (const row of inbox) {
      const subject = row.subject || "";
      const body = row.body || row.snippet || "";
      const haystack = `${subject}\n${body}`.toLowerCase();
      if (!haystack.includes(normalizedId.toLowerCase())) continue;

      const kind = detectReceiptKind(subject, body);
      if (!kind) continue;

      const receivedAt = row.receivedAt || row.createdAt;
      const data: Record<string, Date> = {};

      if (kind === "accettazione" && !msg.pecReceiptAccettazioneAt) {
        data.pecReceiptAccettazioneAt = receivedAt;
      }
      if (kind === "consegna" && !msg.pecReceiptConsegnaAt) {
        data.pecReceiptConsegnaAt = receivedAt;
      }

      if (Object.keys(data).length === 0) continue;

      await prisma.postaMessage.update({
        where: { id: msg.id },
        data,
      });
      messageIds.push(msg.id);
      break;
    }
  }

  return { updated: messageIds.length, messageIds };
}
