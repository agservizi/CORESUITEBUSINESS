import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyBusinessEvent } from "@/lib/business-wow";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!lead) return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
  if (!lead.clientId) {
    return NextResponse.json({ error: "Collega un cliente al lead prima di convertirlo in deal" }, { status: 400 });
  }

  const deal = await prisma.deal.create({
    data: {
      title: lead.title,
      clientId: lead.clientId,
      value: lead.value ?? 0,
      status: "OPEN",
      probability: 50,
      expectedClose: lead.expectedClose ?? undefined,
    },
    include: {
      client: { select: { id: true, name: true, companyName: true } },
    },
  });

  await prisma.lead.update({
    where: { id },
    data: { status: "WON" },
  });

  await notifyBusinessEvent({
    title: "Lead convertito in deal",
    body: `${lead.title} → deal €${(lead.value ?? 0).toLocaleString("it-IT")}`,
    type: "business_deal_created",
    link: `/business?v=deals&id=${deal.id}`,
    notifyStaff: true,
  });

  return NextResponse.json(deal, { status: 201 });
}
