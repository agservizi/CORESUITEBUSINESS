import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { isChannelMailConfigured, sendPecOrSmtpMail } from "@/lib/mail/pec-smtp";
import { syncPecInboxFromServer } from "@/lib/mail/pec-imap";
import { getPostaTelematicaChannelStatus, getChannelMailConfig } from "@/lib/mail/pec-config";
import { buildOnBehalfMailContent } from "@/lib/mail/posta-on-behalf";
import { matchPecReceiptsFromInbox } from "@/lib/mail/pec-receipt-matcher";
import { savePdfBufferAsDocument } from "@/lib/documents/save-pdf-buffer";
import { generatePostaReceiptPdf } from "@/lib/platform/posta-receipt-pdf";

const messageInclude = {
  attachments: true,
  client: { select: { id: true, name: true, email: true, companyName: true } },
} as const;

export async function listPostaMessages(limit = 100) {
  return prisma.postaMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: messageInclude,
  });
}

export async function listPecInbox(limit = 100) {
  return prisma.pecInboxMessage.findMany({
    orderBy: { receivedAt: "desc" },
    take: limit,
  });
}

export async function getPostaMessage(id: string) {
  return prisma.postaMessage.findUnique({
    where: { id },
    include: messageInclude,
  });
}

export async function attachPostaReceiptPdf(messageId: string, uploadedBy?: string) {
  const message = await getPostaMessage(messageId);
  if (!message) throw new Error("Messaggio non trovato");
  if (!message.clientId) throw new Error("Cliente non associato al messaggio");

  const buffer = await generatePostaReceiptPdf(message);
  const channelLabel = message.channel === "pec" ? "PEC" : "Email";
  const fileName = `Ricevuta-${channelLabel}-${message.id.slice(-8).toUpperCase()}.pdf`;

  const { fileUrl } = await savePdfBufferAsDocument({
    entityType: "posta-message",
    entityId: message.id,
    clientId: message.clientId,
    fileName,
    buffer,
    uploadedBy,
  });

  return prisma.postaMessage.update({
    where: { id: messageId },
    data: { receiptPdfUrl: fileUrl },
    include: messageInclude,
  });
}

export async function createPostaMessage(
  data: {
    channel: string;
    recipientEmail: string;
    subject: string;
    body: string;
    clientId: string;
    attachments?: { fileName: string; fileUrl: string; mimeType: string; fileSize?: number }[];
  },
  userId: string
) {
  if (!data.clientId?.trim()) {
    throw new Error("Seleziona un cliente prima dell'invio");
  }
  if (!data.recipientEmail?.trim()) {
    throw new Error("Indirizzo destinatario obbligatorio");
  }
  if (!data.subject?.trim()) {
    throw new Error("Oggetto obbligatorio");
  }
  if (!data.body?.trim()) {
    throw new Error("Testo del messaggio obbligatorio");
  }

  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  if (!client) throw new Error("Cliente non trovato");

  const message = await prisma.postaMessage.create({
    data: {
      channel: data.channel === "pec" ? "pec" : "email",
      recipientEmail: data.recipientEmail.trim(),
      subject: data.subject.trim(),
      body: data.body.trim(),
      clientId: data.clientId,
      createdById: userId,
      status: "pending",
      attachments: data.attachments?.length
        ? {
            create: data.attachments.map((a) => ({
              fileName: a.fileName,
              fileUrl: a.fileUrl,
              mimeType: a.mimeType,
              fileSize: a.fileSize ?? 0,
            })),
          }
        : undefined,
    },
    include: messageInclude,
  });

  return sendPostaMessage(message.id, userId);
}

export async function sendPostaMessage(messageId: string, userId?: string) {
  const message = await prisma.postaMessage.findUnique({
    where: { id: messageId },
    include: messageInclude,
  });
  if (!message) throw new Error("Messaggio non trovato");

  const channel = message.channel === "pec" ? "pec" : "email";
  const channelReady = isChannelMailConfigured(channel);

  if (!channelReady) {
    const failed = await prisma.postaMessage.update({
      where: { id: messageId },
      data: {
        status: "failed",
        errorMessage:
          channel === "pec"
            ? "Casella PEC non configurata"
            : "Casella email non configurata (Resend)",
      },
      include: messageInclude,
    });
    if (failed.clientId) {
      await attachPostaReceiptPdf(messageId, userId).catch(() => undefined);
    }
    return failed;
  }

  try {
    const mailConfig = getChannelMailConfig(channel);
    const orgFromName = mailConfig.fromName;
    let outboundSubject = message.subject;
    let outboundBody = message.body;
    let fromName = orgFromName;
    let replyTo: string | undefined =
      channel === "pec"
        ? process.env.PEC_REPLY_TO?.trim() || undefined
        : process.env.MAIL_REPLY_TO?.trim() || undefined;

    if (message.client) {
      const outbound = buildOnBehalfMailContent({
        subject: message.subject,
        body: message.body,
        client: {
          name: message.client.name,
          companyName: message.client.companyName,
          email: message.client.email,
        },
        orgFromName,
      });
      outboundSubject = outbound.subject;
      outboundBody = outbound.body;
      fromName = outbound.fromName;
      replyTo = outbound.replyTo ?? replyTo;
    }

    const result = await sendPecOrSmtpMail({
      to: message.recipientEmail,
      subject: outboundSubject,
      text: outboundBody,
      fromName,
      replyTo,
      channel,
    });

    const now = new Date();
    const sent = await prisma.postaMessage.update({
      where: { id: messageId },
      data: {
        subject: outboundSubject,
        body: outboundBody,
        status: "sent",
        messageIdHeader: result.messageId || `${randomUUID().replace(/-/g, "")}@coresuite.local`,
        errorMessage: null,
        ...(channel === "pec" ? { pecReceiptInvioAt: now } : {}),
      },
      include: messageInclude,
    });

    if (sent.clientId) {
      await attachPostaReceiptPdf(messageId, userId);
    }
    return getPostaMessage(messageId);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Errore invio";
    const failed = await prisma.postaMessage.update({
      where: { id: messageId },
      data: { status: "failed", errorMessage: errMsg },
      include: messageInclude,
    });
    if (failed.clientId) {
      await attachPostaReceiptPdf(messageId, userId).catch(() => undefined);
    }
    return failed;
  }
}

export async function generatePostaReceiptPdfBuffer(messageId: string) {
  const message = await getPostaMessage(messageId);
  if (!message) return null;
  return generatePostaReceiptPdf(message);
}

export async function markPecInboxRead(id: string) {
  return prisma.pecInboxMessage.update({ where: { id }, data: { seen: true } }  );
}

export async function syncPecInbox() {
  const syncResult = await syncPecInboxFromServer();
  const matchResult = await matchPecReceiptsFromInbox();

  for (const messageId of matchResult.messageIds) {
    await attachPostaReceiptPdf(messageId).catch(() => undefined);
  }

  return { ...syncResult, receiptsMatched: matchResult.updated };
}

export async function getPostaTelematicaStatus() {
  return getPostaTelematicaChannelStatus();
}

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function getPostaTelematicaStats() {
  const todayStart = startOfDay();
  const [
    totalSent,
    totalFailed,
    todaySent,
    pecPendingAccettazione,
    pecPendingConsegna,
    inboxUnread,
    recent,
    pecCount,
    emailCount,
  ] = await Promise.all([
    prisma.postaMessage.count({ where: { status: "sent" } }),
    prisma.postaMessage.count({ where: { status: "failed" } }),
    prisma.postaMessage.count({ where: { status: "sent", createdAt: { gte: todayStart } } }),
    prisma.postaMessage.count({
      where: {
        channel: "pec",
        status: "sent",
        pecReceiptInvioAt: { not: null },
        pecReceiptAccettazioneAt: null,
      },
    }),
    prisma.postaMessage.count({
      where: {
        channel: "pec",
        status: "sent",
        pecReceiptAccettazioneAt: { not: null },
        pecReceiptConsegnaAt: null,
      },
    }),
    prisma.pecInboxMessage.count({ where: { seen: false } }),
    prisma.postaMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: messageInclude,
    }),
    prisma.postaMessage.count({ where: { channel: "pec" } }),
    prisma.postaMessage.count({ where: { channel: "email" } }),
  ]);

  const deliveryRate =
    pecCount > 0
      ? Math.round(
          ((await prisma.postaMessage.count({
            where: { channel: "pec", status: "sent", pecReceiptConsegnaAt: { not: null } },
          })) /
            pecCount) *
            100
        )
      : 0;

  return {
    totalSent,
    totalFailed,
    todaySent,
    pecPendingAccettazione,
    pecPendingConsegna,
    inboxUnread,
    pecCount,
    emailCount,
    deliveryRate,
    recent,
    ...(await getPostaTelematicaStatus()),
  };
}
