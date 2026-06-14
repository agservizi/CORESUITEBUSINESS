import type { TicketRow } from "@/lib/platform/tickets-service";

export const TICKETS_GRADIENT = "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)";

export const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aperto",
  IN_PROGRESS: "In lavorazione",
  WAITING_CLIENT: "Attesa cliente",
  WAITING_PARTNER: "Attesa partner",
  RESOLVED: "Risolto",
  CLOSED: "Chiuso",
  ARCHIVED: "Archiviato",
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Bassa",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#64748b",
  MEDIUM: "#0ea5e9",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
};

export const CHANNEL_LABELS: Record<string, string> = {
  PORTAL: "Portale",
  EMAIL: "Email",
  PHONE: "Telefono",
  INTERNAL: "Interno",
};

export const CHANNEL_COLORS: Record<string, string> = {
  PORTAL: "#6366f1",
  EMAIL: "#0ea5e9",
  PHONE: "#10b981",
  INTERNAL: "#64748b",
};

export const TYPE_LABELS: Record<string, string> = {
  SUPPORT: "Supporto",
  TECH: "Tecnico",
  ADMIN: "Amministrativo",
  SALES: "Commerciale",
};

export function statusColor(status: string): string {
  switch (status) {
    case "OPEN":
      return "#0ea5e9";
    case "IN_PROGRESS":
      return "#6366f1";
    case "WAITING_CLIENT":
    case "WAITING_PARTNER":
      return "#f59e0b";
    case "RESOLVED":
      return "#10b981";
    case "CLOSED":
    case "ARCHIVED":
      return "#64748b";
    default:
      return "#94a3b8";
  }
}

export function customerLabel(row: TicketRow): string {
  return row.customerName || row.customerEmail || "Cliente";
}

export function slaState(slaDueAt?: string | null): "ok" | "risk" | "breached" | null {
  if (!slaDueAt) return null;
  const due = new Date(slaDueAt).getTime();
  const now = Date.now();
  if (due < now) return "breached";
  if (due - now < 4 * 60 * 60 * 1000) return "risk";
  return "ok";
}

export function slaLabel(slaDueAt?: string | null): string {
  const state = slaState(slaDueAt);
  if (!slaDueAt) return "—";
  const due = new Date(slaDueAt);
  if (state === "breached") return `Scaduto ${due.toLocaleString("it-IT")}`;
  if (state === "risk") return `Scade ${due.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
  return due.toLocaleString("it-IT");
}

export const VIEW_TITLES: Record<string, string> = {
  elenco: "Tutti i ticket",
  aperti: "Ticket aperti",
  urgenti: "Ticket urgenti",
  in_lavorazione: "In lavorazione",
  sla: "Monitor SLA",
  sla_scaduti: "SLA scaduti",
  sla_rischio: "SLA a rischio",
  chiusi: "Ticket chiusi",
  canali: "Canali di ingresso",
  report: "Report assistenza",
};
