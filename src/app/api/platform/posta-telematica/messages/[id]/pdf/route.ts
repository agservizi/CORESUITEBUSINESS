import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { generatePostaReceiptPdfBuffer } from "@/lib/platform/posta-telematica-service";

export const GET = withApi(
  async (_request, { params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    }

    const buffer = await generatePostaReceiptPdfBuffer(id);
    if (!buffer) {
      return NextResponse.json({ error: "Messaggio non trovato" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="ricevuta-posta-${id.slice(-8)}.pdf"`,
      },
    });
  },
  { requireCsrf: false, serviceSlug: "posta-telematica" }
);
