import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const q = (new URL(request.url).searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({
      clients: [],
      leads: [],
      deals: [],
      tickets: [],
      sales: [],
      actions: [],
    });
  }

  const [clients, leads, deals, tickets, sales] = await Promise.all([
    prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, companyName: true, email: true, status: true },
    }),
    prisma.lead.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { contactName: { contains: q, mode: "insensitive" } },
          { contactEmail: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, status: true, value: true },
    }),
    prisma.deal.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { client: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, status: true, value: true },
    }),
    prisma.ticket.findMany({
      where: {
        OR: [
          { subject: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: { id: true, subject: true, code: true, status: true, priority: true },
    }),
    prisma.expressSale.findMany({
      where: {
        OR: [
          ...(Number.isFinite(Number(q)) ? [{ receiptNumber: Number(q) }] : []),
          { client: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 5,
      orderBy: { soldAt: "desc" },
      select: {
        id: true,
        receiptNumber: true,
        total: true,
        status: true,
        client: { select: { name: true } },
      },
    }),
  ]);

  const actions = [];
  const lower = q.toLowerCase();
  if (["nuov", "vend", "pos", "sale"].some((k) => lower.includes(k))) {
    actions.push({
      id: "new-sale",
      label: "Nuova vendita Express",
      href: "/services/express?view=pos",
      shortcut: "V",
    });
  }
  if (["ticket", "assist", "support"].some((k) => lower.includes(k))) {
    actions.push({
      id: "new-ticket",
      label: "Nuovo ticket",
      href: "/services/tickets",
      shortcut: "T",
    });
  }
  if (["client", "lead", "crm"].some((k) => lower.includes(k))) {
    actions.push({
      id: "new-lead",
      label: "Nuovo lead Business",
      href: "/business",
      shortcut: "L",
    });
  }

  return NextResponse.json({ clients, leads, deals, tickets, sales, actions });
}
