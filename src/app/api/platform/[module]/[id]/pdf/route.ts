import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { getModuleRecord } from "@/lib/platform/module-handlers";
import { generatePracticePdf, generateReceiptPdf, generateCashMovementPdf } from "@/lib/pdf";

const PDF_MODULES = new Set(["tickets", "caf-patronato", "entrate-uscite", "brt", "telegrammi"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string; id: string }> }
) {
  const { module, id } = await params;
  if (!PDF_MODULES.has(module)) {
    return NextResponse.json({ error: "PDF non disponibile" }, { status: 404 });
  }

  return withApi(async () => {
    const record = await getModuleRecord(module, id);
    if (!record) return NextResponse.json({ error: "Record non trovato" }, { status: 404 });

    const r = record as Record<string, unknown>;
    let buffer: Buffer;
    let filename = `${module}-${id}.pdf`;

    if (module === "caf-patronato") {
      const client = r.client as { name?: string } | undefined;
      buffer = await generatePracticePdf({
        code: String(r.code || id),
        practiceType: String(r.practiceType || "Pratica"),
        clientName: client?.name || "Cliente",
        category: String(r.category || "CAF"),
        status: String(r.status || "—"),
        notes: r.notes ? String(r.notes) : undefined,
      });
      filename = `pratica-${r.code || id}.pdf`;
    } else if (module === "entrate-uscite") {
      const client = r.client as { name?: string } | undefined;
      buffer = await generateCashMovementPdf({
        description: String(r.description || "—"),
        type: String(r.type || "—"),
        clientName: client?.name || "—",
        amount: new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
          Number(r.amount || 0)
        ),
        status: String(r.status || "—"),
        method: String(r.method || "—"),
      });
      filename = `movimento-${String(r.id).slice(-8)}.pdf`;
    } else {
      const code = String(r.code || r.trackingCode || id);
      buffer = await generateReceiptPdf({
        title: module === "tickets" ? "Ticket assistenza" : "Documento",
        code,
        clientName: String(r.customerName || r.recipientName || r.senderName || "—"),
        lines: [
          { label: "Oggetto", value: String(r.subject || r.body || r.description || "—") },
          { label: "Stato", value: String(r.status || "—") },
        ],
      });
      filename = `${code}.pdf`;
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }, { requireCsrf: false })(request);
}
