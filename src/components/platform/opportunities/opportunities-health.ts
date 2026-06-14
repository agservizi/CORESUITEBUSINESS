import type { OpportunityRow } from "./opportunities-utils";

export interface OpportunityHealth {
  score: number;
  label: string;
  color: string;
}

export interface DocumentCheckItem {
  id: string;
  label: string;
  done: boolean;
  required: boolean;
}

export interface TimelineEntry {
  statusCode: string;
  label?: string;
  at: string;
  userId?: string;
}

export function computeOpportunityHealth(row: OpportunityRow): OpportunityHealth {
  if (row.statusCode === "annullato") {
    return { score: 0, label: "Annullato", color: "#ef4444" };
  }
  if (row.statusCode === "attivato") {
    return { score: 100, label: "Attivato", color: "#10b981" };
  }

  let score = 88;
  const updatedAt = row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now();
  const daysIdle = Math.floor((Date.now() - updatedAt) / 86400000);

  if (daysIdle > 14) score -= 35;
  else if (daysIdle > 7) score -= 18;
  else if (daysIdle > 3) score -= 8;

  if (!row.customerPhone || !row.customerEmail) score -= 10;
  if (!row.documentNumber) score -= 12;
  if (!row.paymentIban) score -= 8;

  if (row.category === "TELEFONIA" && !row.telefoniaLineNumber && row.statusCode !== "in_verifica") {
    score -= 15;
  }
  if (row.category === "LUCE" && !row.lucePod) score -= 20;
  if (row.category === "GAS" && !row.gasPdr) score -= 20;

  if (row.statusCode === "in_firma_otp" && !row.contractCode) score -= 10;

  score = Math.max(5, Math.min(100, score));

  if (score >= 75) return { score, label: "Solido", color: "#10b981" };
  if (score >= 50) return { score, label: "Da monitorare", color: "#f59e0b" };
  return { score, label: "Critico", color: "#ef4444" };
}

export function getDocumentChecklist(row: OpportunityRow): DocumentCheckItem[] {
  const items: DocumentCheckItem[] = [
    { id: "customer", label: "Dati cliente completi", done: Boolean(row.customerFirstName && row.customerLastName && row.customerTaxCode), required: true },
    { id: "contact", label: "Telefono ed email", done: Boolean(row.customerPhone && row.customerEmail), required: true },
    { id: "address", label: "Indirizzo fornitura", done: Boolean(row.customerAddress && row.customerCity), required: false },
    { id: "document", label: "Documento identità", done: Boolean(row.documentNumber), required: true },
    { id: "payment", label: "IBAN / pagamento", done: Boolean(row.paymentIban), required: true },
  ];

  if (row.category === "TELEFONIA") {
    items.push({
      id: "line",
      label: "Linea / operatore",
      done: Boolean(row.telefoniaLineNumber || row.telefoniaCurrentOperator),
      required: true,
    });
  }
  if (row.category === "LUCE") {
    items.push({ id: "pod", label: "POD luce", done: Boolean(row.lucePod), required: true });
  }
  if (row.category === "GAS") {
    items.push({ id: "pdr", label: "PDR gas", done: Boolean(row.gasPdr), required: true });
  }

  const uploaded = (row.files?.length ?? 0) > 0;
  items.push({ id: "files", label: "Allegati caricati", done: uploaded, required: false });

  return items;
}

export function documentCompletionPct(items: DocumentCheckItem[]) {
  const required = items.filter((i) => i.required);
  if (!required.length) return 100;
  const done = required.filter((i) => i.done).length;
  return Math.round((done / required.length) * 100);
}

export function parseStatusTimeline(row: OpportunityRow): TimelineEntry[] {
  const meta = row.metadata as { statusHistory?: TimelineEntry[] } | null | undefined;
  if (meta?.statusHistory?.length) {
    return [...meta.statusHistory].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }

  const entries: TimelineEntry[] = [];
  if (row.createdAt) {
    entries.push({ statusCode: "in_verifica", label: "Creazione", at: row.createdAt });
  }
  if (row.lastStatusChange && row.statusCode !== "in_verifica") {
    entries.push({ statusCode: row.statusCode, at: row.lastStatusChange });
  }
  return entries;
}
