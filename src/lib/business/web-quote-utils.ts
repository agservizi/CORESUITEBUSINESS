import type { WebQuoteItemInput } from "./web-quote-types";
import { getAgServiziStudioBranding } from "@/config/ag-servizi-company";

export function formatEuro(value: number, currency = "EUR") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value || 0);
}

export function computeItemTotal(item: Pick<WebQuoteItemInput, "quantity" | "unitPrice">) {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unitPrice) || 0;
  return Math.round(qty * price * 100) / 100;
}

export function computeQuoteTotals(
  items: WebQuoteItemInput[],
  discountPercent = 0,
  taxPercent = 22
) {
  const normalized = items.map((item) => ({
    ...item,
    total: computeItemTotal(item),
  }));
  const subtotal = normalized.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = Math.round(subtotal * (Math.max(0, discountPercent) / 100) * 100) / 100;
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxable * (Math.max(0, taxPercent) / 100) * 100) / 100;
  const total = Math.round((taxable + taxAmount) * 100) / 100;
  return { items: normalized, subtotal, discountAmount, taxAmount, total };
}

export function clientDisplayName(client: {
  name: string;
  companyName?: string | null;
}) {
  return client.companyName?.trim() || client.name;
}

export function getStudioBranding() {
  return getAgServiziStudioBranding();
}
