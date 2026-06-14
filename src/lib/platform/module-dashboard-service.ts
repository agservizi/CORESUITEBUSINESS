import { prisma } from "@/lib/prisma";
import { getModuleMeta } from "@/config/module-meta";
import { isPlatformModule } from "@/lib/platform/module-crud";

export interface ModuleDashboardKpi {
  key: string;
  label: string;
  value: number | string;
  hint?: string;
}

export interface ModuleDashboardInsight {
  id: string;
  severity: "info" | "warning" | "success";
  title: string;
  body: string;
}

export interface ModuleDashboardData {
  moduleKey: string;
  tagline: string;
  kpis: ModuleDashboardKpi[];
  statusBreakdown: { status: string; count: number }[];
  recent: Record<string, unknown>[];
  insights: ModuleDashboardInsight[];
  updatedAt: string;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function getModuleDashboard(moduleKey: string): Promise<ModuleDashboardData> {
  if (!isPlatformModule(moduleKey)) {
    throw new Error("Modulo non supportato");
  }

  const meta = getModuleMeta(moduleKey);
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  switch (moduleKey) {
    case "tickets":
      return buildDashboard(moduleKey, meta, await ticketStats(todayStart, todayEnd));
    case "appuntamenti":
      return buildDashboard(moduleKey, meta, await appointmentStats(todayStart, todayEnd));
    case "caf-patronato":
      return buildDashboard(moduleKey, meta, await practiceStats(todayStart, todayEnd));
    case "energia":
      return buildDashboard(moduleKey, meta, await energyStats());
    case "anpr":
      return buildDashboard(moduleKey, meta, await anprStats());
    case "cie":
      return buildDashboard(moduleKey, meta, await cieStats(todayStart, todayEnd));
    case "visure-cr":
      return buildDashboard(moduleKey, meta, await visureStats());
    case "brt":
      return buildDashboard(moduleKey, meta, await brtStats());
    case "logistica":
      return buildDashboard(moduleKey, meta, await logisticaStats());
    case "marketing":
      return buildDashboard(moduleKey, meta, await marketingStats());
    case "fedelta":
      return buildDashboard(moduleKey, meta, await fedeltaStats());
    case "curriculum":
      return buildDashboard(moduleKey, meta, await curriculumStats());
    case "aci":
      return buildDashboard(moduleKey, meta, await aciStats());
    case "telegrammi":
      return buildDashboard(moduleKey, meta, await telegramStats());
    case "posta-telematica":
      return buildDashboard(moduleKey, meta, await pecStats());
    default:
      throw new Error(`Dashboard non disponibile per ${moduleKey}`);
  }
}

type StatsBundle = {
  total: number;
  pending: number;
  completed: number;
  today: number;
  breakdown: { status: string; count: number }[];
  recent: Record<string, unknown>[];
  extraKpis?: ModuleDashboardKpi[];
  insights?: ModuleDashboardInsight[];
};

function buildDashboard(
  moduleKey: string,
  meta: ReturnType<typeof getModuleMeta>,
  stats: StatsBundle
): ModuleDashboardData {
  const kpis: ModuleDashboardKpi[] = [
    { key: "total", label: "Totale", value: stats.total },
    { key: "pending", label: meta.pendingLabel, value: stats.pending },
    { key: "completed", label: meta.completedLabel, value: stats.completed },
    { key: "today", label: "Oggi", value: stats.today },
    ...(stats.extraKpis ?? []),
  ];

  const insights: ModuleDashboardInsight[] = [...(stats.insights ?? [])];
  if (stats.pending > 0) {
    insights.unshift({
      id: "pending",
      severity: stats.pending > 10 ? "warning" : "info",
      title: `${stats.pending} ${meta.pendingLabel.toLowerCase()}`,
      body: "Apri l'elenco per gestire le pratiche in sospeso.",
    });
  }
  if (stats.today > 0) {
    insights.push({
      id: "today",
      severity: "success",
      title: `${stats.today} nuovi oggi`,
      body: "Attività registrate nella giornata corrente.",
    });
  }

  return {
    moduleKey,
    tagline: meta.tagline,
    kpis,
    statusBreakdown: stats.breakdown,
    recent: stats.recent,
    insights,
    updatedAt: new Date().toISOString(),
  };
}

async function groupByStatus<T extends { status: string }>(
  findMany: () => Promise<T[]>,
  count: () => Promise<number>,
  pendingStatuses: string[],
  completedStatuses: string[],
  recentSelect: (rows: T[]) => Record<string, unknown>[],
  todayFilter?: () => Promise<number>
): Promise<StatsBundle> {
  const [rows, total, today] = await Promise.all([
    findMany(),
    count(),
    todayFilter ? todayFilter() : Promise.resolve(0),
  ]);
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.status, (map.get(r.status) ?? 0) + 1);
  }
  const breakdown = [...map.entries()].map(([status, c]) => ({ status, count: c }));
  const pending = rows.filter((r) => pendingStatuses.includes(r.status)).length;
  const completed = rows.filter((r) => completedStatuses.includes(r.status)).length;
  return {
    total,
    pending,
    completed,
    today,
    breakdown,
    recent: recentSelect(rows.slice(0, 8)),
  };
}

async function ticketStats(todayStart: Date, todayEnd: Date) {
  const open = ["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "WAITING_PARTNER"];
  const closed = ["RESOLVED", "CLOSED"];
  const [total, today, rows, urgent] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.ticket.findMany({ orderBy: { updatedAt: "desc" }, take: 50 }),
    prisma.ticket.count({ where: { status: { in: open as never }, priority: "URGENT" } }),
  ]);
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.status, (map.get(r.status) ?? 0) + 1);
  return {
    total,
    pending: rows.filter((r) => open.includes(r.status)).length,
    completed: rows.filter((r) => closed.includes(r.status)).length,
    today,
    breakdown: [...map.entries()].map(([status, count]) => ({ status, count })),
    recent: rows.slice(0, 8).map((r) => ({
      id: r.id,
      code: r.code,
      subject: r.subject,
      status: r.status,
      priority: r.priority,
      updatedAt: r.updatedAt,
    })),
    extraKpis: urgent ? [{ key: "urgent", label: "Urgenti", value: urgent }] : [],
    insights: urgent
      ? [{ id: "urgent", severity: "warning" as const, title: `${urgent} ticket urgenti`, body: "Intervieni subito sui ticket URGENT." }]
      : [],
  };
}

async function appointmentStats(todayStart: Date, todayEnd: Date) {
  const pending = ["Programmato", "Confermato"];
  const done = ["Completato"];
  const [total, today, upcoming, rows] = await Promise.all([
    prisma.appointment.count(),
    prisma.appointment.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.appointment.count({ where: { startsAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.appointment.findMany({ orderBy: { startsAt: "desc" }, take: 50, include: { client: { select: { name: true } } } }),
  ]);
  return {
    total,
    pending: rows.filter((r) => pending.includes(r.status)).length,
    completed: rows.filter((r) => done.includes(r.status)).length,
    today: upcoming,
    breakdown: groupStatus(rows),
    recent: rows.slice(0, 8).map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      startsAt: r.startsAt,
      clientName: r.client?.name,
    })),
    extraKpis: [{ key: "todaySlots", label: "Appuntamenti oggi", value: upcoming }],
  };
}

async function practiceStats(todayStart: Date, todayEnd: Date) {
  const pending = ["BOZZA", "IN_LAVORAZIONE", "INVIATA"];
  const done = ["COMPLETATA"];
  const [total, today, rows] = await Promise.all([
    prisma.practice.count(),
    prisma.practice.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.practice.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { client: { select: { name: true } } },
    }),
  ]);
  return {
    total,
    pending: rows.filter((r) => pending.includes(r.status)).length,
    completed: rows.filter((r) => done.includes(r.status)).length,
    today,
    breakdown: groupStatus(rows),
    recent: rows.slice(0, 8).map((r) => ({
      id: r.id,
      code: r.code,
      practiceType: r.practiceType,
      status: r.status,
      category: r.category,
      clientName: r.client?.name,
    })),
  };
}

async function energyStats() {
  const pending = ["In attivazione", "In lavorazione"];
  const done = ["Attivo", "Completato"];
  const rows = await prisma.energyContract.findMany({ orderBy: { updatedAt: "desc" }, take: 50 });
  return simpleStringStats(rows, pending, done, (r) => ({
    id: r.id,
    supplier: r.supplier,
    pod: r.pod,
    status: r.status,
  }));
}

async function anprStats() {
  const pending = ["In attesa", "In lavorazione"];
  const done = ["Completato"];
  const rows = await prisma.anprRequest.findMany({ orderBy: { updatedAt: "desc" }, take: 50, include: { client: { select: { name: true } } } });
  return simpleStringStats(rows, pending, done, (r) => ({
    id: r.id,
    requestType: r.requestType,
    status: r.status,
    clientName: r.client?.name,
  }));
}

async function cieStats(todayStart: Date, todayEnd: Date) {
  const pending = ["Prenotato", "In attesa"];
  const done = ["Completato"];
  const today = await prisma.cieBooking.count({ where: { slotAt: { gte: todayStart, lte: todayEnd } } });
  const rows = await prisma.cieBooking.findMany({ orderBy: { slotAt: "desc" }, take: 50, include: { client: { select: { name: true } } } });
  const base = simpleStringStats(rows, pending, done, (r) => ({
    id: r.id,
    slotAt: r.slotAt,
    status: r.status,
    clientName: r.client?.name,
  }));
  return { ...base, today, extraKpis: [{ key: "slotsToday", label: "Slot oggi", value: today }] };
}

async function visureStats() {
  const pending = ["Richiesta", "In lavorazione"];
  const done = ["Completato", "Consegnato"];
  const rows = await prisma.visureCase.findMany({ orderBy: { updatedAt: "desc" }, take: 50 });
  return simpleStringStats(rows, pending, done, (r) => ({ id: r.id, caseType: r.caseType, status: r.status }));
}

async function brtStats() {
  const pending = ["REGISTRATO", "IN_ATTESA", "SPEDITO", "IN_TRANSITO"];
  const done = ["CONSEGNATO"];
  const rows = await prisma.shipment.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return {
    total: await prisma.shipment.count(),
    pending: rows.filter((r) => pending.includes(r.status)).length,
    completed: rows.filter((r) => done.includes(r.status)).length,
    today: await prisma.shipment.count({ where: { createdAt: { gte: startOfDay() } } }),
    breakdown: groupStatus(rows),
    recent: rows.slice(0, 8).map((r) => ({
      id: r.id,
      trackingCode: r.trackingCode,
      recipientName: r.recipientName,
      status: r.status,
    })),
  };
}

async function logisticaStats() {
  const pending = ["SEGNALATO", "RICEVUTO", "PRONTO"];
  const done = ["RITIRATO"];
  const rows = await prisma.pickupPackage.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return {
    total: await prisma.pickupPackage.count(),
    pending: rows.filter((r) => pending.includes(r.status)).length,
    completed: rows.filter((r) => done.includes(r.status)).length,
    today: await prisma.pickupPackage.count({ where: { createdAt: { gte: startOfDay() } } }),
    breakdown: groupStatus(rows),
    recent: rows.slice(0, 8).map((r) => ({
      id: r.id,
      senderName: r.senderName,
      description: r.description,
      status: r.status,
    })),
  };
}

async function marketingStats() {
  const [subs, campaigns, drafts, sent] = await Promise.all([
    prisma.emailSubscriber.count(),
    prisma.emailCampaign.count(),
    prisma.emailCampaign.count({ where: { status: "DRAFT" } }),
    prisma.emailCampaign.count({ where: { status: "SENT" } }),
  ]);
  const recentCampaigns = await prisma.emailCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 8 });
  return {
    total: subs,
    pending: drafts,
    completed: sent,
    today: await prisma.emailSubscriber.count({ where: { createdAt: { gte: startOfDay() } } }),
    breakdown: [
      { status: "DRAFT", count: drafts },
      { status: "SENT", count: sent },
    ],
    recent: recentCampaigns.map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      status: c.status,
      recipientCount: c.recipientCount,
    })),
    extraKpis: [{ key: "campaigns", label: "Campagne", value: campaigns }],
  };
}

async function fedeltaStats() {
  const rows = await prisma.loyaltyPoint.findMany({
    orderBy: { movedAt: "desc" },
    take: 50,
    include: { client: { select: { name: true } } },
  });
  const rewards = await prisma.loyaltyReward.count({ where: { isActive: true } });
  const balances = await prisma.loyaltyPoint.groupBy({
    by: ["clientId"],
    _sum: { points: true },
  });
  const totalPoints = balances.reduce((s, r) => s + (r._sum.points ?? 0), 0);
  return {
    total: rows.length,
    pending: rows.filter((r) => r.movementType === "accredito").length,
    completed: rows.filter((r) => r.movementType === "riscatto").length,
    today: await prisma.loyaltyPoint.count({ where: { movedAt: { gte: startOfDay() } } }),
    breakdown: [],
    recent: rows.slice(0, 8).map((r) => ({
      id: r.id,
      points: r.points,
      reason: r.description || r.reason,
      clientName: r.client?.name,
      movementType: r.movementType,
    })),
    extraKpis: [
      { key: "points", label: "Punti in circolazione", value: totalPoints },
      { key: "rewards", label: "Premi attivi", value: rewards },
    ],
  };
}

async function curriculumStats() {
  const pending = ["Bozza", "In lavorazione"];
  const done = ["Consegnato", "Completato"];
  const rows = await prisma.curriculumRecord.findMany({ orderBy: { updatedAt: "desc" }, take: 50 });
  return simpleStringStats(rows, pending, done, (r) => ({ id: r.id, title: r.title, status: r.status }));
}

async function aciStats() {
  const pending = ["In lavorazione", "In attesa"];
  const done = ["Completato"];
  const rows = await prisma.aciPractice.findMany({ orderBy: { updatedAt: "desc" }, take: 50 });
  return simpleStringStats(rows, pending, done, (r) => ({
    id: r.id,
    practiceType: r.practiceType,
    plate: r.plate,
    status: r.status,
  }));
}

async function telegramStats() {
  const pending = ["In coda", "In lavorazione"];
  const done = ["Inviato"];
  const rows = await prisma.telegramRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return simpleStringStats(rows, pending, done, (r) => ({
    id: r.id,
    recipient: r.recipient,
    senderName: r.senderName,
    status: r.status,
  }));
}

async function pecStats() {
  const rows = await prisma.pecMailbox.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  const active = rows.filter((r) => r.status === "Attiva" || r.status === "ACTIVE").length;
  return {
    total: rows.length,
    pending: active,
    completed: rows.length - active,
    today: await prisma.pecMailbox.count({ where: { createdAt: { gte: startOfDay() } } }),
    breakdown: groupStatus(rows),
    recent: rows.slice(0, 8).map((r) => ({
      id: r.id,
      address: r.address,
      provider: r.provider,
      status: r.status,
    })),
  };
}

function groupStatus(rows: { status: string }[]) {
  const map = new Map<string, number>();
  for (const r of rows) map.set(String(r.status), (map.get(String(r.status)) ?? 0) + 1);
  return [...map.entries()].map(([status, count]) => ({ status, count }));
}

function simpleStringStats<T extends { status: string }>(
  rows: T[],
  pending: string[],
  done: string[],
  mapRecent: (r: T) => Record<string, unknown>
): StatsBundle {
  return {
    total: rows.length,
    pending: rows.filter((r) => pending.includes(r.status)).length,
    completed: rows.filter((r) => done.includes(r.status)).length,
    today: 0,
    breakdown: groupStatus(rows),
    recent: rows.slice(0, 8).map(mapRecent),
  };
}
