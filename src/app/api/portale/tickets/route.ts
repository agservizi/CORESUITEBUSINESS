import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { getClientIdForUser } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { createPortaleLead, notifyBusinessEvent } from "@/lib/business-wow";
import type { Priority, TicketType } from "@/generated/prisma";

function nextCode(prefix: string) {
  const n = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix}-${n}`;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const clientId = await getClientIdForUser(auth.user);

  const where =
    auth.user.role === "CLIENTE" && clientId
      ? { OR: [{ clientId }, { customerEmail: auth.user.email }] }
      : auth.user.role === "CLIENTE"
        ? { customerEmail: auth.user.email }
        : undefined;

  const items = await prisma.ticket.findMany({
    where,
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const clientId = await getClientIdForUser(auth.user);
  const body = await request.json();
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();
  const type = (body.type as TicketType) || "SUPPORT";
  const priority = (body.priority as Priority) || "MEDIUM";

  if (!subject) {
    return NextResponse.json({ error: "Oggetto obbligatorio" }, { status: 400 });
  }

  const ticket = await prisma.ticket.create({
    data: {
      code: nextCode("TK"),
      subject,
      clientId: clientId ?? undefined,
      customerEmail: auth.user.email,
      customerName: auth.user.name ?? undefined,
      type,
      priority,
      channel: "PORTAL",
      createdById: auth.user.id,
    },
  });

  if (message) {
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: auth.user.id,
        authorName: auth.user.name || auth.user.email,
        body: message,
        statusSnapshot: ticket.status,
      },
    });
  }

  if (body.createLead && clientId) {
    await createPortaleLead({
      clientId,
      title: subject,
      message,
      contactName: auth.user.name ?? undefined,
      contactEmail: auth.user.email,
      userId: auth.user.id,
    });
  } else {
    await notifyBusinessEvent({
      title: "Nuovo ticket portale",
      body: `${auth.user.name || auth.user.email}: ${subject}`,
      type: "business_ticket_portal",
      link: `/services/tickets?id=${ticket.id}`,
      notifyStaff: true,
    });
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
