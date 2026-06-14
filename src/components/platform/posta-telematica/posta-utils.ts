export const POSTA_GRADIENT = "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)";

export type PostaMessageRow = {
  id: string;
  channel: string;
  recipientEmail: string;
  subject: string;
  body?: string;
  status: string;
  errorMessage?: string | null;
  messageIdHeader?: string | null;
  pecReceiptInvioAt?: string | null;
  pecReceiptAccettazioneAt?: string | null;
  pecReceiptConsegnaAt?: string | null;
  receiptPdfUrl?: string | null;
  createdAt?: string;
  client?: { id?: string; name?: string; companyName?: string | null; email?: string | null } | null;
};

export type ChannelMailStatus = {
  configured?: boolean;
  fromAddress?: string | null;
  fromName?: string;
  smtpHost?: string | null;
  providerLabel?: string;
};

export type PecStatus = {
  pec?: ChannelMailStatus;
  email?: ChannelMailStatus;
  smtpConfigured?: boolean;
  imapConfigured?: boolean;
  syncEnabled?: boolean;
  fromAddress?: string | null;
  fromName?: string;
  smtpHost?: string | null;
};

export type PostaChannel = "pec" | "email";

export function channelMailStatus(status: PecStatus | null, channel: PostaChannel): ChannelMailStatus | null {
  if (!status) return null;
  return channel === "pec" ? status.pec ?? null : status.email ?? null;
}

export function statusColor(status: string): "success" | "error" | "warning" | "default" {
  if (status === "sent") return "success";
  if (status === "failed") return "error";
  if (status === "pending") return "warning";
  return "default";
}

export function statusLabel(status: string) {
  if (status === "sent") return "Inviato";
  if (status === "failed") return "Fallito";
  if (status === "pending") return "In attesa";
  return status;
}

export function clientLabel(client?: PostaMessageRow["client"]) {
  if (!client) return "—";
  return client.companyName || client.name || "—";
}

export function pecSteps(message: PostaMessageRow) {
  const isPec = message.channel === "pec";
  if (!isPec) {
    return [
      {
        key: "invio",
        label: "Invio",
        done: message.status === "sent",
        pending: message.status === "pending",
        failed: message.status === "failed",
        at: message.createdAt,
      },
    ];
  }
  return [
    {
      key: "invio",
      label: "Invio PEC",
      done: Boolean(message.pecReceiptInvioAt),
      pending: message.status === "sent" && !message.pecReceiptInvioAt,
      failed: message.status === "failed",
      at: message.pecReceiptInvioAt,
    },
    {
      key: "accettazione",
      label: "Accettazione",
      done: Boolean(message.pecReceiptAccettazioneAt),
      pending: message.status === "sent" && Boolean(message.pecReceiptInvioAt) && !message.pecReceiptAccettazioneAt,
      failed: false,
      at: message.pecReceiptAccettazioneAt,
    },
    {
      key: "consegna",
      label: "Consegna",
      done: Boolean(message.pecReceiptConsegnaAt),
      pending:
        message.status === "sent" &&
        Boolean(message.pecReceiptAccettazioneAt) &&
        !message.pecReceiptConsegnaAt,
      failed: false,
      at: message.pecReceiptConsegnaAt,
    },
  ];
}

export function pecProgress(message: PostaMessageRow) {
  const steps = pecSteps(message);
  const done = steps.filter((s) => s.done).length;
  return Math.round((done / steps.length) * 100);
}

export function pdfUrlForMessage(message: PostaMessageRow) {
  return message.receiptPdfUrl || `/api/platform/posta-telematica/messages/${message.id}/pdf`;
}

export function isReceiptInboxSubject(subject?: string | null) {
  const text = (subject || "").toLowerCase();
  return (
    text.includes("accettazione") ||
    text.includes("consegna") ||
    text.includes("avvenuta consegna") ||
    text.includes("postacert")
  );
}
