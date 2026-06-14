import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return withApi(async (req, { user }) => {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        assignedTo: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, companyName: true } },
      },
    });
    if (!ticket) return NextResponse.json({ error: "Ticket non trovato" }, { status: 404 });
    return NextResponse.json({ item: ticket });
  }, { requireCsrf: false })(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return withApi(async (req, { user }) => {
    const body = await req.json();
    const { action, body: messageBody, status, assignedToId } = body;

    if (action === "reply" && messageBody) {
      const msg = await prisma.ticketMessage.create({
        data: {
          ticketId: id,
          authorId: user.id,
          authorName: user.name || user.email,
          body: String(messageBody),
          isInternal: Boolean(body.isInternal),
        },
      });
      await prisma.ticket.update({
        where: { id },
        data: { lastMessageAt: new Date() },
      });
      return NextResponse.json({ message: msg });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (assignedToId !== undefined) {
      updateData.assignedToId = assignedToId || null;
    }

    if (Object.keys(updateData).length) {
      const ticket = await prisma.ticket.update({ where: { id }, data: updateData });
      return NextResponse.json({ item: ticket });
    }

    return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
  })(request);
}
