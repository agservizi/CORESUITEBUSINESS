import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { content, clientId, leadId, dealId } = await request.json();
  if (!content?.trim()) return NextResponse.json({ error: "Contenuto richiesto" }, { status: 400 });

  const note = await prisma.note.create({
    data: {
      content: content.trim(),
      authorId: user.id,
      ...(clientId && { clientId }),
      ...(leadId && { leadId }),
      ...(dealId && { dealId }),
    },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json(note, { status: 201 });
}
