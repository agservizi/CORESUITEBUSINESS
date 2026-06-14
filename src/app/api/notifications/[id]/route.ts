import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";

export const PATCH = withApi(async (request, { user, params }) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const read = body.read !== false;

  const existing = await prisma.notification.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Notifica non trovata" }, { status: 404 });

  const updated = await prisma.notification.update({
    where: { id },
    data: { read },
    select: {
      id: true,
      title: true,
      body: true,
      type: true,
      read: true,
      link: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ notification: updated });
});
