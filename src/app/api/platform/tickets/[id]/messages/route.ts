import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { auditAction } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";

export const GET = withApi(
  async (_request, { params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });

    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { name: true, email: true } } },
    });

    return NextResponse.json({ messages });
  },
  { requireCsrf: false, serviceSlug: "tickets" }
);

export const POST = withApi(
  async (request, { user, params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: "Ticket non trovato" }, { status: 404 });

    const body = await request.json();
    if (!body.body) {
      return NextResponse.json({ error: "Messaggio richiesto" }, { status: 400 });
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        authorId: user.id,
        authorName: user.name || user.email,
        body: String(body.body),
        isInternal: Boolean(body.isInternal),
        statusSnapshot: body.statusSnapshot ? String(body.statusSnapshot) : ticket.status,
      },
    });

    await prisma.ticket.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        ...(body.status && { status: body.status }),
      },
    });

    await auditAction(request, user.id, "CREATE", "ticket-message", message.id, { ticketId: id });

    return NextResponse.json({ message }, { status: 201 });
  },
  { serviceSlug: "tickets" }
);
