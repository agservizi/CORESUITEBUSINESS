import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createWebQuote, listWebQuotes } from "@/lib/business/web-quote-service";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const clientId = searchParams.get("clientId") || undefined;
  const q = searchParams.get("q") || undefined;

  try {
    const data = await listWebQuotes({ status, clientId, q });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[preventivi GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore caricamento preventivi", quotes: [], stats: { total: 0, pipelineValue: 0, acceptedValue: 0, byStatus: {} } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const body = await request.json();
  if (!body.title?.trim() || !body.clientId) {
    return NextResponse.json({ error: "Titolo e cliente richiesti" }, { status: 400 });
  }

  try {
    const quote = await createWebQuote(body, user.id);
    return NextResponse.json(quote, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore durante la creazione" },
      { status: 500 }
    );
  }
}
