import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  deleteWebQuote,
  getWebQuote,
  markWebQuoteSent,
  updateWebQuote,
} from "@/lib/business/web-quote-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  try {
    const quote = await getWebQuote(id);
    if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
    return NextResponse.json(quote);
  } catch (e) {
    console.error("[preventivi GET id]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore caricamento preventivo" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();

  if (body.action === "mark_sent") {
    const quote = await markWebQuoteSent(id);
    return NextResponse.json(quote);
  }

  if (!body.title?.trim() || !body.clientId) {
    return NextResponse.json({ error: "Titolo e cliente richiesti" }, { status: 400 });
  }

  try {
    const quote = await updateWebQuote(id, body);
    return NextResponse.json(quote);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Errore durante l'aggiornamento" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  await deleteWebQuote(id);
  return NextResponse.json({ success: true });
}
