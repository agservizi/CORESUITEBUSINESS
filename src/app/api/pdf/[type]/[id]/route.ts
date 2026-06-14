import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import {
  generatePracticePdf,
  generateTicketPdf,
  generateCashMovementPdf,
} from "@/lib/pdf";

export const GET = withApi(
  async (_request, { params }) => {
    const type = params?.type;
    const id = params?.id;
    if (!type || !id) {
      return NextResponse.json({ error: "Parametri richiesti" }, { status: 400 });
    }

    let buffer: Buffer;

    switch (type) {
      case "practice": {
        const practice = await prisma.practice.findUnique({
          where: { id },
          include: { client: { select: { name: true } } },
        });
        if (!practice) return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });
        buffer = await generatePracticePdf({
          code: practice.code,
          practiceType: practice.practiceType,
          clientName: practice.client.name,
          category: practice.category,
          status: practice.status,
          notes: practice.notes ?? undefined,
        });
        break;
      }
      case "ticket": {
        const ticket = await prisma.ticket.findUnique({
          where: { id },
          include: { client: { select: { name: true } } },
        });
        if (!ticket) return NextResponse.json({ error: "Ticket non trovato" }, { status: 404 });
        buffer = await generateTicketPdf({
          code: ticket.code,
          subject: ticket.subject,
          clientName: ticket.client?.name || ticket.customerName || "—",
          status: ticket.status,
          priority: ticket.priority,
        });
        break;
      }
      case "cash-movement": {
        const movement = await prisma.cashMovement.findUnique({
          where: { id },
          include: { client: { select: { name: true } } },
        });
        if (!movement) return NextResponse.json({ error: "Movimento non trovato" }, { status: 404 });
        buffer = await generateCashMovementPdf({
          description: movement.description,
          type: movement.type,
          clientName: movement.client?.name || "—",
          amount: `€ ${Number(movement.amount).toFixed(2)}`,
          status: movement.status,
          method: movement.method,
        });
        break;
      }
      default:
        return NextResponse.json({ error: "Tipo PDF non supportato" }, { status: 400 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${type}-${id}.pdf"`,
      },
    });
  },
  { requireCsrf: false }
);
