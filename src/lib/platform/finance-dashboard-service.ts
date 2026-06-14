import { prisma } from "@/lib/prisma";
import {
  businessDayBounds,
  computeDayStats,
  formatBusinessDate,
  getCashSessionForDate,
  toDateOnly,
} from "@/lib/platform/cash-register-service";

export type FinancePeriod = "day" | "week" | "month" | "year";

function periodBounds(period: FinancePeriod) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === "week") {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
  } else if (period === "month") {
    start.setDate(1);
  } else if (period === "year") {
    start.setMonth(0, 1);
  }

  return { start, end, now };
}

export async function getFinanceDashboard(period: FinancePeriod = "month") {
  const { start, end } = periodBounds(period);
  const stats = await computeDayStats(start, end);

  const trendDays = 7;
  const trend: { date: string; label: string; entrate: number; uscite: number; netto: number }[] = [];
  for (let i = trendDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const { start: ds, end: de } = businessDayBounds(d);
    const dayStats = await computeDayStats(ds, de);
    trend.push({
      date: formatBusinessDate(d),
      label: d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" }),
      entrate: dayStats.summary.totalEntrate,
      uscite: dayStats.summary.totalUscite,
      netto: dayStats.summary.saldoNetto,
    });
  }

  const pendingWhere = { status: { notIn: ["Pagato", "Completato", "Annullato"] } };
  const [pendingAgg, overdueCount, session, recentMovements, expressPeriod] = await Promise.all([
    prisma.cashMovement.aggregate({
      where: pendingWhere,
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.cashMovement.count({
      where: {
        ...pendingWhere,
        dueDate: { lt: new Date() },
      },
    }),
    getCashSessionForDate(new Date()),
    prisma.cashMovement.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        expressSale: { select: { id: true, receiptNumber: true } },
      },
    }),
    prisma.expressSale.aggregate({
      where: { status: "Completata", soldAt: { gte: start, lte: end } },
      _count: { id: true },
      _sum: { total: true },
    }),
  ]);

  const { start: todayStart, end: todayEnd } = businessDayBounds(new Date());
  const todayStats = await computeDayStats(todayStart, todayEnd);

  const expressTotal = Number(expressPeriod._sum.total ?? 0);
  const expressShare =
    stats.summary.totalEntrate > 0
      ? Math.round((expressTotal / stats.summary.totalEntrate) * 100)
      : 0;

  return {
    period,
    kpis: {
      totalEntrate: stats.summary.totalEntrate,
      totalUscite: stats.summary.totalUscite,
      saldoNetto: stats.summary.saldoNetto,
      margineTotale: stats.summary.margineTotale,
      movimentiCount: stats.summary.movimentiCount,
      expressSalesCount: stats.summary.expressSalesCount,
      expressSalesTotal: stats.summary.expressSalesTotal,
      expressShare,
      pendingCount: pendingAgg._count.id,
      pendingAmount: Number(pendingAgg._sum.amount ?? 0),
      overdueCount,
      todayNetto: todayStats.summary.saldoNetto,
      todayEntrate: todayStats.summary.totalEntrate,
    },
    byMethod: stats.byMethod,
    trend,
    session: session
      ? {
          id: session.id,
          status: session.status,
          businessDate: formatBusinessDate(session.businessDate),
          openingAmount: Number(session.openingAmount),
          closingAmount: session.closingAmount != null ? Number(session.closingAmount) : null,
          variance: session.variance != null ? Number(session.variance) : null,
        }
      : null,
    recentMovements: recentMovements.map((m) => ({
      id: m.id,
      type: m.type,
      description: m.description,
      amount: Number(m.amount),
      method: m.method,
      status: m.status,
      margin: m.margin != null ? Number(m.margin) : null,
      createdAt: m.createdAt.toISOString(),
      paidAt: m.paidAt?.toISOString() ?? null,
      clientName: m.client?.name ?? null,
      expressSaleId: m.expressSale?.id ?? null,
      receiptNumber: m.expressSale?.receiptNumber ?? null,
    })),
  };
}

export async function getFinanceInsights() {
  const session = await getCashSessionForDate(new Date());
  const suggestions: {
    id: string;
    severity: "info" | "warning" | "success";
    title: string;
    body: string;
    link?: string;
  }[] = [];

  if (!session) {
    suggestions.push({
      id: "open-session",
      severity: "warning",
      title: "Giornata non aperta",
      body: "Apri la cassa con il fondo mattina per tracciare correttamente contanti e giornale.",
      link: "/services/entrate-uscite?v=giornata&open=1",
    });
  } else if (session.status === "OPEN") {
    suggestions.push({
      id: "close-session",
      severity: "info",
      title: "Cassa aperta",
      body: "Ricorda la chiusura serale per generare il giornale di cassa.",
      link: "/services/entrate-uscite?v=giornata&open=1",
    });
  }

  const overdue = await prisma.cashMovement.findMany({
    where: {
      status: { notIn: ["Pagato", "Completato", "Annullato"] },
      dueDate: { lt: new Date() },
    },
    take: 5,
    orderBy: { dueDate: "asc" },
  });

  for (const m of overdue) {
    suggestions.push({
      id: `overdue-${m.id}`,
      severity: "warning",
      title: "Scadenza superata",
      body: `${m.description} · €${Number(m.amount).toFixed(2)}`,
      link: "/services/entrate-uscite?v=scadenze",
    });
  }

  const lastClosed = await prisma.cashRegisterSession.findFirst({
    where: { status: "CLOSED" },
    orderBy: { businessDate: "desc" },
  });

  if (lastClosed?.variance != null && Math.abs(Number(lastClosed.variance)) > 10) {
    suggestions.push({
      id: "variance",
      severity: "warning",
      title: "Scostamento cassa rilevato",
      body: `Ultima chiusura: ${Number(lastClosed.variance) >= 0 ? "+" : ""}€${Number(lastClosed.variance).toFixed(2)}`,
      link: "/services/entrate-uscite?view=report",
    });
  }

  const pendingHigh = await prisma.cashMovement.findFirst({
    where: { status: "In lavorazione", type: "ENTRATA" },
    orderBy: { amount: "desc" },
  });

  if (pendingHigh && Number(pendingHigh.amount) >= 500) {
    suggestions.push({
      id: "pending-high",
      severity: "info",
      title: "Incasso in sospeso",
      body: `${pendingHigh.description} · €${Number(pendingHigh.amount).toFixed(2)} da confermare`,
      link: "/services/entrate-uscite?view=elenco",
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: "all-good",
      severity: "success",
      title: "Tutto in ordine",
      body: "Nessuna anomalia rilevata su cassa e movimenti.",
    });
  }

  return { suggestions };
}

export async function searchFinanceMovements(q: string, limit = 20) {
  const term = q.trim();
  if (!term) return [];
  return prisma.cashMovement.findMany({
    where: {
      OR: [
        { description: { contains: term, mode: "insensitive" } },
        { method: { contains: term, mode: "insensitive" } },
        { reference: { contains: term, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true } },
      expressSale: { select: { receiptNumber: true } },
    },
  });
}
