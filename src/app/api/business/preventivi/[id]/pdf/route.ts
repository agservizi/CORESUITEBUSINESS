import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { generateWebQuotePdf } from "@/lib/business/web-quote-pdf";
import { getWebQuote, touchWebQuotePdfGenerated } from "@/lib/business/web-quote-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  const quote = await getWebQuote(id);
  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });

  try {
    const pdf = await generateWebQuotePdf(quote);
    await touchWebQuotePdfGenerated(id);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${quote.number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[preventivi PDF]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore generazione PDF" },
      { status: 500 }
    );
  }
}
