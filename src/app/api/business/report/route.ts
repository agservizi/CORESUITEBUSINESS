import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    leadsByStatus,
    dealsByStatus,
    clientsByStatus,
    wonDealsClosed,
    dealsCreated,
    pipelineStagesRaw,
    pipelineValue,
    wonDealsValue,
  ] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.deal.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { value: true },
    }),
    prisma.client.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.deal.findMany({
      where: {
        status: "WON",
        closedAt: { gte: sixMonthsAgo },
      },
      select: { value: true, closedAt: true },
    }),
    prisma.deal.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { id: true, createdAt: true },
    }),
    prisma.pipeline.findFirst({
      where: { isDefault: true },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: { _count: { select: { leads: true } } },
        },
      },
    }),
    prisma.lead.aggregate({
      where: { status: { notIn: ["WON", "LOST"] } },
      _sum: { value: true },
      _count: { id: true },
    }),
    prisma.deal.aggregate({
      where: { status: "WON" },
      _sum: { value: true },
    }),
  ]);

  const monthLabels: string[] = [];
  const dealsByMonth: { month: string; deals: number; revenue: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
    monthLabels.push(label);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const deals = dealsCreated.filter(
      (r) => r.createdAt >= monthStart && r.createdAt <= monthEnd
    ).length;

    const revenue = wonDealsClosed
      .filter((r) => r.closedAt && r.closedAt >= monthStart && r.closedAt <= monthEnd)
      .reduce((sum, r) => sum + r.value, 0);

    dealsByMonth.push({ month: label, deals, revenue });
  }

  const pipelineStages =
    pipelineStagesRaw?.stages.map((s) => ({
      name: s.name,
      color: s.color,
      count: s._count.leads,
    })) ?? [];

  return NextResponse.json({
    leadsByStatus: leadsByStatus.map((r) => ({
      status: r.status,
      count: r._count.id,
    })),
    dealsByStatus: dealsByStatus.map((r) => ({
      status: r.status,
      count: r._count.id,
      value: r._sum.value ?? 0,
    })),
    clientsByStatus: clientsByStatus.map((r) => ({
      status: r.status,
      count: r._count.id,
    })),
    revenueChart: {
      labels: monthLabels,
      values: dealsByMonth.map((m) => m.revenue),
    },
    dealsByMonth,
    pipelineStages,
    pipeline: {
      count: pipelineValue._count.id,
      value: pipelineValue._sum.value ?? 0,
    },
    totalRevenueWon: wonDealsValue._sum.value ?? 0,
    funnel: pipelineStages.map((s, i, arr) => {
      const prev = i > 0 ? arr[i - 1].count : s.count;
      const rate = prev > 0 ? Math.round((s.count / prev) * 100) : 100;
      return { ...s, conversionRate: i === 0 ? 100 : rate };
    }),
    forecast90: (() => {
      const openDealsForecast = dealsByStatus
        .filter((d) => d.status === "OPEN")
        .reduce((s, d) => s + (d._sum.value ?? 0) * 0.5, 0);
      const pipelineForecast = (pipelineValue._sum.value ?? 0) * 0.35;
      return Math.round(openDealsForecast + pipelineForecast);
    })(),
  });
}
