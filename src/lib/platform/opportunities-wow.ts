import { prisma } from "@/lib/prisma";
import {
  buildOpportunityScope,
  getOpportunityStats,
  getStatusOptions,
  serializeOpportunity,
} from "@/lib/platform/opportunities-service";

const opportunityInclude = {
  status: true,
  provider: true,
  offer: true,
  client: { select: { id: true, name: true, companyName: true, email: true } },
  collaborator: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
} as const;

const ACTIVE_STATUS_CODES = ["in_verifica", "documenti_ok", "in_firma_otp"] as const;

function weekKey(d: Date) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay() + 1);
  return start.toISOString().slice(0, 10);
}

function weekLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export async function getOpportunityInsights(userId: string, role: string) {
  const scope = await buildOpportunityScope(userId, role);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [activeRows, activatedRows, stats, monthActivated, statuses] = await Promise.all([
    prisma.opportunity.findMany({
      where: { ...scope, statusCode: { in: [...ACTIVE_STATUS_CODES] } },
      include: opportunityInclude,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.opportunity.findMany({
      where: { ...scope, statusCode: "attivato", lastStatusChange: { not: null } },
      select: { createdAt: true, lastStatusChange: true, commissionAmount: true },
    }),
    getOpportunityStats(userId, role),
    prisma.opportunity.aggregate({
      where: {
        ...scope,
        statusCode: "attivato",
        lastStatusChange: { gte: monthStart },
      },
      _sum: { commissionAmount: true },
    }),
    getStatusOptions(),
  ]);

  const hot = activeRows
    .map((r) => {
      const commission = Number(r.commissionAmount ?? 0);
      return {
        ...serializeOpportunity(r as unknown as Record<string, unknown>),
        id: r.id,
        code: r.code,
        score: Math.round(commission * 0.7 + (ACTIVE_STATUS_CODES.indexOf(r.statusCode as (typeof ACTIVE_STATUS_CODES)[number]) + 1) * 10),
        daysIdle: Math.floor((Date.now() - r.updatedAt.getTime()) / 86400000),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const stale = activeRows
    .filter((r) => Date.now() - r.updatedAt.getTime() > 14 * 86400000)
    .map((r) => ({
      ...serializeOpportunity(r as unknown as Record<string, unknown>),
      id: r.id,
      code: r.code,
    }))
    .slice(0, 5);

  const velocity =
    activatedRows.length > 0
      ? Math.round(
          activatedRows.reduce(
            (s, r) => s + (r.lastStatusChange!.getTime() - r.createdAt.getTime()) / 86400000,
            0
          ) / activatedRows.length
        )
      : 0;

  const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 86400000);
  const trendMap = new Map<string, number>();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * 86400000);
    trendMap.set(weekKey(d), 0);
  }
  for (const r of activatedRows) {
    if (!r.lastStatusChange || r.lastStatusChange < eightWeeksAgo) continue;
    const key = weekKey(r.lastStatusChange);
    if (trendMap.has(key)) {
      trendMap.set(key, (trendMap.get(key) ?? 0) + Number(r.commissionAmount ?? 0));
    }
  }
  const trend = [...trendMap.entries()].map(([week, commission]) => ({
    week: weekLabel(week),
    commission: Math.round(commission),
  }));

  const total = stats.total || 1;
  const funnel = statuses.map((status) => ({
    status: status.code,
    label: status.label,
    color: status.color,
    count: stats.byStatus[status.code]?.count ?? 0,
    commission: stats.byStatus[status.code]?.commission ?? 0,
    pct: Math.round(((stats.byStatus[status.code]?.count ?? 0) / total) * 100),
  }));

  const current = Number(monthActivated._sum.commissionAmount ?? 0);
  const target = Math.max(3000, Math.round((stats.wonCommission || 3000) * 0.2 + 2500));
  const monthlyGoal = {
    target,
    current: Math.round(current),
    pct: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
  };

  const suggestions = buildOpportunitySuggestions({
    hot,
    stale,
    stats,
    velocity,
    monthlyGoal,
    activeCount: stats.active,
  });

  return {
    hot,
    stale,
    velocity,
    trend,
    funnel,
    monthlyGoal,
    suggestions,
    conversionRate: stats.winRate,
  };
}

function buildOpportunitySuggestions(input: {
  hot: Array<{ id: string; code: string; score: number; daysIdle: number; commission: number }>;
  stale: Array<{ id: string; code: string }>;
  stats: { winRate: number; pipelineCommission: number; active: number; byStatus: Record<string, { count: number }> };
  velocity: number;
  monthlyGoal: { pct: number; current: number; target: number };
  activeCount: number;
}) {
  const out: {
    id: string;
    priority: "high" | "medium" | "low";
    title: string;
    body: string;
    action: string;
    viewId: string;
    opportunityId?: string;
  }[] = [];

  if (input.stale.length > 0) {
    out.push({
      id: "stale-followup",
      priority: "high",
      title: "Follow-up urgente",
      body: `${input.stale.length} contratti fermi da oltre 14 giorni — rischio perdita commissioni.`,
      action: "Vedi in verifica",
      viewId: "verifica",
      opportunityId: input.stale[0]?.id,
    });
  }

  if (input.hot[0]) {
    out.push({
      id: "hot-deal",
      priority: "high",
      title: "Contratto ad alto potenziale",
      body: `${input.hot[0].code} — score ${input.hot[0].score}, commissione stimata elevata.`,
      action: "Apri pipeline",
      viewId: "pipeline",
      opportunityId: input.hot[0].id,
    });
  }

  if (input.monthlyGoal.pct < 70 && input.monthlyGoal.target > input.monthlyGoal.current) {
    const gap = input.monthlyGoal.target - input.monthlyGoal.current;
    out.push({
      id: "monthly-goal",
      priority: "medium",
      title: "Obiettivo mensile",
      body: `Mancano €${gap.toLocaleString("it-IT")} al target commissioni del mese (${input.monthlyGoal.pct}%).`,
      action: "Report commissioni",
      viewId: "report",
    });
  }

  if (input.stats.winRate > 0 && input.stats.winRate < 25 && input.activeCount > 2) {
    out.push({
      id: "win-rate",
      priority: "medium",
      title: "Tasso attivazione da migliorare",
      body: `Solo ${input.stats.winRate}% di attivazione — qualifica meglio i contratti in pipeline.`,
      action: "Pipeline",
      viewId: "pipeline",
    });
  }

  if (input.velocity > 0 && input.velocity <= 21) {
    out.push({
      id: "velocity-good",
      priority: "low",
      title: "Ciclo di attivazione veloce",
      body: `Tempo medio di attivazione: ${input.velocity} giorni. Ottimo ritmo commerciale.`,
      action: "Dashboard",
      viewId: "dashboard",
    });
  }

  if (input.stats.pipelineCommission > 1000) {
    out.push({
      id: "pipeline-value",
      priority: "low",
      title: "Pipeline solida",
      body: `€${Math.round(input.stats.pipelineCommission).toLocaleString("it-IT")} in commissioni attive — mantieni il momentum.`,
      action: "Contratti attivi",
      viewId: "attivi",
    });
  }

  return out.slice(0, 6);
}
