import type { OpportunityCategory } from "@/generated/prisma";

export interface OpportunityRow {
  id: string;
  code: string;
  category: OpportunityCategory;
  statusCode: string;
  statusLabel?: string;
  statusColor?: string;
  providerId: string;
  providerLabel: string;
  offerLabel?: string | null;
  collaboratorId: string;
  collaboratorName?: string;
  commissionAmount?: number | null;
  commission: number;
  customerFirstName: string;
  customerLastName: string;
  customerName?: string;
  customerTaxCode: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress?: string | null;
  customerCity?: string | null;
  customerPostalCode?: string | null;
  customerProvince?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  documentExpiresAt?: string | null;
  telefoniaCurrentOperator?: string | null;
  telefoniaLineNumber?: string | null;
  lucePod?: string | null;
  gasPdr?: string | null;
  paymentMethod?: string;
  paymentIban?: string | null;
  contractCode?: string | null;
  clientCode?: string | null;
  adminNotes?: string | null;
  additionalNotes?: string | null;
  metadata?: Record<string, unknown> | null;
  title?: string;
  lastStatusChange?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; name: string; companyName?: string | null; morosityScore?: string | null } | null;
  collaborator?: { id: string; name: string | null; email: string } | null;
  files?: { id: string; originalName: string; filePath: string }[];
}

export const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  TELEFONIA: "Telefonia",
  LUCE: "Luce",
  GAS: "Gas",
};

export const CATEGORY_COLORS: Record<OpportunityCategory, string> = {
  TELEFONIA: "#6366f1",
  LUCE: "#f59e0b",
  GAS: "#0ea5e9",
};

export function money(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

export function customerLabel(row: OpportunityRow) {
  return row.customerName || `${row.customerFirstName} ${row.customerLastName}`.trim();
}

export const OPPORTUNITY_GRADIENT = "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)";

export function statusColor(code: string, fallback = "#64748b") {
  const map: Record<string, string> = {
    in_verifica: "#f59e0b",
    documenti_ok: "#0ea5e9",
    in_firma_otp: "#6366f1",
    annullato: "#ef4444",
    attivato: "#10b981",
  };
  return map[code] || fallback;
}
