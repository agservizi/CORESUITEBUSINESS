import { prisma } from "@/lib/prisma";

const LOOKBACK_DAYS = 30;

export type ExpressPeriod = "day" | "month" | "year";

function periodStart(period: ExpressPeriod, now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === "month") return new Date(d.getFullYear(), d.getMonth(), 1);
  if (period === "year") return new Date(d.getFullYear(), 0, 1);
  return d;
}

function suggestReorder(current: number, avgDaily: number, threshold: number) {
  if (current >= threshold) return 0;
  const target = Math.max(threshold * 2, Math.ceil(avgDaily * 14));
  return Math.max(0, target - current);
}

export async function getProviderInsights() {
  const operators = await prisma.expressOperator.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  const [stockCounts, soldLines, lastMovements] = await Promise.all([
    prisma.expressIccidStock.groupBy({
      by: ["operatorId"],
      where: { status: "InStock" },
      _count: true,
    }),
    prisma.expressSaleLine.findMany({
      where: {
        lineType: "sim",
        iccidStockId: { not: null },
        sale: { soldAt: { gte: since }, status: "Completata" },
      },
      select: { operatorId: true },
    }),
    prisma.expressIccidStock.groupBy({
      by: ["operatorId"],
      _max: { updatedAt: true },
    }),
  ]);

  const stockMap = new Map(stockCounts.map((s) => [s.operatorId, s._count]));
  const soldMap = new Map<string, number>();
  for (const line of soldLines) {
    if (!line.operatorId) continue;
    soldMap.set(line.operatorId, (soldMap.get(line.operatorId) ?? 0) + 1);
  }
  const lastMap = new Map(lastMovements.map((m) => [m.operatorId, m._max.updatedAt]));

  return operators.map((op) => {
    const current = stockMap.get(op.id) ?? 0;
    const soldCount = soldMap.get(op.id) ?? 0;
    const avgDaily = LOOKBACK_DAYS > 0 ? Math.round((soldCount / LOOKBACK_DAYS) * 100) / 100 : 0;
    const daysCover = avgDaily > 0 ? Math.round((current / avgDaily) * 10) / 10 : null;
    const belowThreshold = current < op.reorderThreshold;
    let riskLevel: "ok" | "warning" | "critical" = "ok";
    if (belowThreshold) riskLevel = current === 0 ? "critical" : "warning";
    else if (daysCover !== null && daysCover < 7) riskLevel = "warning";

    return {
      id: op.id,
      name: op.name,
      threshold: op.reorderThreshold,
      currentStock: current,
      averageDailySales: avgDaily,
      daysCover,
      lastMovement: lastMap.get(op.id)?.toISOString() ?? null,
      belowThreshold,
      suggestedReorder: suggestReorder(current, avgDaily, op.reorderThreshold),
      riskLevel,
    };
  });
}

export async function getSalesTrend7Days() {
  const points: { date: string; label: string; count: number; revenue: number }[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const agg = await prisma.expressSale.aggregate({
      where: {
        soldAt: { gte: start, lt: end },
        status: "Completata",
      },
      _count: true,
      _sum: { total: true },
    });

    points.push({
      date: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" }),
      count: agg._count,
      revenue: Number(agg._sum.total ?? 0),
    });
  }

  const maxCount = Math.max(...points.map((p) => p.count), 1);
  const maxRevenue = Math.max(...points.map((p) => p.revenue), 1);

  return points.map((p) => ({
    ...p,
    countPct: Math.round((p.count / maxCount) * 100),
    revenuePct: Math.round((p.revenue / maxRevenue) * 100),
  }));
}

export async function getOperatorActivity(limit = 12) {
  const sales = await prisma.expressSale.findMany({
    take: limit,
    orderBy: { soldAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return sales.map((s) => ({
    saleId: s.mysqlId ?? s.id.slice(-6),
    id: s.id,
    user: s.user?.name || s.user?.email || null,
    status: s.status,
    paymentMethod: s.paymentMethod,
    total: Number(s.total),
    discount: Number(s.discount),
    createdAt: s.soldAt.toISOString(),
  }));
}

export async function getExpressMetrics(period: ExpressPeriod = "day") {
  const start = periodStart(period);
  const now = new Date();

  const [iccidTotal, iccidAvailable, periodSales, allSold] = await Promise.all([
    prisma.expressIccidStock.count(),
    prisma.expressIccidStock.count({ where: { status: "InStock" } }),
    prisma.expressSale.findMany({
      where: { soldAt: { gte: start, lte: now }, status: "Completata" },
      select: { total: true },
    }),
    prisma.expressIccidStock.count({ where: { status: "Sold" } }),
  ]);

  const salesCount = periodSales.length;
  const revenueSum = periodSales.reduce((s, r) => s + Number(r.total), 0);

  return {
    iccidTotal,
    iccidAvailable,
    iccidSold: allSold,
    salesCount,
    revenueSum,
    period,
  };
}

export async function getPaymentBreakdown(period: ExpressPeriod = "day") {
  const start = periodStart(period);
  const sales = await prisma.expressSale.groupBy({
    by: ["paymentMethod"],
    where: { soldAt: { gte: start }, status: "Completata" },
    _count: true,
    _sum: { total: true },
  });

  return sales.map((s) => ({
    method: s.paymentMethod,
    count: s._count,
    total: Number(s._sum.total ?? 0),
  }));
}

export async function getOperatorSalesBreakdown(period: ExpressPeriod = "day") {
  const start = periodStart(period);
  const lines = await prisma.expressSaleLine.findMany({
    where: {
      operatorId: { not: null },
      sale: { soldAt: { gte: start }, status: "Completata" },
    },
    select: {
      operatorId: true,
      lineTotal: true,
      operator: { select: { name: true } },
    },
  });

  const map = new Map<string, { name: string; count: number; total: number }>();
  for (const line of lines) {
    if (!line.operatorId || !line.operator) continue;
    const cur = map.get(line.operatorId) ?? {
      name: line.operator.name,
      count: 0,
      total: 0,
    };
    cur.count += 1;
    cur.total += Number(line.lineTotal);
    map.set(line.operatorId, cur);
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

export async function buildNextSteps(
  metrics: Awaited<ReturnType<typeof getExpressMetrics>>,
  insights: Awaited<ReturnType<typeof getProviderInsights>>
) {
  const steps: { label: string; severity: "info" | "warning" | "critical"; action?: string }[] = [];
  const lowStock = insights.filter((i) => i.belowThreshold);

  if (lowStock.length > 0) {
    steps.push({
      label: `Riordina SIM per ${lowStock.map((i) => i.name).join(", ")}`,
      severity: lowStock.some((i) => i.currentStock === 0) ? "critical" : "warning",
      action: "magazzino",
    });
  }
  if (metrics.iccidAvailable < 20) {
    steps.push({
      label: "Stock SIM globale critico — importa nuovi ICCID",
      severity: "critical",
      action: "magazzino",
    });
  }
  if (metrics.salesCount === 0 && metrics.period === "day") {
    steps.push({
      label: "Nessuna vendita oggi — apri il POS per registrare",
      severity: "info",
      action: "pos",
    });
  }
  if (steps.length === 0) {
    steps.push({ label: "Operatività regolare — monitoraggio attivo", severity: "info" });
  }
  return steps;
}
