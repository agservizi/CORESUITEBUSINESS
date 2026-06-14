import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { MorosityScore } from "@/generated/prisma";
import { notifyBusinessEvent } from "@/lib/business-wow";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      leads: {
        include: { stage: { select: { name: true, color: true } } },
        orderBy: { createdAt: "desc" },
      },
      deals: { orderBy: { createdAt: "desc" } },
      notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      activities: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;
  const data = await request.json();

  const morosityChanged =
    data.morosityFlag !== undefined ||
    data.morosityScore !== undefined ||
    data.morosityNote !== undefined;

  const prevClient = morosityChanged
    ? await prisma.client.findUnique({ where: { id }, select: { morosityScore: true, name: true } })
    : null;

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.companyName !== undefined && { companyName: data.companyName }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.website !== undefined && { website: data.website }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.vatNumber !== undefined && { vatNumber: data.vatNumber }),
      ...(data.taxCode !== undefined && { taxCode: data.taxCode }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.morosityFlag !== undefined && { morosityFlag: Boolean(data.morosityFlag) }),
      ...(data.morosityScore !== undefined && { morosityScore: data.morosityScore as MorosityScore }),
      ...(data.morosityNote !== undefined && { morosityNote: data.morosityNote }),
    },
  });

  if (morosityChanged && data.morosityScore) {
    await prisma.morosityLog.create({
      data: {
        clientId: id,
        userId: user.id,
        score: data.morosityScore as MorosityScore,
        source: data.morositySource ? String(data.morositySource) : "manual",
        note: data.morosityNote ? String(data.morosityNote) : undefined,
      },
    });
  }

  if (
    prevClient &&
    data.morosityScore === "BLOCCATO" &&
    prevClient.morosityScore !== "BLOCCATO"
  ) {
    await notifyBusinessEvent({
      title: "Cliente bloccato per morosità",
      body: `${prevClient.name} — impatto su Express e vendite`,
      type: "business_morosity_blocked",
      link: `/business?v=clienti&id=${id}`,
      notifyStaff: true,
    });
  }

  return NextResponse.json(client);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;
  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
