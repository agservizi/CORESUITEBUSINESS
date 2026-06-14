import { prisma } from "@/lib/prisma";

export type TimelineEventType =
  | "sale"
  | "express_request"
  | "ticket"
  | "practice"
  | "deal"
  | "lead"
  | "activity"
  | "note"
  | "payment"
  | "morosity";

export interface BusinessTimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  subtitle?: string;
  amount?: number;
  status: string;
  at: string;
  actor?: string | null;
  link?: string;
  module?: string;
}

export interface NextBestAction {
  id: string;
  kind: "call" | "meeting" | "deal" | "upsell" | "payment" | "followup";
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  clientId?: string;
  leadId?: string;
  dealId?: string;
  link?: string;
}

export interface PipelineAlert {
  id: string;
  kind: "stale_lead" | "deal_at_risk" | "close_soon" | "stale_stage";
  title: string;
  detail: string;
  severity: "warning" | "error" | "info";
  leadId?: string;
  dealId?: string;
  clientId?: string;
  link?: string;
}

export async function getBusinessClientProfile(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      expressPortal: { select: { status: true } },
      expressSales: {
        take: 5,
        orderBy: { soldAt: "desc" },
        select: { id: true, total: true, soldAt: true, status: true },
      },
      expressRequests: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, status: true, createdAt: true },
      },
      tickets: {
        where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "WAITING_PARTNER"] } },
        take: 5,
        select: { id: true, code: true, subject: true, status: true, priority: true },
      },
      practices: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, code: true, practiceType: true, status: true, createdAt: true },
      },
      leads: {
        where: { status: { notIn: ["WON", "LOST"] } },
        select: { id: true, title: true, value: true, status: true },
      },
      deals: {
        select: { id: true, title: true, value: true, status: true },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, title: true },
      },
    },
  });
  if (!client) return null;

  const [expressSpend, wonDeals, openTickets] = await Promise.all([
    prisma.expressSale.aggregate({
      where: { clientId, status: { not: "Annullata" } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.deal.aggregate({
      where: { clientId, status: "WON" },
      _sum: { value: true },
    }),
    prisma.ticket.count({
      where: { clientId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "WAITING_PARTNER"] } },
    }),
  ]);

  const lifetimeValue =
    Number(expressSpend._sum.total ?? 0) + Number(wonDeals._sum.value ?? 0);
  const lastContact = client.activities[0]?.createdAt ?? client.updatedAt;

  return {
    id: client.id,
    name: client.name,
    companyName: client.companyName,
    email: client.email,
    phone: client.phone,
    morosityScore: client.morosityScore,
    morosityFlag: client.morosityFlag,
    portalActive: client.expressPortal?.status === "active",
    stats: {
      expressSales: expressSpend._count.id,
      expressSpend: Number(expressSpend._sum.total ?? 0),
      dealsWon: Number(wonDeals._sum.value ?? 0),
      lifetimeValue,
      openTickets,
      openLeads: client.leads.length,
      openDeals: client.deals.filter((d) => d.status === "OPEN").length,
    },
    lastContact: lastContact.toISOString(),
    crossModule: {
      expressSales: client.expressSales.map((s) => ({
        id: s.id,
        total: Number(s.total),
        soldAt: s.soldAt.toISOString(),
        status: s.status,
      })),
      expressRequests: client.expressRequests.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      tickets: client.tickets.map((t) => ({
        id: t.id,
        code: t.code,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
      })),
      practices: client.practices.map((p) => ({
        id: p.id,
        title: `${p.code} · ${p.practiceType}`,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
      crmLeads: client.leads,
      crmDeals: client.deals,
    },
  };
}

export async function getBusinessClientTimeline(clientId: string): Promise<BusinessTimelineEvent[]> {
  const [
    sales,
    requests,
    tickets,
    practices,
    deals,
    leads,
    activities,
    notes,
    payments,
    morosityLogs,
  ] = await Promise.all([
    prisma.expressSale.findMany({
      where: { clientId },
      orderBy: { soldAt: "desc" },
      take: 20,
      include: { user: { select: { name: true } } },
    }),
    prisma.expressRequest.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { handledBy: { select: { name: true } } },
    }),
    prisma.ticket.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        code: true,
        subject: true,
        status: true,
        createdAt: true,
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.practice.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, code: true, practiceType: true, status: true, createdAt: true },
    }),
    prisma.deal.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, title: true, status: true, value: true, createdAt: true, closedAt: true },
    }),
    prisma.lead.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, title: true, status: true, value: true, createdAt: true, source: true },
    }),
    prisma.activity.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { author: { select: { name: true } } },
    }),
    prisma.note.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { author: { select: { name: true } } },
    }),
    prisma.payment.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, amount: true, status: true, description: true, createdAt: true },
    }),
    prisma.morosityLog.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, score: true, note: true, createdAt: true, userId: true },
    }),
  ]);

  const events: BusinessTimelineEvent[] = [];

  for (const s of sales) {
    events.push({
      id: s.id,
      type: "sale",
      title: `Vendita Express · €${Number(s.total).toLocaleString("it-IT")}`,
      status: s.status,
      amount: Number(s.total),
      at: s.soldAt.toISOString(),
      actor: s.user?.name,
      module: "Express",
      link: `/services/express?v=vendite&id=${s.id}`,
    });
  }
  for (const r of requests) {
    events.push({
      id: r.id,
      type: "express_request",
      title: r.title,
      status: r.status,
      at: r.createdAt.toISOString(),
      actor: r.handledBy?.name,
      module: "Express",
      link: `/services/express?v=richieste`,
    });
  }
  for (const t of tickets) {
    events.push({
      id: t.id,
      type: "ticket",
      title: `${t.code} · ${t.subject}`,
      status: t.status,
      at: t.createdAt.toISOString(),
      actor: t.assignedTo?.name,
      module: "Ticket",
    });
  }
  for (const p of practices) {
    events.push({
      id: p.id,
      type: "practice",
      title: `${p.code} · ${p.practiceType}`,
      status: p.status,
      at: p.createdAt.toISOString(),
      module: "Pratiche",
    });
  }
  for (const d of deals) {
    events.push({
      id: d.id,
      type: "deal",
      title: d.title,
      subtitle: d.status,
      status: d.status,
      amount: d.value,
      at: (d.closedAt ?? d.createdAt).toISOString(),
      module: "CRM",
      link: `/business?v=deals&id=${d.id}`,
    });
  }
  for (const l of leads) {
    events.push({
      id: l.id,
      type: "lead",
      title: l.title,
      subtitle: l.source,
      status: l.status,
      amount: l.value ?? undefined,
      at: l.createdAt.toISOString(),
      module: "CRM",
      link: `/business?v=lead&id=${l.id}`,
    });
  }
  for (const a of activities) {
    events.push({
      id: a.id,
      type: "activity",
      title: `${a.type}: ${a.title}`,
      status: a.isDone ? "DONE" : "OPEN",
      at: a.createdAt.toISOString(),
      actor: a.author.name,
      module: "CRM",
    });
  }
  for (const n of notes) {
    events.push({
      id: n.id,
      type: "note",
      title: n.content.slice(0, 80),
      status: "NOTE",
      at: n.createdAt.toISOString(),
      actor: n.author.name,
      module: "CRM",
    });
  }
  for (const pay of payments) {
    events.push({
      id: pay.id,
      type: "payment",
      title: pay.description || "Pagamento",
      status: pay.status,
      amount: Number(pay.amount),
      at: pay.createdAt.toISOString(),
      module: "Portale",
    });
  }
  for (const m of morosityLogs) {
    events.push({
      id: m.id,
      type: "morosity",
      title: `Morosità → ${m.score}`,
      subtitle: m.note ?? undefined,
      status: m.score,
      at: m.createdAt.toISOString(),
      module: "CRM",
    });
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

const STALE_LEAD_DAYS = 7;
const STALE_STAGE_DAYS = 14;
const DEAL_RISK_DAYS = 5;
const CLOSE_SOON_DAYS = 3;

export async function getBusinessNextActions(userId?: string): Promise<NextBestAction[]> {
  const now = new Date();
  const staleCutoff = new Date(now);
  staleCutoff.setDate(staleCutoff.getDate() - STALE_LEAD_DAYS);
  const closeSoon = new Date(now);
  closeSoon.setDate(closeSoon.getDate() + CLOSE_SOON_DAYS);

  const assigneeFilter = userId ? { assigneeId: userId } : {};

  const [staleLeads, closingDeals, morosityDeals, expressClientsNoLead] = await Promise.all([
    prisma.lead.findMany({
      where: {
        ...assigneeFilter,
        status: { notIn: ["WON", "LOST"] },
        updatedAt: { lt: staleCutoff },
      },
      include: {
        client: { select: { id: true, name: true } },
        stage: { select: { name: true } },
      },
      take: 10,
      orderBy: { updatedAt: "asc" },
    }),
    prisma.deal.findMany({
      where: {
        status: "OPEN",
        expectedClose: { lte: closeSoon, gte: now },
        activities: { none: { createdAt: { gte: staleCutoff }, isDone: false } },
      },
      include: { client: { select: { id: true, name: true } } },
      take: 8,
    }),
    prisma.deal.findMany({
      where: {
        status: "OPEN",
        client: { morosityScore: { in: ["ATTENZIONE", "BLOCCATO"] } },
      },
      include: { client: { select: { id: true, name: true, morosityScore: true } } },
      take: 8,
    }),
    prisma.client.findMany({
      where: {
        expressSales: { some: { soldAt: { gte: staleCutoff } } },
        leads: { none: { status: { notIn: ["WON", "LOST"] } } },
      },
      select: { id: true, name: true, companyName: true },
      take: 8,
    }),
  ]);

  const actions: NextBestAction[] = [];

  for (const lead of staleLeads) {
    actions.push({
      id: `stale-${lead.id}`,
      kind: "call",
      title: `Richiama: ${lead.title}`,
      reason: `Fermo in "${lead.stage?.name || lead.status}" da oltre ${STALE_LEAD_DAYS} giorni`,
      priority: lead.priority === "URGENT" || lead.priority === "HIGH" ? "high" : "medium",
      clientId: lead.client?.id,
      leadId: lead.id,
      link: `/business?v=lead&id=${lead.id}`,
    });
  }

  for (const deal of closingDeals) {
    actions.push({
      id: `close-${deal.id}`,
      kind: "meeting",
      title: `Pianifica meeting: ${deal.title}`,
      reason: `Chiusura prevista entro ${CLOSE_SOON_DAYS} giorni senza attività recente`,
      priority: "high",
      clientId: deal.clientId,
      dealId: deal.id,
      link: `/business?v=deals&id=${deal.id}`,
    });
  }

  for (const deal of morosityDeals) {
    actions.push({
      id: `morosity-${deal.id}`,
      kind: "payment",
      title: `Verifica pagamenti: ${deal.client.name}`,
      reason: `Morosità ${deal.client.morosityScore} con deal aperto da €${deal.value.toLocaleString("it-IT")}`,
      priority: deal.client.morosityScore === "BLOCCATO" ? "high" : "medium",
      clientId: deal.clientId,
      dealId: deal.id,
      link: `/business?v=deals&id=${deal.id}`,
    });
  }

  for (const client of expressClientsNoLead) {
    actions.push({
      id: `upsell-${client.id}`,
      kind: "upsell",
      title: `Upsell telefonia: ${client.companyName || client.name}`,
      reason: "Cliente Express attivo senza lead CRM aperto",
      priority: "medium",
      clientId: client.id,
      link: `/business?v=clienti&id=${client.id}`,
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 12);
}

export async function getPipelineIntelligence(): Promise<{
  alerts: PipelineAlert[];
  forecast: { weighted: number; byStage: { name: string; color: string; value: number; weighted: number }[] };
}> {
  const now = new Date();
  const staleLeadCutoff = new Date(now);
  staleLeadCutoff.setDate(staleLeadCutoff.getDate() - STALE_LEAD_DAYS);
  const staleStageCutoff = new Date(now);
  staleStageCutoff.setDate(staleStageCutoff.getDate() - STALE_STAGE_DAYS);
  const dealRiskCutoff = new Date(now);
  dealRiskCutoff.setDate(dealRiskCutoff.getDate() - DEAL_RISK_DAYS);

  const [staleLeads, qualifiedStale, atRiskDeals, pipeline] = await Promise.all([
    prisma.lead.findMany({
      where: {
        status: { notIn: ["WON", "LOST"] },
        updatedAt: { lt: staleLeadCutoff },
      },
      include: {
        client: { select: { id: true, name: true } },
        stage: { select: { name: true } },
      },
      take: 15,
    }),
    prisma.lead.findMany({
      where: {
        status: "QUALIFIED",
        updatedAt: { lt: staleStageCutoff },
      },
      include: { client: { select: { id: true, name: true } } },
      take: 10,
    }),
    prisma.deal.findMany({
      where: {
        status: "OPEN",
        probability: { gte: 60 },
        updatedAt: { lt: dealRiskCutoff },
      },
      include: { client: { select: { id: true, name: true } } },
      take: 10,
    }),
    prisma.pipeline.findFirst({
      where: { isDefault: true },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            leads: {
              where: { status: { notIn: ["WON", "LOST"] } },
              select: { value: true },
            },
          },
        },
      },
    }),
  ]);

  const alerts: PipelineAlert[] = [];

  for (const lead of staleLeads) {
    alerts.push({
      id: `stale-${lead.id}`,
      kind: "stale_lead",
      title: lead.title,
      detail: `Nessun aggiornamento da ${STALE_LEAD_DAYS}+ giorni (${lead.stage?.name || lead.status})`,
      severity: "warning",
      leadId: lead.id,
      clientId: lead.clientId ?? undefined,
      link: `/business?v=lead&id=${lead.id}`,
    });
  }

  for (const lead of qualifiedStale) {
    alerts.push({
      id: `qual-${lead.id}`,
      kind: "stale_stage",
      title: lead.title,
      detail: `Bloccato in Qualificato da ${STALE_STAGE_DAYS}+ giorni`,
      severity: "info",
      leadId: lead.id,
      clientId: lead.clientId ?? undefined,
      link: `/business?v=lead&id=${lead.id}`,
    });
  }

  for (const deal of atRiskDeals) {
    alerts.push({
      id: `risk-${deal.id}`,
      kind: "deal_at_risk",
      title: deal.title,
      detail: `Probabilità ${deal.probability}% ma nessuna attività da ${DEAL_RISK_DAYS}+ giorni`,
      severity: "error",
      dealId: deal.id,
      clientId: deal.clientId,
      link: `/business?v=deals&id=${deal.id}`,
    });
  }

  const stageProb: Record<string, number> = {
    NEW: 10,
    CONTACTED: 20,
    QUALIFIED: 40,
    PROPOSAL: 60,
    NEGOTIATION: 80,
    WON: 100,
    LOST: 0,
  };

  const byStage = await Promise.all(
    (pipeline?.stages ?? []).map(async (s) => {
      const leads = await prisma.lead.findMany({
        where: { stageId: s.id, status: { notIn: ["WON", "LOST"] } },
        select: { value: true, status: true },
      });
      const value = leads.reduce((sum, l) => sum + (l.value ?? 0), 0);
      const weighted = leads.reduce(
        (sum, l) => sum + (l.value ?? 0) * ((stageProb[l.status] ?? 30) / 100),
        0
      );
      return { name: s.name, color: s.color, value, weighted };
    })
  );

  const openDeals = await prisma.deal.findMany({
    where: { status: "OPEN" },
    select: { value: true, probability: true },
  });
  const dealWeighted = openDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0);

  const leadWeighted = await prisma.lead.findMany({
    where: { status: { notIn: ["WON", "LOST"] } },
    select: { value: true, status: true },
  });
  const leadForecast = leadWeighted.reduce(
    (s, l) => s + (l.value ?? 0) * ((stageProb[l.status] ?? 20) / 100),
    0
  );

  const forecastByStage = byStage;

  return {
    alerts: alerts.slice(0, 20),
    forecast: {
      weighted: dealWeighted + leadForecast,
      byStage: forecastByStage,
    },
  };
}

export async function getCrmStaffLeaderboard(period: "day" | "month" = "month") {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "month") start.setDate(1);

  const [activities, convertedLeads] = await Promise.all([
    prisma.activity.findMany({
      where: { isDone: true, doneAt: { gte: start } },
      select: { authorId: true, type: true, author: { select: { id: true, name: true, email: true } } },
    }),
    prisma.lead.findMany({
      where: { status: "WON", updatedAt: { gte: start }, assigneeId: { not: null } },
      select: { assigneeId: true, assignee: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  type Row = {
    userId: string;
    name: string;
    dealsWon: number;
    revenueWon: number;
    activitiesDone: number;
    leadsConverted: number;
    score: number;
  };

  const map = new Map<string, Row>();

  function ensure(userId: string, name: string) {
    if (!map.has(userId)) {
      map.set(userId, {
        userId,
        name,
        dealsWon: 0,
        revenueWon: 0,
        activitiesDone: 0,
        leadsConverted: 0,
        score: 0,
      });
    }
    return map.get(userId)!;
  }

  for (const a of activities) {
    if (!a.authorId || !a.author) continue;
    const row = ensure(a.authorId, a.author.name || a.author.email);
    row.activitiesDone++;
  }

  for (const l of convertedLeads) {
    if (!l.assigneeId || !l.assignee) continue;
    const row = ensure(l.assigneeId, l.assignee.name || l.assignee.email);
    row.leadsConverted++;
  }

  const allUsers = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN", "OPERATORE"] } },
    select: { id: true, name: true, email: true },
  });

  const dealsWithActivity = await prisma.deal.findMany({
    where: { status: "WON", closedAt: { gte: start } },
    include: {
      activities: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { authorId: true, author: { select: { name: true, email: true } } },
      },
    },
  });

  for (const deal of dealsWithActivity) {
    const authorId = deal.activities[0]?.authorId;
    const author = deal.activities[0]?.author;
    const uid = authorId || allUsers[0]?.id;
    if (!uid) continue;
    const row = ensure(uid, author?.name || author?.email || "Team");
    row.dealsWon++;
    row.revenueWon += deal.value;
  }

  for (const row of map.values()) {
    row.score = row.revenueWon + row.activitiesDone * 50 + row.leadsConverted * 200;
  }

  return [...map.values()].sort((a, b) => b.score - a.score).slice(0, 10);
}

export async function getBusinessLiveEvents(since: Date) {
  const [newLeads, wonDeals, lostDeals, stageMoves, dueActivities] = await Promise.all([
    prisma.lead.findMany({
      where: { createdAt: { gt: since } },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        value: true,
        createdAt: true,
        client: { select: { name: true } },
        stage: { select: { name: true } },
      },
    }),
    prisma.deal.findMany({
      where: { status: "WON", closedAt: { gt: since } },
      orderBy: { closedAt: "asc" },
      take: 10,
      select: { id: true, title: true, value: true, closedAt: true, client: { select: { name: true } } },
    }),
    prisma.deal.findMany({
      where: { status: "LOST", closedAt: { gt: since } },
      orderBy: { closedAt: "asc" },
      take: 5,
      select: { id: true, title: true, value: true, closedAt: true },
    }),
    prisma.lead.findMany({
      where: { updatedAt: { gt: since }, stageId: { not: null } },
      orderBy: { updatedAt: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        stage: { select: { name: true } },
      },
    }),
    prisma.activity.findMany({
      where: {
        isDone: false,
        dueAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      take: 10,
      select: { id: true, title: true, type: true, dueAt: true, client: { select: { name: true } } },
    }),
  ]);

  const pipelineAgg = await prisma.lead.aggregate({
    where: { status: { notIn: ["WON", "LOST"] } },
    _sum: { value: true },
    _count: { id: true },
  });

  return {
    newLeads,
    wonDeals,
    lostDeals,
    stageMoves,
    dueActivities,
    pipeline: {
      value: pipelineAgg._sum.value ?? 0,
      count: pipelineAgg._count.id,
    },
  };
}

export async function notifyBusinessEvent(input: {
  title: string;
  body: string;
  type: string;
  link?: string;
  userIds?: string[];
  notifyStaff?: boolean;
}) {
  let targets = input.userIds ?? [];
  if (input.notifyStaff && targets.length === 0) {
    const staff = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN", "OPERATORE"] } },
      select: { id: true },
      take: 50,
    });
    targets = staff.map((u) => u.id);
  }
  if (targets.length === 0) return;

  await prisma.notification.createMany({
    data: targets.map((userId) => ({
      userId,
      title: input.title,
      body: input.body,
      type: input.type,
      link: input.link,
    })),
  });
}

export async function createPortaleLead(input: {
  clientId: string;
  title: string;
  message?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  userId?: string;
}) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { isDefault: true },
    include: { stages: { orderBy: { order: "asc" }, take: 1 } },
  });

  const lead = await prisma.lead.create({
    data: {
      title: input.title,
      clientId: input.clientId,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      source: "OTHER",
      status: "NEW",
      priority: "MEDIUM",
      pipelineId: pipeline?.id,
      stageId: pipeline?.stages[0]?.id,
      assigneeId: input.userId,
    },
    include: {
      client: { select: { name: true } },
    },
  });

  if (input.message && input.userId) {
    await prisma.note.create({
      data: {
        content: input.message,
        leadId: lead.id,
        clientId: input.clientId,
        authorId: input.userId,
      },
    });
  }

  await notifyBusinessEvent({
    title: "Nuovo lead da portale",
    body: `${lead.client?.name || "Cliente"}: ${input.title}`,
    type: "business_lead_portal",
    link: `/business?v=lead&id=${lead.id}&prefill=1`,
    notifyStaff: true,
  });

  return lead;
}

export function buildReportCsv(data: Record<string, unknown>): string {
  const lines: string[] = ["section,key,value"];
  function flatten(obj: Record<string, unknown>, prefix = "") {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (typeof item === "object" && item) flatten(item as Record<string, unknown>, `${key}[${i}]`);
          else lines.push(`${key}[${i}],${String(item)}`);
        });
      } else if (typeof v === "object" && v !== null) {
        flatten(v as Record<string, unknown>, key);
      } else {
        lines.push(`${key},${String(v ?? "")}`);
      }
    }
  }
  flatten(data);
  return lines.join("\n");
}
