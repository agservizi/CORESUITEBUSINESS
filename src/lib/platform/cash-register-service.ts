import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export interface CashDayJournal {
  businessDate: string;
  generatedAt: string;
  openedBy: string;
  closedBy?: string;
  opening: { amount: number; notes?: string | null; at: string };
  closing?: {
    amount: number;
    expected: number;
    variance: number;
    notes?: string | null;
    at: string;
  };
  summary: {
    totalEntrate: number;
    totalUscite: number;
    saldoNetto: number;
    margineTotale: number;
    movimentiCount: number;
    expressSalesCount: number;
    expressSalesTotal: number;
    expressMargine: number;
  };
  byMethod: Array<{ method: string; entrate: number; uscite: number; netto: number }>;
  movements: Array<{
    id: string;
    time: string;
    type: string;
    description: string;
    method: string;
    amount: number;
    margin: number | null;
    source: string;
  }>;
  expressSales: Array<{
    id: string;
    time: string;
    label: string;
    total: number;
    method: string;
    lines: string;
    margin: number | null;
  }>;
}

function num(v: unknown) {
  return Number(v ?? 0);
}

function isCashMethod(method: string) {
  const m = method.toLowerCase();
  return m.includes("contant") || m === "cash" || m === "contanti";
}

export function businessDayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function toDateOnly(date = new Date()) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
}

export function formatBusinessDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function loadDayMovements(start: Date, end: Date) {
  return prisma.cashMovement.findMany({
    where: {
      status: { in: ["Pagato", "Completato"] },
      OR: [
        { paidAt: { gte: start, lte: end } },
        { paidAt: null, createdAt: { gte: start, lte: end } },
      ],
    },
    orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
    include: {
      expressSale: {
        select: {
          id: true,
          receiptNumber: true,
          soldAt: true,
          lines: { select: { description: true, lineType: true, quantity: true } },
        },
      },
    },
  });
}

async function loadDayExpressSales(start: Date, end: Date) {
  return prisma.expressSale.findMany({
    where: {
      status: "Completata",
      soldAt: { gte: start, lte: end },
    },
    orderBy: { soldAt: "asc" },
    include: {
      lines: {
        select: {
          description: true,
          lineType: true,
          quantity: true,
          lineTotal: true,
          unitPrice: true,
        },
      },
      user: { select: { name: true } },
    },
  });
}

export async function computeDayStats(start: Date, end: Date) {
  const [movements, expressSales] = await Promise.all([
    loadDayMovements(start, end),
    loadDayExpressSales(start, end),
  ]);

  let totalEntrate = 0;
  let totalUscite = 0;
  let margineTotale = 0;
  let cashEntrate = 0;
  let cashUscite = 0;
  const byMethodMap = new Map<string, { entrate: number; uscite: number }>();

  const movementRows = movements
    .filter((m) => !m.expressSale)
    .map((m) => {
    const amount = num(m.amount);
    const margin = m.margin != null ? num(m.margin) : null;
    const method = m.method || "—";
    const bucket = byMethodMap.get(method) || { entrate: 0, uscite: 0 };
    if (m.type === "ENTRATA") {
      totalEntrate += amount;
      bucket.entrate += amount;
      if (isCashMethod(method)) cashEntrate += amount;
    } else {
      totalUscite += amount;
      bucket.uscite += amount;
      if (isCashMethod(method)) cashUscite += amount;
    }
    if (margin != null) margineTotale += margin;
    byMethodMap.set(method, bucket);

    const when = m.paidAt || m.createdAt;
    return {
      id: m.id,
      time: when.toISOString(),
      type: m.type,
      description: m.description,
      method,
      amount,
      margin,
      source: "Manuale",
    };
  });

  let expressMargine = 0;
  for (const m of movements) {
    if (!m.expressSale) continue;
    const amount = num(m.amount);
    const method = m.method || "—";
    const bucket = byMethodMap.get(method) || { entrate: 0, uscite: 0 };
    if (m.type === "ENTRATA") {
      totalEntrate += amount;
      bucket.entrate += amount;
      if (isCashMethod(method)) cashEntrate += amount;
    } else {
      totalUscite += amount;
      bucket.uscite += amount;
      if (isCashMethod(method)) cashUscite += amount;
    }
    if (m.margin != null) {
      const mg = num(m.margin);
      expressMargine += mg;
      margineTotale += mg;
    }
    byMethodMap.set(method, bucket);
  }

  const expressRows = expressSales.map((s) => {
    const lines = s.lines
      .map((l) => `${l.description}${l.quantity > 1 ? ` ×${l.quantity}` : ""}`)
      .join(", ");
    const label = s.receiptNumber
      ? `Scontrino #${s.receiptNumber}`
      : `Vendita ${s.id.slice(-6).toUpperCase()}`;
    return {
      id: s.id,
      time: s.soldAt.toISOString(),
      label,
      total: num(s.total),
      method: s.paymentMethod,
      lines,
      margin: null as number | null,
    };
  });

  const expressSalesTotal = expressRows.reduce((s, r) => s + r.total, 0);

  const byMethod = [...byMethodMap.entries()]
    .map(([method, v]) => ({
      method,
      entrate: v.entrate,
      uscite: v.uscite,
      netto: v.entrate - v.uscite,
    }))
    .sort((a, b) => b.entrate - a.uscite);

  return {
    movements: movementRows,
    expressSales: expressRows,
    byMethod,
    summary: {
      totalEntrate,
      totalUscite,
      saldoNetto: totalEntrate - totalUscite,
      margineTotale,
      movimentiCount: movementRows.length,
      expressSalesCount: expressRows.length,
      expressSalesTotal,
      expressMargine,
      cashEntrate,
      cashUscite,
    },
  };
}

export async function buildCashDayJournal(input: {
  businessDate: Date;
  openingAmount: number;
  openingNotes?: string | null;
  openedByName: string;
  openedAt: Date;
  closingAmount?: number;
  closingNotes?: string | null;
  closedByName?: string;
  closedAt?: Date;
}): Promise<CashDayJournal> {
  const { start, end } = businessDayBounds(input.businessDate);
  const stats = await computeDayStats(start, end);
  const expectedCash =
    input.openingAmount + stats.summary.cashEntrate - stats.summary.cashUscite;

  const journal: CashDayJournal = {
    businessDate: formatBusinessDate(input.businessDate),
    generatedAt: new Date().toISOString(),
    openedBy: input.openedByName,
    closedBy: input.closedByName,
    opening: {
      amount: input.openingAmount,
      notes: input.openingNotes,
      at: input.openedAt.toISOString(),
    },
    summary: {
      totalEntrate: stats.summary.totalEntrate,
      totalUscite: stats.summary.totalUscite,
      saldoNetto: stats.summary.saldoNetto,
      margineTotale: stats.summary.margineTotale,
      movimentiCount: stats.summary.movimentiCount,
      expressSalesCount: stats.summary.expressSalesCount,
      expressSalesTotal: stats.summary.expressSalesTotal,
      expressMargine: stats.summary.expressMargine,
    },
    byMethod: stats.byMethod,
    movements: stats.movements,
    expressSales: stats.expressSales,
  };

  if (input.closingAmount != null) {
    journal.closing = {
      amount: input.closingAmount,
      expected: expectedCash,
      variance: input.closingAmount - expectedCash,
      notes: input.closingNotes,
      at: (input.closedAt || new Date()).toISOString(),
    };
  }

  return journal;
}

export async function getCashSessionForDate(date = new Date()) {
  const businessDate = toDateOnly(date);
  return prisma.cashRegisterSession.findUnique({
    where: { businessDate },
    include: {
      openedBy: { select: { id: true, name: true, email: true } },
      closedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getTodayCashSessionStatus() {
  const session = await getCashSessionForDate(new Date());
  const { start, end } = businessDayBounds(new Date());
  const live = session?.status === "OPEN" ? await computeDayStats(start, end) : null;
  return { session, live };
}

export async function openCashSession(input: {
  userId: string;
  openingAmount: number;
  notes?: string;
}) {
  const businessDate = toDateOnly(new Date());
  const existing = await prisma.cashRegisterSession.findUnique({ where: { businessDate } });
  if (existing) {
    if (existing.status === "OPEN") throw new Error("Giornata già aperta");
    throw new Error("Giornata già chiusa — impossibile riaprire");
  }
  if (input.openingAmount < 0) throw new Error("Fondo cassa non valido");

  return prisma.cashRegisterSession.create({
    data: {
      businessDate,
      openingAmount: input.openingAmount,
      openingNotes: input.notes,
      openedById: input.userId,
      status: "OPEN",
    },
    include: {
      openedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function closeCashSession(input: {
  userId: string;
  closingAmount: number;
  notes?: string;
}) {
  const businessDate = toDateOnly(new Date());
  const session = await prisma.cashRegisterSession.findUnique({
    where: { businessDate },
    include: { openedBy: { select: { name: true, email: true } } },
  });
  if (!session) throw new Error("Nessuna giornata aperta oggi");
  if (session.status === "CLOSED") throw new Error("Giornata già chiusa");
  if (input.closingAmount < 0) throw new Error("Importo chiusura non valido");

  const closer = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { name: true, email: true },
  });

  const journal = await buildCashDayJournal({
    businessDate: session.businessDate,
    openingAmount: num(session.openingAmount),
    openingNotes: session.openingNotes,
    openedByName: session.openedBy.name || session.openedBy.email,
    openedAt: session.openedAt,
    closingAmount: input.closingAmount,
    closingNotes: input.notes,
    closedByName: closer?.name || closer?.email || "Operatore",
    closedAt: new Date(),
  });

  const expected = journal.closing?.expected ?? input.closingAmount;
  const variance = journal.closing?.variance ?? 0;

  return prisma.cashRegisterSession.update({
    where: { id: session.id },
    data: {
      status: "CLOSED",
      closingAmount: input.closingAmount,
      expectedClosingAmount: expected,
      variance,
      closingNotes: input.notes,
      closedAt: new Date(),
      closedById: input.userId,
      journal: journal as unknown as Prisma.InputJsonValue,
    },
    include: {
      openedBy: { select: { id: true, name: true, email: true } },
      closedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getCashRegisterReport(period: "day" | "week" | "month" | "year") {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
  } else if (period === "month") {
    start.setDate(1);
  } else if (period === "year") {
    start.setMonth(0, 1);
  }

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const sessions = await prisma.cashRegisterSession.findMany({
    where: {
      businessDate: { gte: start, lte: end },
      status: "CLOSED",
    },
    orderBy: { businessDate: "desc" },
    include: {
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
    },
  });

  const stats = await computeDayStats(start, end);

  const sessionSummaries = sessions.map((s) => {
    const j = s.journal as CashDayJournal | null;
    return {
      id: s.id,
      businessDate: formatBusinessDate(s.businessDate),
      openingAmount: num(s.openingAmount),
      closingAmount: num(s.closingAmount),
      variance: num(s.variance),
      saldoNetto: j?.summary.saldoNetto ?? null,
      expressSalesTotal: j?.summary.expressSalesTotal ?? null,
      margineTotale: j?.summary.margineTotale ?? null,
    };
  });

  return {
    period,
    from: formatBusinessDate(start),
    to: formatBusinessDate(end),
    sessions: sessionSummaries,
    totals: {
      giornateChiuse: sessions.length,
      saldoNetto: stats.summary.saldoNetto,
      totalEntrate: stats.summary.totalEntrate,
      totalUscite: stats.summary.totalUscite,
      expressSalesTotal: stats.summary.expressSalesTotal,
      expressSalesCount: stats.summary.expressSalesCount,
      margineTotale: stats.summary.margineTotale,
      scostamentoCassa: sessionSummaries.reduce((s, x) => s + (x.variance || 0), 0),
    },
  };
}

export function serializeCashSession(
  session: {
    id: string;
    status: string;
    businessDate: Date;
    openingAmount: unknown;
    closingAmount?: unknown | null;
    expectedClosingAmount?: unknown | null;
    variance?: unknown | null;
    openingNotes?: string | null;
    closingNotes?: string | null;
    journal?: unknown;
    openedBy?: { id: string; name: string | null; email: string };
    closedBy?: { id: string; name: string | null; email: string } | null;
  } | null
) {
  if (!session) return null;
  return {
    ...session,
    openingAmount: num(session.openingAmount),
    closingAmount: session.closingAmount != null ? num(session.closingAmount) : null,
    expectedClosingAmount:
      session.expectedClosingAmount != null ? num(session.expectedClosingAmount) : null,
    variance: session.variance != null ? num(session.variance) : null,
    businessDate: formatBusinessDate(session.businessDate),
    journal: (session.journal ?? null) as CashDayJournal | null,
  };
}
