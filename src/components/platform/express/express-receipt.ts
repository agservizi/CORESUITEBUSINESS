import type { LineRow, SaleRow } from "./express-utils";
import {
  saleHasExemptLines,
  saleHasTaxableLines,
  uniqueTaxableVatRates,
} from "@/lib/platform/express-vat";

export interface ExpressStoreInfo {
  store_name?: string;
  store_address?: string;
  store_city?: string;
  store_vat?: string;
  store_phone?: string;
  store_email?: string;
  tax_note?: string;
  default_vat?: number;
  receipt_footer?: string;
  store_logo?: string;
}

export interface ExpressReceiptInput {
  saleId: string;
  saleNumber: string;
  soldAt: string | Date;
  status?: string;
  paymentMethod: string;
  discount?: number;
  total: number;
  vatRate?: number;
  clientName?: string | null;
  operatorName?: string | null;
  campaignName?: string | null;
  lines: {
    description: string;
    lineType?: string;
    quantity?: number;
    unitPrice?: number;
    lineTotal: number;
    lineDiscount?: number;
    iccid?: string | null;
    assignedNumber?: string | null;
    vatRate?: number;
  }[];
}

function fmtMoney(v: number) {
  return `€ ${v.toFixed(2).replace(".", ",")}`;
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeLogoSrc(src?: string): string | null {
  if (!src?.trim()) return null;
  const value = src.trim();
  if (/^data:image\/(png|jpeg|jpg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)) return value;
  if (/^\/uploads\/[\w\-./]+$/.test(value)) return value;
  return null;
}

export function buildExpressReceiptHtml(store: ExpressStoreInfo, receipt: ExpressReceiptInput) {
  const storeName = store.store_name?.trim() || "EXPRESS TELEFONIA";
  const subtotalLines = receipt.lines.reduce((s, l) => s + Number(l.lineTotal), 0);
  const discount = Number(receipt.discount ?? 0);
  const hasTaxable = saleHasTaxableLines(receipt.lines);
  const hasExempt = saleHasExemptLines(receipt.lines);
  const taxableRates = uniqueTaxableVatRates(receipt.lines);

  const linesHtml = receipt.lines
    .map((line) => {
      const qty = line.quantity ?? 1;
      const lineVat = Number(line.vatRate ?? 0);
      const iccid = line.iccid ? `<div class="muted">ICCID …${escapeHtml(line.iccid.slice(-8))}</div>` : "";
      const assignedNumber = line.assignedNumber?.trim()
        ? `<div class="muted">Numero assegnato: ${escapeHtml(line.assignedNumber.trim())}</div>`
        : "";
      const disc =
        line.lineDiscount && line.lineDiscount > 0
          ? `<div class="muted">Sconto riga −${fmtMoney(line.lineDiscount)}</div>`
          : "";
      const lineVatHtml =
        lineVat > 0.001
          ? `<div class="muted">IVA ${lineVat.toFixed(2).replace(".", ",")}% incl.</div>`
          : "";
      return `<div class="line-item">
          <div class="line-desc">${escapeHtml(line.description)}</div>
          <div class="muted">${escapeHtml(line.lineType || "articolo")}${qty > 1 ? ` × ${qty}` : ""}</div>
          ${iccid}${assignedNumber}${lineVatHtml}${disc}
          <div class="line-price">${fmtMoney(Number(line.lineTotal))}</div>
        </div>`;
    })
    .join("");

  const headerLines = [
    store.store_address,
    store.store_city,
    store.store_vat ? `P.IVA ${store.store_vat}` : "",
    store.store_phone ? `Tel. ${store.store_phone}` : "",
    store.store_email,
  ].filter(Boolean);

  const footer = store.receipt_footer?.trim() || "Grazie per aver scelto i nostri servizi";
  const logoSrc = safeLogoSrc(store.store_logo);
  const logoHtml = logoSrc
    ? `<div class="store-logo"><img src="${logoSrc}" alt="Logo negozio"></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>Documento gestionale #${escapeHtml(receipt.saleNumber)}</title>
<style>
  @page {
    size: 80mm auto;
    margin: 4mm 5mm;
  }
  * { box-sizing: border-box; }
  html {
    margin: 0;
    padding: 0;
  }
  body {
    margin: 0 auto;
    padding: 4mm 5mm 6mm;
    width: 80mm;
    max-width: 80mm;
    font-family: "Courier New", Courier, monospace;
    font-size: 11px;
    line-height: 1.4;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt {
    width: 100%;
    max-width: 68mm;
    margin: 0 auto;
    text-align: center;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .center { text-align: center; }
  .meta-line { margin: 2px 0; }
  .muted {
    font-size: 10px;
    color: #333;
    margin-top: 2px;
  }
  .store-name {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    margin: 0 0 4px;
    line-height: 1.25;
  }
  .store-logo {
    margin: 0 auto 8px;
    text-align: center;
  }
  .store-logo img {
    display: block;
    max-width: 48mm;
    max-height: 18mm;
    margin: 0 auto;
    object-fit: contain;
  }
  .doc-title { font-size: 10px; margin: 6px 0; }
  hr {
    border: none;
    border-top: 1px dashed #000;
    margin: 8px auto;
    width: 90%;
  }
  .lines { margin: 6px 0; }
  .line-item {
    text-align: center;
    padding: 6px 0;
    border-bottom: 1px dotted #ccc;
  }
  .line-item:last-child { border-bottom: none; }
  .line-desc { font-weight: 600; }
  .line-price {
    font-weight: 700;
    margin-top: 4px;
    font-size: 12px;
  }
  .totals { margin-top: 6px; }
  .total {
    font-size: 14px;
    font-weight: 700;
    text-align: center;
    margin: 10px 0 6px;
  }
  .footer {
    text-align: center;
    font-size: 10px;
    margin-top: 14px;
    padding-top: 4px;
  }
  @media print {
    body {
      width: 80mm;
      padding: 3mm 6mm 5mm;
    }
    .receipt {
      max-width: 66mm;
    }
  }
</style>
</head>
<body>
<div class="receipt">
  <div class="center">
    ${logoHtml}
    <div class="store-name">${escapeHtml(storeName)}</div>
    ${headerLines.map((l) => `<div class="muted">${escapeHtml(l!)}</div>`).join("")}
    <div class="doc-title">DOCUMENTO GESTIONALE #${escapeHtml(receipt.saleNumber)}</div>
  </div>
  <hr>
  <div class="meta-line">Data: ${escapeHtml(fmtDate(receipt.soldAt))}</div>
  ${receipt.operatorName ? `<div class="meta-line">Operatore: ${escapeHtml(receipt.operatorName)}</div>` : ""}
  ${receipt.clientName ? `<div class="meta-line">Cliente: ${escapeHtml(receipt.clientName)}</div>` : ""}
  ${receipt.campaignName ? `<div class="meta-line muted">Campagna: ${escapeHtml(receipt.campaignName)}</div>` : ""}
  <hr>
  <div class="lines">${linesHtml}</div>
  <hr>
  <div class="totals">
  ${hasExempt && store.tax_note ? `<div class="muted">${escapeHtml(store.tax_note)}</div>` : ""}
  ${hasTaxable ? taxableRates.map((rate) => `<div class="muted">Aliquota prodotti: IVA ${rate.toFixed(2).replace(".", ",")}%</div>`).join("") : ""}
  <div class="muted">Subtotale: ${fmtMoney(subtotalLines)}</div>
  ${discount > 0 ? `<div class="muted">Sconto: −${fmtMoney(discount)}</div>` : ""}
  <div class="total">TOTALE: ${fmtMoney(Number(receipt.total))}</div>
  <div class="meta-line">Pagamento: ${escapeHtml(receipt.paymentMethod)}</div>
  </div>
  <div class="footer">${escapeHtml(footer)}</div>
</div>
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 250);
  };
</script>
</body>
</html>`;
}

export function saleToReceiptInput(sale: SaleRow & { mysqlId?: number | null; vatRate?: number | string; discountCampaign?: { name: string } | null }): ExpressReceiptInput {
  return {
    saleId: sale.id,
    saleNumber: String(sale.mysqlId ?? sale.id.slice(-6)),
    soldAt: sale.soldAt,
    status: sale.status,
    paymentMethod: sale.paymentMethod,
    discount: Number(sale.discount ?? 0),
    total: Number(sale.total),
    clientName: sale.client?.name,
    operatorName: sale.user?.name || sale.user?.email || null,
    campaignName: sale.discountCampaign?.name ?? null,
    lines: (sale.lines || []).map((l: LineRow) => ({
      description: l.description,
      lineType: l.lineType,
      quantity: l.quantity ?? 1,
      unitPrice: Number(l.unitPrice),
      lineTotal: Number(l.lineTotal),
      lineDiscount: l.lineDiscount != null ? Number(l.lineDiscount) : undefined,
      iccid: l.iccidStock?.iccid ?? null,
      assignedNumber: l.assignedNumber ?? l.iccidStock?.assignedNumber ?? null,
      vatRate: l.vatRate != null ? Number(l.vatRate) : 0,
    })),
  };
}

export interface PosReceiptCartLine {
  lineType?: string;
  iccidStockId?: string;
  iccid?: string;
  assignedNumber?: string;
}

/** Allinea i dati inseriti in cassa con la ricevuta (numero SIM, ICCID). */
export function mergePosCartIntoReceipt(
  receipt: ExpressReceiptInput,
  cart: PosReceiptCartLine[],
  saleLines?: Array<{ iccidStockId?: string | null }>
): ExpressReceiptInput {
  const cartByStockId = new Map(
    cart.filter((c) => c.iccidStockId).map((c) => [c.iccidStockId!, c])
  );

  return {
    ...receipt,
    lines: receipt.lines.map((line, index) => {
      const stockId = saleLines?.[index]?.iccidStockId ?? undefined;
      const cartLine = (stockId && cartByStockId.get(stockId)) || cart[index];
      if (!cartLine) return line;

      const assignedNumber =
        cartLine.assignedNumber?.trim() || line.assignedNumber?.trim() || null;

      return {
        ...line,
        iccid: cartLine.iccid || line.iccid,
        assignedNumber,
      };
    }),
  };
}

export function printExpressReceipt(store: ExpressStoreInfo, receipt: ExpressReceiptInput) {
  if (typeof window === "undefined") return;
  const html = buildExpressReceiptHtml(store, receipt);
  const w = window.open("", "_blank", "width=400,height=720");
  if (!w) {
    alert("Consenti i popup per stampare la ricevuta termica.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
