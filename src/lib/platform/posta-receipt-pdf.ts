import PDFDocument from "pdfkit";
import type { PostaMessage, Client } from "@/generated/prisma";
import { getChannelMailConfig } from "@/lib/mail/pec-config";
import {
  buildOnBehalfFromName,
  clientReplyToEmail,
  formatFromHeader,
} from "@/lib/mail/posta-on-behalf";

type PdfDoc = InstanceType<typeof PDFDocument>;

type PostaMessageWithClient = PostaMessage & {
  client?: Pick<Client, "id" | "name" | "email" | "companyName"> | null;
};

function fmtDate(value: Date | string | null | undefined, pending = "In attesa") {
  if (!value) return pending;
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function receiptStatus(at: Date | null | undefined, failed?: boolean) {
  if (failed) return "Non disponibile (invio fallito)";
  if (at) return "Registrata";
  return "In attesa";
}

function sectionTitle(doc: PdfDoc, title: string) {
  doc.moveDown(0.6);
  doc.fontSize(11).fillColor("#1e1b4b").text(title, { underline: true });
  doc.moveDown(0.35);
  doc.fontSize(10).fillColor("#111827");
}

function fieldRow(doc: PdfDoc, label: string, value: string) {
  doc.text(`${label}: `, { continued: true });
  doc.font("Helvetica-Bold").text(value || "—");
  doc.font("Helvetica");
}

export async function generatePostaReceiptPdf(message: PostaMessageWithClient): Promise<Buffer> {
  const isPec = message.channel === "pec";
  const isSent = message.status === "sent";
  const isFailed = message.status === "failed";
  const refCode = `PT-${message.id.slice(-8).toUpperCase()}`;
  const clientLabel = message.client?.companyName
    ? `${message.client.companyName} (${message.client.name})`
    : message.client?.name || "—";
  const channel = message.channel === "pec" ? "pec" : "email";
  const mailConfig = getChannelMailConfig(channel);
  const fromAddress = mailConfig.fromAddress || "";
  const fromName = mailConfig.fromName;
  const onBehalfFrom = message.client
    ? buildOnBehalfFromName(fromName, {
        name: message.client.name,
        companyName: message.client.companyName,
        email: message.client.email,
      })
    : fromName;
  const replyTo = message.client ? clientReplyToEmail(message.client) : undefined;
  const bodyPreview =
    message.body.length > 1200 ? `${message.body.slice(0, 1200).trim()}…` : message.body.trim();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).fillColor("#5b21b6").text("AG Servizi — Coresuite", { align: "center" });
    doc.fontSize(13).fillColor("#111827").text("Ricevuta posta telematica", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#6b7280").text(`Riferimento ${refCode}`, { align: "center" });
    doc.moveDown(1);

    sectionTitle(doc, "Cliente");
    fieldRow(doc, "Intestazione", clientLabel);
    if (message.client?.email) fieldRow(doc, "Email anagrafica", message.client.email);
    fieldRow(doc, "ID cliente", message.client?.id || "—");

    sectionTitle(doc, "Dettagli invio");
    fieldRow(doc, "Canale", isPec ? "PEC certificata" : "Email");
    fieldRow(doc, "Mittente visibile", formatFromHeader(onBehalfFrom, fromAddress || ""));
    if (replyTo) fieldRow(doc, "Reply-To (risposte al cliente)", replyTo);
    fieldRow(doc, "Destinatario", message.recipientEmail);
    fieldRow(doc, "Oggetto", message.subject);
    fieldRow(doc, "Stato invio", isSent ? "Inviato" : isFailed ? "Fallito" : message.status);
    if (message.messageIdHeader) fieldRow(doc, "Message-ID", message.messageIdHeader);
    if (message.errorMessage) fieldRow(doc, "Errore", message.errorMessage);
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor("#374151").text("Testo del messaggio:", { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(9).fillColor("#111827").text(bodyPreview || "—", { align: "justify" });

    sectionTitle(doc, isPec ? "1. Ricevuta di invio (consegna al gestore PEC)" : "Conferma di invio");
    fieldRow(doc, "Data e ora", fmtDate(isPec ? message.pecReceiptInvioAt : message.createdAt, "—"));
    fieldRow(doc, "Esito", receiptStatus(isPec ? message.pecReceiptInvioAt : isSent ? message.createdAt : null, isFailed));
    if (isPec) {
      doc.fontSize(9).fillColor("#4b5563").text(
        "Documenta l'avvenuta consegna del messaggio al sistema di posta certificata del mittente."
      );
    } else {
      doc.fontSize(9).fillColor("#4b5563").text(
        "Documenta l'invio del messaggio tramite server SMTP configurato in piattaforma."
      );
    }

    if (isPec) {
      sectionTitle(doc, "2. Ricevuta di accettazione");
      fieldRow(doc, "Data e ora", fmtDate(message.pecReceiptAccettazioneAt));
      fieldRow(doc, "Esito", receiptStatus(message.pecReceiptAccettazioneAt, isFailed));
      doc.fontSize(9).fillColor("#4b5563").text(
        "Attesta che la casella PEC del destinatario ha accettato il messaggio."
      );

      sectionTitle(doc, "3. Conferma di consegna al destinatario");
      fieldRow(doc, "Data e ora", fmtDate(message.pecReceiptConsegnaAt));
      fieldRow(doc, "Esito", receiptStatus(message.pecReceiptConsegnaAt, isFailed));
      doc.fontSize(9).fillColor("#4b5563").text(
        "Attesta la consegna effettiva del messaggio nella casella del destinatario."
      );
    }

    doc.moveDown(1.5);
    doc
      .strokeColor("#e5e7eb")
      .moveTo(48, doc.y)
      .lineTo(doc.page.width - 48, doc.y)
      .stroke();
    doc.moveDown(0.6);
    doc
      .fontSize(8)
      .fillColor("#6b7280")
      .text(
        `Documento generato automaticamente il ${new Date().toLocaleString("it-IT")}. ` +
          "Le ricevute PEC di accettazione e consegna vengono aggiornate automaticamente.",
        { align: "justify" }
      );

    doc.end();
  });
}
