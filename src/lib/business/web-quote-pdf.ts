import PDFDocument from "pdfkit";
import type { WebQuote, WebQuoteItem, Client } from "@/generated/prisma";
import type { WebQuoteMilestone, WebQuotePackageTier } from "./web-quote-types";
import { WEB_PROJECT_TYPES } from "./web-quote-types";
import { clientDisplayName, formatEuro, getStudioBranding } from "./web-quote-utils";

type PdfDoc = InstanceType<typeof PDFDocument>;
type StudioBranding = ReturnType<typeof getStudioBranding>;

export type WebQuoteForPdf = WebQuote & {
  items: WebQuoteItem[];
  client: Pick<Client, "id" | "name" | "companyName" | "email" | "phone" | "vatNumber" | "address" | "city">;
};

const M = 48;
const PAGE_H = 841.89;
const PAGE_W = 595.28;
const CONTENT_W = PAGE_W - M * 2;
const FOOTER_LINE_Y = PAGE_H - M - 22;
const FOOTER_TEXT_Y = PAGE_H - M - 12;
const BOTTOM = PAGE_H - M - 36;

function parseJsonArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  return [];
}

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function projectTypeLabel(value: string) {
  return WEB_PROJECT_TYPES.find((t) => t.value === value)?.label || value;
}

function num(value: unknown) {
  return Number(value) || 0;
}

function drawFooter(doc: PdfDoc, studio: StudioBranding) {
  doc.save();
  doc
    .moveTo(M, FOOTER_LINE_Y)
    .lineTo(PAGE_W - M, FOOTER_LINE_Y)
    .strokeColor("#e2e8f0")
    .lineWidth(0.5)
    .stroke();
  const parts = [studio.name, studio.email, studio.phone, studio.website].filter(Boolean);
  doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8");
  doc.text(parts.join("  ·  "), M, FOOTER_TEXT_Y, { width: CONTENT_W, align: "center", lineBreak: false });
  doc.restore();
}

function ensureSpace(doc: PdfDoc, height: number, studio: StudioBranding): boolean {
  if (doc.y + height > BOTTOM) {
    drawFooter(doc, studio);
    doc.addPage();
    doc.y = M;
    return true;
  }
  return false;
}

function sectionTitle(doc: PdfDoc, title: string, accent: string, studio: StudioBranding) {
  ensureSpace(doc, 28, studio);
  const y = doc.y;
  doc.rect(M, y, 3, 13).fill(accent);
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#0f172a").text(title.toUpperCase(), M + 10, y);
  doc.y = y + 20;
}

function drawHeader(doc: PdfDoc, accent: string, quote: WebQuoteForPdf, studio: StudioBranding) {
  doc.rect(0, 0, PAGE_W, 3).fill(accent);

  doc.font("Helvetica-Bold").fontSize(15).fillColor("#0f172a").text(studio.name, M, M);
  doc.font("Helvetica").fontSize(8.5).fillColor("#64748b").text(studio.tagline, M, doc.y + 1);

  const metaX = PAGE_W - M - 168;
  doc.font("Helvetica-Bold").fontSize(17).fillColor(accent).text("PREVENTIVO", metaX, M, { width: 168, align: "right" });
  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor("#0f172a")
    .text(quote.number, metaX, M + 20, { width: 168, align: "right" });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#64748b")
    .text(`Emesso il ${fmtDate(quote.createdAt)}`, metaX, M + 36, { width: 168, align: "right" });
  doc.text(`Valido fino al ${fmtDate(quote.validUntil)}`, metaX, M + 48, { width: 168, align: "right" });

  doc.y = M + 62;
  doc.moveTo(M, doc.y).lineTo(PAGE_W - M, doc.y).strokeColor("#e2e8f0").lineWidth(1).stroke();
  doc.y += 14;
}

function drawClientAndProject(doc: PdfDoc, quote: WebQuoteForPdf, accent: string, studio: StudioBranding) {
  const topY = doc.y;
  const colW = CONTENT_W / 2 - 10;
  const rightX = M + colW + 20;

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(accent).text("SPETT.LE", M, topY);
  doc
    .font("Helvetica-Bold")
    .fontSize(11.5)
    .fillColor("#0f172a")
    .text(clientDisplayName(quote.client), M, topY + 12, { width: colW });

  doc.font("Helvetica").fontSize(8.5).fillColor("#475569");
  const clientLines = [
    quote.client.companyName && quote.client.companyName !== quote.client.name
      ? `Referente: ${quote.client.name}`
      : null,
    [quote.client.address, quote.client.city].filter(Boolean).join(", ") || null,
    quote.client.email,
    quote.client.phone,
    quote.client.vatNumber ? `P.IVA ${quote.client.vatNumber}` : null,
  ].filter(Boolean) as string[];

  let cy = topY + 28;
  clientLines.forEach((line) => {
    doc.text(line, M, cy, { width: colW });
    cy += 12;
  });

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(accent).text("OGGETTO", rightX, topY);
  doc
    .font("Helvetica-Bold")
    .fontSize(11.5)
    .fillColor("#0f172a")
    .text(quote.title, rightX, topY + 12, { width: colW });
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor("#475569")
    .text(`Tipologia: ${projectTypeLabel(quote.projectType)}`, rightX, topY + 28, { width: colW });

  doc.y = Math.max(cy, topY + 44) + 10;

  if (quote.introduction) {
    doc.moveTo(M, doc.y).lineTo(PAGE_W - M, doc.y).strokeColor("#f1f5f9").lineWidth(4).stroke();
    doc.y += 10;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#334155")
      .text(quote.introduction, M, doc.y, { width: CONTENT_W, lineGap: 1.5 });
    doc.y += doc.heightOfString(quote.introduction, { width: CONTENT_W, lineGap: 1.5 }) + 10;
  }

  if (quote.scopeNotes) {
    sectionTitle(doc, "Ambito del progetto", accent, studio);
    doc.font("Helvetica").fontSize(8.5).fillColor("#475569").text(quote.scopeNotes, M, doc.y, {
      width: CONTENT_W,
      lineGap: 1.5,
    });
    doc.y += doc.heightOfString(quote.scopeNotes, { width: CONTENT_W, lineGap: 1.5 }) + 8;
  }
}

function drawPackagesTable(
  doc: PdfDoc,
  packages: WebQuotePackageTier[],
  accent: string,
  currency: string,
  studio: StudioBranding
) {
  sectionTitle(doc, "Piani di riferimento (indicativi)", accent, studio);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#64748b")
    .text(
      "Opzioni orientative a confronto. L'importo formalizzato è quello indicato nel dettaglio economico.",
      M,
      doc.y,
      { width: CONTENT_W, lineGap: 1 }
    );
  doc.y += 16;

  const colPlan = 110;
  const colPrice = 78;
  const colFeat = CONTENT_W - colPlan - colPrice;

  const drawPkgHeader = (y: number) => {
    doc.rect(M, y, CONTENT_W, 18).fill("#f1f5f9");
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#64748b");
    doc.text("PIANO", M + 6, y + 5, { width: colPlan - 10 });
    doc.text("INVESTIMENTO", M + colPlan, y + 5, { width: colPrice - 4, align: "right" });
    doc.text("CARATTERISTICHE", M + colPlan + colPrice + 6, y + 5, { width: colFeat - 12 });
  };

  let rowY = doc.y;
  drawPkgHeader(rowY);
  rowY += 20;

  packages.forEach((pkg, index) => {
    const features = pkg.features.slice(0, 4).join(" · ");
    doc.font("Helvetica").fontSize(8).fillColor("#475569");
    const featH = doc.heightOfString(features, { width: colFeat - 12 });
    const rowH = Math.max(22, featH + 10);

    if (ensureSpace(doc, rowH + 4, studio)) {
      rowY = doc.y;
      drawPkgHeader(rowY);
      rowY += 20;
    }

    if (index % 2 === 0) doc.rect(M, rowY, CONTENT_W, rowH).fill("#fafafa");
    if (pkg.recommended) doc.rect(M, rowY, 3, rowH).fill(accent);

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a");
    const planLabel = pkg.recommended ? `${pkg.name} (consigliato)` : pkg.name;
    doc.text(planLabel, M + 8, rowY + 6, { width: colPlan - 12 });
    doc.text(formatEuro(pkg.price, currency), M + colPlan, rowY + 6, { width: colPrice - 4, align: "right" });
    doc.font("Helvetica").fontSize(8).fillColor("#64748b").text(features, M + colPlan + colPrice + 6, rowY + 6, {
      width: colFeat - 12,
    });

    doc.moveTo(M, rowY + rowH).lineTo(PAGE_W - M, rowY + rowH).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
    rowY += rowH;
    doc.y = rowY;
  });

  doc.y = rowY + 10;
}

function measureTableRow(doc: PdfDoc, item: WebQuoteItem, descW: number) {
  doc.font("Helvetica-Bold").fontSize(8.5);
  const titleH = doc.heightOfString(item.title, { width: descW - 8 });
  let extra = 0;
  if (item.category) {
    doc.font("Helvetica").fontSize(7.5);
    extra += doc.heightOfString(item.category, { width: descW - 8 }) + 1;
  }
  if (item.description) {
    doc.font("Helvetica").fontSize(7.5);
    extra += doc.heightOfString(item.description, { width: descW - 8 }) + 1;
  }
  return Math.max(24, titleH + extra + 8);
}

function drawItemsTable(
  doc: PdfDoc,
  items: WebQuoteItem[],
  quote: WebQuoteForPdf,
  accent: string,
  studio: StudioBranding
) {
  sectionTitle(doc, "Dettaglio economico", accent, studio);

  const colDesc = 250;
  const colQty = 36;
  const colUnit = 86;
  const colTotal = CONTENT_W - colDesc - colQty - colUnit;
  const colX = [M, M + colDesc, M + colDesc + colQty, M + colDesc + colQty + colUnit];

  const drawTableHeader = (y: number) => {
    doc.rect(M, y, CONTENT_W, 18).fill("#f1f5f9");
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#64748b");
    doc.text("DESCRIZIONE", colX[0] + 6, y + 5, { width: colDesc - 12 });
    doc.text("Q.tà", colX[1], y + 5, { width: colQty - 2, align: "center" });
    doc.text("PREZZO UNIT.", colX[2], y + 5, { width: colUnit - 4, align: "right" });
    doc.text("IMPORTO", colX[3], y + 5, { width: colTotal - 6, align: "right" });
  };

  let rowY = doc.y;
  drawTableHeader(rowY);
  rowY += 20;

  items.forEach((item, index) => {
    const rowH = measureTableRow(doc, item, colDesc);
    if (ensureSpace(doc, rowH + 6, studio)) {
      rowY = doc.y;
      drawTableHeader(rowY);
      rowY += 20;
    }

    if (index % 2 === 0) doc.rect(M, rowY, CONTENT_W, rowH).fill("#ffffff");
    else doc.rect(M, rowY, CONTENT_W, rowH).fill("#fafafa");

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text(item.title, colX[0] + 6, rowY + 5, {
      width: colDesc - 12,
    });
    let textY = rowY + 14;
    if (item.category) {
      doc.font("Helvetica").fontSize(7).fillColor(accent).text(item.category, colX[0] + 6, textY, { width: colDesc - 12 });
      textY += 9;
    }
    if (item.description) {
      doc.font("Helvetica").fontSize(7).fillColor("#64748b").text(item.description, colX[0] + 6, textY, {
        width: colDesc - 12,
      });
    }

    doc.font("Helvetica").fontSize(8.5).fillColor("#0f172a");
    doc.text(String(num(item.quantity)), colX[1], rowY + 5, { width: colQty - 2, align: "center" });
    doc.text(formatEuro(num(item.unitPrice), quote.currency), colX[2], rowY + 5, { width: colUnit - 4, align: "right" });
    doc
      .font("Helvetica-Bold")
      .text(formatEuro(num(item.total), quote.currency), colX[3], rowY + 5, { width: colTotal - 6, align: "right" });

    doc.moveTo(M, rowY + rowH).lineTo(PAGE_W - M, rowY + rowH).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
    rowY += rowH;
    doc.y = rowY;
  });

  doc.y = rowY + 8;
}

function drawTotals(doc: PdfDoc, quote: WebQuoteForPdf, studio: StudioBranding) {
  const boxW = 210;
  const boxH = num(quote.discountAmount) > 0 ? 88 : 74;
  ensureSpace(doc, boxH + 8, studio);

  const boxX = PAGE_W - M - boxW;
  const boxY = doc.y;

  doc.roundedRect(boxX, boxY, boxW, boxH, 5).fill("#f8fafc");
  doc.roundedRect(boxX, boxY, boxW, boxH, 5).lineWidth(0.75).strokeColor("#e2e8f0").stroke();

  const row = (label: string, value: string, y: number, bold = false) => {
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(bold ? 10.5 : 8.5)
      .fillColor(bold ? "#0f172a" : "#475569");
    doc.text(label, boxX + 12, y, { width: 90 });
    doc.text(value, boxX + 12, y, { width: boxW - 24, align: "right" });
  };

  let y = boxY + 10;
  row("Imponibile", formatEuro(num(quote.subtotal), quote.currency), y);
  y += 14;
  if (num(quote.discountAmount) > 0) {
    row(`Sconto (${num(quote.discountPercent)}%)`, `- ${formatEuro(num(quote.discountAmount), quote.currency)}`, y);
    y += 14;
  }
  row(`IVA (${num(quote.taxPercent)}%)`, formatEuro(num(quote.taxAmount), quote.currency), y);
  y += 12;
  doc.moveTo(boxX + 12, y).lineTo(boxX + boxW - 12, y).strokeColor("#cbd5e1").lineWidth(0.75).stroke();
  y += 8;
  row("Totale", formatEuro(num(quote.total), quote.currency), y, true);

  doc.y = boxY + boxH + 12;
}

function drawTimeline(doc: PdfDoc, milestones: WebQuoteMilestone[], accent: string, studio: StudioBranding) {
  sectionTitle(doc, "Timeline di progetto", accent, studio);

  milestones.forEach((m, i) => {
    const lineH =
      doc.heightOfString(`${m.duration}  —  ${m.deliverables}`, { width: CONTENT_W - 28, lineGap: 1 }) + 22;
    ensureSpace(doc, lineH, studio);

    const y = doc.y;
    doc.circle(M + 5, y + 5, 3.5).fill(accent);
    if (i < milestones.length - 1) {
      doc.moveTo(M + 5, y + 10).lineTo(M + 5, y + lineH).strokeColor("#e2e8f0").lineWidth(0.75).stroke();
    }
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text(m.phase, M + 16, y);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#64748b")
      .text(`${m.duration}  —  ${m.deliverables}`, M + 16, y + 12, { width: CONTENT_W - 28, lineGap: 1 });
    doc.y = y + lineH;
  });
}

function drawClosingSections(doc: PdfDoc, quote: WebQuoteForPdf, accent: string, studio: StudioBranding) {
  if (quote.paymentPlan) {
    sectionTitle(doc, "Modalità di pagamento", accent, studio);
    doc.font("Helvetica").fontSize(8.5).fillColor("#475569").text(quote.paymentPlan, M, doc.y, {
      width: CONTENT_W,
      lineGap: 1.5,
    });
    doc.y += doc.heightOfString(quote.paymentPlan, { width: CONTENT_W, lineGap: 1.5 }) + 6;
  }

  const terms =
    quote.terms ||
    "Validità offerta 30 giorni. Prezzi IVA esclusa salvo diversa indicazione. Eventuali extra fuori scope saranno concordati per iscritto.";
  sectionTitle(doc, "Termini e condizioni", accent, studio);
  doc.font("Helvetica").fontSize(8).fillColor("#64748b").text(terms, M, doc.y, { width: CONTENT_W, lineGap: 1.5 });
  doc.y += doc.heightOfString(terms, { width: CONTENT_W, lineGap: 1.5 });
}

export async function generateWebQuotePdf(quote: WebQuoteForPdf): Promise<Buffer> {
  const studio = getStudioBranding();
  const accent = quote.accentColor || "#6366f1";
  const packages = parseJsonArray<WebQuotePackageTier>(quote.packages);
  const milestones = parseJsonArray<WebQuoteMilestone>(quote.milestones);
  const mainItems = quote.items.filter((i) => !i.isOptional);
  const optionalItems = quote.items.filter((i) => i.isOptional);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: M });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawHeader(doc, accent, quote, studio);
    drawClientAndProject(doc, quote, accent, studio);

    if (quote.includePackages && packages.length > 0) {
      drawPackagesTable(doc, packages, accent, quote.currency, studio);
    }

    drawItemsTable(doc, mainItems, quote, accent, studio);

    if (optionalItems.length > 0) {
      sectionTitle(doc, "Servizi opzionali", accent, studio);
      optionalItems.forEach((item) => {
        ensureSpace(doc, 16, studio);
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor("#475569")
          .text(`• ${item.title} — ${formatEuro(num(item.total), quote.currency)}`, M, doc.y, { width: CONTENT_W });
        doc.y += 12;
      });
    }

    drawTotals(doc, quote, studio);

    if (quote.includeTimeline && milestones.length > 0) {
      drawTimeline(doc, milestones, accent, studio);
    }

    drawClosingSections(doc, quote, accent, studio);
    drawFooter(doc, studio);

    doc.end();
  });
}
