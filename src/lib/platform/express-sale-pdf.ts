import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { getExpressSettingsRecord } from "@/lib/platform/express-admin";

export async function generateExpressSalePdf(saleId: string): Promise<Buffer | null> {
  const sale = await prisma.expressSale.findUnique({
    where: { id: saleId },
    include: {
      client: { select: { name: true } },
      lines: {
        include: {
          operator: { select: { name: true } },
          iccidStock: { select: { iccid: true, assignedNumber: true } },
        },
      },
    },
  });
  if (!sale) return null;

  const settings = await getExpressSettingsRecord();
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));

  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(16).text(String(settings.store_name || "Express"), { align: "center" });
  doc.fontSize(10).text(String(settings.store_address || ""), { align: "center" });
  if (settings.store_vat) doc.text(`P.IVA ${settings.store_vat}`, { align: "center" });
  doc.moveDown();

  const receiptNo = sale.receiptNumber ?? sale.mysqlId ?? sale.id.slice(-8);
  doc.fontSize(12).text(`Documento vendita #${receiptNo}`);
  doc.text(`Data: ${sale.soldAt.toLocaleString("it-IT")}`);
  if (sale.client?.name) doc.text(`Cliente: ${sale.client.name}`);
  doc.text(`Pagamento: ${sale.paymentMethod}`);
  doc.moveDown();

  doc.fontSize(11).text("Righe", { underline: true });
  doc.moveDown(0.5);
  for (const line of sale.lines) {
    const total = Number(line.lineTotal);
    doc.text(`${line.description} — €${total.toFixed(2)} (IVA ${Number(line.vatRate)}%)`);
    if (line.assignedNumber) doc.fontSize(9).text(`  Numero: ${line.assignedNumber}`);
    if (line.iccidStock?.iccid) doc.fontSize(9).text(`  ICCID: ${line.iccidStock.iccid}`);
    doc.fontSize(11);
  }

  doc.moveDown();
  if (Number(sale.discount) > 0) {
    doc.text(`Sconto: -€${Number(sale.discount).toFixed(2)}`);
  }
  doc.fontSize(13).text(`Totale: €${Number(sale.total).toFixed(2)}`, { align: "right" });

  if (settings.receipt_footer) {
    doc.moveDown(2);
    doc.fontSize(9).text(String(settings.receipt_footer), { align: "center" });
  }

  doc.end();
  return done;
}
