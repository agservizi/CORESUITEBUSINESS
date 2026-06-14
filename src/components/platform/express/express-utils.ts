export function money(v: number | string) {
  return `€ ${Number(v).toFixed(2)}`;
}

export function statusColor(status: string): "success" | "error" | "warning" | "default" {
  if (status === "Completata") return "success";
  if (status === "Annullata") return "error";
  if (status === "InStock") return "success";
  if (status === "Sold") return "default";
  return "warning";
}

export const EXPRESS_ACCENT = "#eab308";
export const EXPRESS_GRADIENT = "linear-gradient(135deg, #eab308 0%, #ca8a04 50%, #a16207 100%)";

export { formatRecentSaleLabel } from "@/lib/platform/express-format";

export interface SaleRow {
  id: string;
  mysqlId?: number | null;
  cashMovementId?: string | null;
  total: number | string;
  status: string;
  paymentMethod: string;
  soldAt: string;
  discount?: number | string;
  client?: { id: string; name: string } | null;
  discountCampaign?: { name: string } | null;
  summary?: string;
  _count?: { lines: number };
  lines?: LineRow[];
  user?: { name: string; email: string } | null;
}

export interface LineRow {
  id: string;
  lineType: string;
  description: string;
  unitPrice: number | string;
  lineTotal: number | string;
  quantity?: number;
  returnedQty?: number;
  lineDiscount?: number | string;
  assignedNumber?: string | null;
  vatRate?: number | string;
  operator?: { name: string } | null;
  offer?: { title: string } | null;
  iccidStock?: { iccid: string; assignedNumber?: string | null } | null;
  iccidStockId?: string | null;
  product?: { name: string } | null;
}

export interface OfferRow {
  id: string;
  title: string;
  description?: string | null;
  price: number | string;
  status: string;
  operator?: { id: string; name: string } | null;
  operatorId?: string;
}

export interface ProviderInsight {
  id: string;
  name: string;
  threshold: number;
  currentStock: number;
  averageDailySales: number;
  daysCover: number | null;
  belowThreshold: boolean;
  suggestedReorder: number;
  riskLevel: "ok" | "warning" | "critical";
}

export interface DashboardData {
  period?: string;
  kpis: {
    salesToday: number;
    revenueMonth: number;
    salesMonthCount: number;
    iccidInStock: number;
    iccidTotal?: number;
    iccidSold?: number;
    offersActive: number;
    operatorsCount: number;
    periodSales?: number;
    periodRevenue?: number;
  };
  operatorAlerts: { id: string; name: string; inStock: number; threshold: number; suggestedReorder?: number }[];
  providerInsights?: ProviderInsight[];
  salesTrend?: { date: string; label: string; count: number; revenue: number; countPct: number; revenuePct: number }[];
  operatorActivity?: {
    saleId: string | number;
    id: string;
    user: string | null;
    status: string;
    paymentMethod: string;
    total: number;
    createdAt: string;
  }[];
  paymentBreakdown?: { method: string; count: number; total: number }[];
  operatorBreakdown?: { name: string; count: number; total: number }[];
  nextSteps?: { label: string; severity: "info" | "warning" | "critical"; action?: string }[];
  recentSales: SaleRow[];
  settings: {
    payment_methods?: string[];
    default_payment_method?: string;
    default_vat?: number;
    sim_price_default?: number;
    tax_note?: string;
  };
  campaignPerformance?: {
    id: string;
    name: string;
    type: string;
    value: number;
    active: boolean;
    salesCount: number;
    revenue: number;
    discountGiven: number;
  }[];
  stockAlerts?: {
    id: string;
    message: string;
    status: string;
    createdAt: string;
    operator?: { id: string; name: string } | null;
    product?: { id: string; name: string } | null;
  }[];
  productInsights?: {
    id: string;
    name: string;
    currentStock: number;
    threshold: number;
    belowThreshold: boolean;
    price: number;
  }[];
}
