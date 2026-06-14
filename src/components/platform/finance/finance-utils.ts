export const FINANCE_GRADIENT =
  "linear-gradient(135deg, #22c55e 0%, #16a34a 45%, #059669 100%)";

export const FINANCE_COLORS = {
  entrate: "#22c55e",
  uscite: "#ef4444",
  pending: "#f59e0b",
  express: "#6366f1",
  overdue: "#f97316",
  cash: "#0ea5e9",
  card: "#8b5cf6",
} as const;

export const VIEW_THEMES: Record<
  string,
  { title: string; subtitle: string; gradient: string; accent: string }
> = {
  elenco: {
    title: "Tutti i movimenti",
    subtitle: "Registro completo incassi e pagamenti",
    gradient: "linear-gradient(135deg, #22c55e 0%, #059669 55%, #047857 100%)",
    accent: FINANCE_COLORS.entrate,
  },
  entrate: {
    title: "Entrate",
    subtitle: "Incassi, vendite e riscossioni",
    gradient: "linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)",
    accent: FINANCE_COLORS.entrate,
  },
  uscite: {
    title: "Uscite",
    subtitle: "Pagamenti, spese e uscite di cassa",
    gradient: "linear-gradient(135deg, #f87171 0%, #ef4444 50%, #dc2626 100%)",
    accent: FINANCE_COLORS.uscite,
  },
  scadenze: {
    title: "Scadenze e sospesi",
    subtitle: "Movimenti da saldare o in attesa",
    gradient: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
    accent: FINANCE_COLORS.pending,
  },
  giornata: {
    title: "Giornata cassa",
    subtitle: "Apertura, chiusura e quadratura giornaliera",
    gradient: "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%)",
    accent: FINANCE_COLORS.cash,
  },
  report: {
    title: "Report finanza",
    subtitle: "Analisi per periodo e export",
    gradient: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)",
    accent: FINANCE_COLORS.card,
  },
  listino: {
    title: "Listino prezzi",
    subtitle: "Voci, costi rivenditore e prezzi cliente",
    gradient: "linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)",
    accent: "#10b981",
  },
};

export function money(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

export function movementStatusColor(status: string) {
  const s = status.toLowerCase();
  if (s === "pagato" || s === "completato") return FINANCE_COLORS.entrate;
  if (s === "in lavorazione") return FINANCE_COLORS.pending;
  if (s === "sospeso") return FINANCE_COLORS.overdue;
  return "#64748b";
}

export function isPaidStatus(status?: string | null) {
  const s = (status || "").toLowerCase();
  return s === "pagato" || s === "completato";
}

export function isOverdueDueDate(dueDate?: string | null, status?: string | null) {
  if (!dueDate || isPaidStatus(status)) return false;
  return new Date(dueDate) < new Date();
}

export function typeColor(type: string) {
  return type === "ENTRATA" ? FINANCE_COLORS.entrate : FINANCE_COLORS.uscite;
}

export interface FinanceMovementRow {
  id: string;
  type: string;
  description: string;
  amount: number | string;
  method?: string;
  status?: string;
  margin?: number | string | null;
  createdAt?: string;
  paidAt?: string | null;
  dueDate?: string | null;
  reference?: string | null;
  notes?: string | null;
  client?: { id?: string; name?: string | null } | null;
  expressSale?: { id?: string; receiptNumber?: number | null; paymentMethod?: string } | null;
}
