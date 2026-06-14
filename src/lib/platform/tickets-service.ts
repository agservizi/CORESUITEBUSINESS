import { prisma } from "@/lib/prisma";
import type { Prisma, TicketChannel, TicketStatus, Priority } from "@/generated/prisma";

const OPEN_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "WAITING_PARTNER",
];

const CLOSED_STATUSES: TicketStatus[] = ["RESOLVED", "CLOSED", "ARCHIVED"];

export interface TicketRow {
  id: string;
  code: string;
  subject: string;
  status: string;
  priority: string;
  type: string;
  channel: string;
  customerName?: string | null;
  customerEmail?: string | null;
  slaDueAt?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; name: string | null; email: string } | null;
  _count?: { messages: number };
}

function serializeTicket(t: Record<string, unknown>): TicketRow {
  const assigned = t.assignedTo as TicketRow["assignedTo"];
  const count = t._count as { messages?: number } | undefined;
  return {
    id: String(t.id),
    code: String(t.code),
    subject: String(t.subject),
    status: String(t.status),
    priority: String(t.priority),
    type: String(t.type),
    channel: String(t.channel ?? "INTERNAL"),
    customerName: t.customerName as string | null,
    customerEmail: t.customerEmail as string | null,
    slaDueAt: t.slaDueAt ? new Date(String(t.slaDueAt)).toISOString() : null,
    lastMessageAt: t.lastMessageAt ? new Date(String(t.lastMessageAt)).toISOString() : null,
    createdAt: new Date(String(t.createdAt)).toISOString(),
    updatedAt: new Date(String(t.updatedAt)).toISOString(),
    assignedTo: assigned ?? null,
    _count: count ? { messages: count.messages ?? 0 } : undefined,
  };
}

export function buildTicketWhere(view: string, q?: string): Prisma.TicketWhereInput {
  const now = new Date();
  const in4h = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const where: Prisma.TicketWhereInput = {};

  switch (view) {
    case "aperti":
      where.status = { in: OPEN_STATUSES };
      break;
    case "urgenti":
      where.status = { in: OPEN_STATUSES };
      where.priority = "URGENT";
      break;
    case "in_lavorazione":
      where.status = "IN_PROGRESS";
      break;
    case "sla":
      where.status = { in: OPEN_STATUSES };
      where.slaDueAt = { not: null };
      break;
    case "sla_rischio":
      where.status = { in: OPEN_STATUSES };
      where.slaDueAt = { lte: in4h, gte: now };
      break;
    case "sla_scaduti":
      where.status = { in: OPEN_STATUSES };
      where.slaDueAt = { lt: now };
      break;
    case "chiusi":
      where.status = { in: CLOSED_STATUSES };
      break;
    case "portale":
      where.channel = "PORTAL";
      break;
    case "email":
      where.channel = "EMAIL";
      break;
    case "telefono":
      where.channel = "PHONE";
      break;
    default:
      break;
  }

  if (q?.trim()) {
    const term = q.trim();
    where.OR = [
      { code: { contains: term, mode: "insensitive" } },
      { subject: { contains: term, mode: "insensitive" } },
      { customerName: { contains: term, mode: "insensitive" } },
      { customerEmail: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listTickets(opts: {
  view?: string;
  q?: string;
  page?: number;
  limit?: number;
  channel?: TicketChannel;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 25));
  const view = opts.view ?? "elenco";
  const where = buildTicketWhere(view, opts.q);
  if (opts.channel) where.channel = opts.channel;

  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    items: rows.map((r) => serializeTicket(r as unknown as Record<string, unknown>)),
    total,
    page,
    limit,
  };
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getTicketStats() {
  const now = new Date();
  const todayStart = startOfDay();
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  const in4h = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const [
    total,
    open,
    closed,
    today,
    urgent,
    slaBreached,
    slaAtRisk,
    unassigned,
    byStatus,
    byPriority,
    byChannel,
    recent,
    trendRows,
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: { in: OPEN_STATUSES } } }),
    prisma.ticket.count({ where: { status: { in: CLOSED_STATUSES } } }),
    prisma.ticket.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.ticket.count({ where: { status: { in: OPEN_STATUSES }, priority: "URGENT" } }),
    prisma.ticket.count({
      where: { status: { in: OPEN_STATUSES }, slaDueAt: { lt: now } },
    }),
    prisma.ticket.count({
      where: { status: { in: OPEN_STATUSES }, slaDueAt: { gte: now, lte: in4h } },
    }),
    prisma.ticket.count({
      where: { status: { in: OPEN_STATUSES }, assignedToId: null },
    }),
    prisma.ticket.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ["priority"], _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ["channel"], _count: { _all: true } }),
    prisma.ticket.findMany({
      take: 8,
      orderBy: { updatedAt: "desc" },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.ticket.findMany({
      where: { createdAt: { gte: daysAgo(7) } },
      select: { createdAt: true, status: true },
    }),
  ]);

  const trendMap = new Map<string, { opened: number; resolved: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i);
    const key = d.toISOString().slice(0, 10);
    trendMap.set(key, { opened: 0, resolved: 0 });
  }
  for (const r of trendRows) {
    const key = new Date(r.createdAt).toISOString().slice(0, 10);
    const bucket = trendMap.get(key);
    if (bucket) bucket.opened += 1;
    if (CLOSED_STATUSES.includes(r.status as TicketStatus)) {
      const bk = trendMap.get(key);
      if (bk) bk.resolved += 1;
    }
  }
  const trend = [...trendMap.entries()].map(([day, v]) => ({
    day: new Date(day).toLocaleDateString("it-IT", { weekday: "short", day: "numeric" }),
    opened: v.opened,
    resolved: v.resolved,
  }));

  const resolutionRate = total ? Math.round((closed / total) * 100) : 0;

  return {
    total,
    open,
    closed,
    today,
    urgent,
    slaBreached,
    slaAtRisk,
    unassigned,
    resolutionRate,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
    byPriority: Object.fromEntries(byPriority.map((p) => [p.priority, p._count._all])),
    byChannel: Object.fromEntries(byChannel.map((c) => [c.channel, c._count._all])),
    recent: recent.map((r) => serializeTicket(r as unknown as Record<string, unknown>)),
    trend,
  };
}

export interface TicketSuggestion {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  body: string;
  viewId: string;
  ticketId?: string;
}

export async function getTicketInsights(): Promise<{
  suggestions: TicketSuggestion[];
  hot: TicketRow[];
  stale: TicketRow[];
}> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const [slaBreached, urgent, unassigned, staleRows, hotRows] = await Promise.all([
    prisma.ticket.count({
      where: { status: { in: OPEN_STATUSES }, slaDueAt: { lt: now } },
    }),
    prisma.ticket.count({
      where: { status: { in: OPEN_STATUSES }, priority: "URGENT" },
    }),
    prisma.ticket.count({
      where: { status: { in: OPEN_STATUSES }, assignedToId: null },
    }),
    prisma.ticket.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        updatedAt: { lt: staleBefore },
      },
      take: 5,
      orderBy: { updatedAt: "asc" },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.ticket.findMany({
      where: { status: { in: OPEN_STATUSES }, priority: { in: ["URGENT", "HIGH"] } },
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
      },
    }),
  ]);

  const suggestions: TicketSuggestion[] = [];
  if (slaBreached > 0) {
    suggestions.push({
      id: "sla",
      priority: "high",
      title: `${slaBreached} SLA scaduti`,
      body: "Ticket aperti oltre la scadenza SLA — intervieni subito.",
      viewId: "sla_scaduti",
    });
  }
  if (urgent > 0) {
    suggestions.push({
      id: "urgent",
      priority: "high",
      title: `${urgent} ticket urgenti`,
      body: "Priorità massima in coda di lavorazione.",
      viewId: "urgenti",
    });
  }
  if (unassigned > 0) {
    suggestions.push({
      id: "unassigned",
      priority: "medium",
      title: `${unassigned} senza assegnatario`,
      body: "Assegna un operatore per accelerare la risoluzione.",
      viewId: "aperti",
    });
  }
  if (suggestions.length === 0) {
    suggestions.push({
      id: "ok",
      priority: "low",
      title: "Coda sotto controllo",
      body: "Nessun alert critico al momento.",
      viewId: "dashboard",
    });
  }

  return {
    suggestions,
    hot: hotRows.map((r) => serializeTicket(r as unknown as Record<string, unknown>)),
    stale: staleRows.map((r) => serializeTicket(r as unknown as Record<string, unknown>)),
  };
}

export { OPEN_STATUSES, CLOSED_STATUSES };
