import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyBusinessEvent } from "@/lib/business-wow";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      client: { select: { name: true, companyName: true, email: true } },
      notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      activities: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!deal) return NextResponse.json({ error: "Deal non trovato" }, { status: 404 });
  return NextResponse.json(deal);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;
  const data = await request.json();

  const prev = await prisma.deal.findUnique({ where: { id }, select: { status: true, title: true, value: true } });

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.clientId !== undefined && { clientId: data.clientId }),
      ...(data.value !== undefined && { value: Number(data.value) }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.probability !== undefined && { probability: Number(data.probability) }),
      ...(data.expectedClose !== undefined && {
        expectedClose: data.expectedClose ? new Date(data.expectedClose) : null,
      }),
      ...(data.status === "WON" || data.status === "LOST"
        ? { closedAt: new Date() }
        : data.closedAt === null
          ? { closedAt: null }
          : {}),
    },
    include: {
      client: { select: { name: true, companyName: true } },
    },
  });

  if (data.status && prev && data.status !== prev.status) {
    if (data.status === "WON") {
      await notifyBusinessEvent({
        title: "Deal vinto!",
        body: `${deal.title} — €${deal.value.toLocaleString("it-IT")}`,
        type: "business_deal_won",
        link: `/business?v=deals&id=${deal.id}`,
        notifyStaff: true,
      });
    } else if (data.status === "LOST") {
      await notifyBusinessEvent({
        title: "Deal perso",
        body: deal.title,
        type: "business_deal_lost",
        link: `/business?v=deals&id=${deal.id}`,
        notifyStaff: true,
      });
    }
  }

  return NextResponse.json(deal);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  await prisma.deal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
