import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { duplicateWebQuote } from "@/lib/business/web-quote-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  const quote = await duplicateWebQuote(id, user.id);
  if (!quote) return NextResponse.json({ error: "Preventivo non trovato" }, { status: 404 });
  return NextResponse.json(quote, { status: 201 });
}
