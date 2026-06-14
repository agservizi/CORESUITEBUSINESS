import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const clientId = searchParams.get("clientId") || undefined;

  const where = {
    ...(status && { status: status as "OPEN" | "WON" | "LOST" | "ON_HOLD" }),
    ...(clientId && { clientId }),
  };

  const deals = await prisma.deal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true, companyName: true } },
    },
  });

  return NextResponse.json({ deals });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const data = await request.json();
  if (!data.title || !data.clientId) {
    return NextResponse.json({ error: "Titolo e cliente richiesti" }, { status: 400 });
  }

  const deal = await prisma.deal.create({
    data: {
      title: String(data.title),
      clientId: String(data.clientId),
      value: Number(data.value) || 0,
      currency: data.currency ? String(data.currency) : "EUR",
      status: data.status || "OPEN",
      probability: data.probability !== undefined ? Number(data.probability) : 50,
      expectedClose: data.expectedClose ? new Date(data.expectedClose) : undefined,
    },
    include: {
      client: { select: { name: true, companyName: true } },
    },
  });

  return NextResponse.json(deal, { status: 201 });
}
