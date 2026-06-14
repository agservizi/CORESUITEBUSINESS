import { prisma } from "@/lib/prisma";
import { getBusinessClientProfile, getBusinessNextActions, getPipelineIntelligence } from "@/lib/business-wow";
import { getFinanceDashboard } from "@/lib/platform/finance-dashboard-service";
import { getFinanceInsights } from "@/lib/platform/finance-dashboard-service";
import { getExpressClientProfile } from "@/lib/platform/express-wow";
import { getOpportunityInsights } from "@/lib/platform/opportunities-wow";
import { getClientIdForUser } from "@/lib/api-handler";
import { redactObject } from "./redact";
import type { AiScope } from "./types";

export interface BuildContextInput {
  scope: AiScope;
  entityId?: string;
  moduleKey?: string;
  userId: string;
  role: string;
  userEmail?: string;
  extra?: Record<string, unknown>;
}

export async function buildAiContext(input: BuildContextInput): Promise<Record<string, unknown>> {
  const { scope, entityId, moduleKey, userId, role, extra } = input;

  switch (scope) {
    case "hub":
    case "operations":
      return buildOperationsContext();
    case "business":
      if (entityId) {
        const profile = await getBusinessClientProfile(entityId);
        const actions = await getBusinessNextActions(userId);
        return { client: profile, nextActions: actions.slice(0, 8), ...extra };
      }
      return {
        pipeline: await getPipelineIntelligence(),
        nextActions: (await getBusinessNextActions(userId)).slice(0, 10),
        ...extra,
      };
    case "tickets":
      if (entityId) return { ticket: await loadTicket(entityId), ...extra };
      return {
        openTickets: await prisma.ticket.findMany({
          where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "WAITING_PARTNER"] } },
          take: 15,
          orderBy: { updatedAt: "desc" },
          select: { id: true, code: true, subject: true, status: true, priority: true, type: true },
        }),
        ...extra,
      };
    case "express":
      if (entityId) {
        const client = await getExpressClientProfile(entityId);
        return { client, cart: extra?.cart, ...extra };
      }
      return extra ?? {};
    case "finance":
      if (entityId) {
        const movement = await prisma.cashMovement.findUnique({
          where: { id: entityId },
          include: { client: { select: { name: true } }, expressSale: { select: { receiptNumber: true } } },
        });
        return { movement, ...extra };
      }
      const [dashboard, insights] = await Promise.all([
        getFinanceDashboard("week"),
        getFinanceInsights(),
      ]);
      return { dashboard, insights, ...extra };
    case "opportunities":
      if (entityId) {
        const opp = await prisma.opportunity.findUnique({
          where: { id: entityId },
          include: {
            status: true,
            client: { select: { name: true, companyName: true } },
            provider: { select: { name: true } },
            offer: { select: { name: true } },
          },
        });
        return { opportunity: opp, ...extra };
      }
      return { insights: await getOpportunityInsights(userId, role), ...extra };
    case "practices": {
      const base = await loadPracticeContext(moduleKey, entityId, extra);
      if (!entityId) {
        const pendingPractices = await prisma.practice.findMany({
          where: { status: { notIn: ["COMPLETATA", "ANNULLATA"] } },
          take: 15,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            code: true,
            practiceType: true,
            status: true,
            category: true,
            client: { select: { name: true } },
          },
        });
        return { ...base, pendingPractices };
      }
      return base;
    }
    case "marketing":
      if (entityId) {
        const campaign = await prisma.emailCampaign.findUnique({ where: { id: entityId } });
        return { campaign, ...extra };
      }
      return {
        recentCampaigns: await prisma.emailCampaign.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, status: true, subject: true },
        }),
        subscriberCount: await prisma.emailSubscriber.count(),
        ...extra,
      };
    case "curriculum":
      if (entityId) {
        const record = await prisma.curriculumRecord.findUnique({
          where: { id: entityId },
          include: { client: { select: { name: true } } },
        });
        return { curriculum: record, ...extra };
      }
      return extra ?? {};
    case "portal": {
      const clientId = await getClientIdForUser({
        id: input.userId,
        role: input.role,
        email: input.userEmail || "",
      });
      if (!clientId) return { error: "Cliente non collegato", ...extra };
      const [tickets, practices] = await Promise.all([
        prisma.ticket.findMany({
          where: { clientId },
          take: 10,
          orderBy: { updatedAt: "desc" },
          select: { code: true, subject: true, status: true, updatedAt: true },
        }),
        prisma.practice.findMany({
          where: { clientId },
          take: 10,
          orderBy: { updatedAt: "desc" },
          select: { code: true, practiceType: true, status: true, category: true },
        }),
      ]);
      return { clientId, tickets, practices, ...extra };
    }
    default:
      return extra ?? {};
  }
}

async function loadTicket(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 30 },
      client: { select: { name: true, companyName: true } },
      assignedTo: { select: { name: true } },
    },
  });
}

async function loadPracticeContext(
  moduleKey: string | undefined,
  entityId: string | undefined,
  extra?: Record<string, unknown>
) {
  const key = moduleKey || "caf-patronato";
  if (!entityId) return { moduleKey: key, ...extra };

  switch (key) {
    case "caf-patronato":
      return {
        moduleKey: key,
        practice: await prisma.practice.findUnique({
          where: { id: entityId },
          include: { client: { select: { name: true } } },
        }),
        ...extra,
      };
    case "anpr":
      return { moduleKey: key, record: await prisma.anprRequest.findUnique({ where: { id: entityId } }), ...extra };
    case "cie":
      return { moduleKey: key, record: await prisma.cieBooking.findUnique({ where: { id: entityId } }), ...extra };
    case "energia":
      return {
        moduleKey: key,
        record: await prisma.energyContract.findUnique({
          where: { id: entityId },
          include: { client: { select: { name: true } } },
        }),
        ...extra,
      };
    case "aci":
      return { moduleKey: key, record: await prisma.aciPractice.findUnique({ where: { id: entityId } }), ...extra };
    case "visure-cr":
      return { moduleKey: key, record: await prisma.visureCase.findUnique({ where: { id: entityId } }), ...extra };
    case "posta-telematica":
      return {
        moduleKey: key,
        record: await prisma.pecMailbox.findFirst({ where: { id: entityId } }),
        ...extra,
      };
    default:
      return { moduleKey: key, entityId, ...extra };
  }
}

async function buildOperationsContext() {
  const [
    openTickets,
    todayAppointments,
    pendingPractices,
    openShipments,
    pendingPackages,
    pendingMovements,
    cashSession,
    recentPendingPractices,
  ] = await Promise.all([
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.appointment.count({
      where: {
        startsAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
    prisma.practice.count({ where: { status: { notIn: ["COMPLETATA", "ANNULLATA"] } } }),
    prisma.shipment.count({ where: { status: { notIn: ["CONSEGNATO"] } } }),
    prisma.pickupPackage.count({ where: { status: { in: ["SEGNALATO", "RICEVUTO", "PRONTO"] } } }),
    prisma.cashMovement.count({
      where: { status: { notIn: ["Pagato", "Completato", "Annullato"] } },
    }),
    prisma.cashRegisterSession.findFirst({
      where: { businessDate: new Date(new Date().setHours(12, 0, 0, 0)) },
      select: { status: true, openingAmount: true },
    }),
    prisma.practice.findMany({
      where: { status: { notIn: ["COMPLETATA", "ANNULLATA"] } },
      take: 8,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        code: true,
        practiceType: true,
        status: true,
        client: { select: { name: true } },
      },
    }),
  ]);

  return {
    kpi: {
      openTickets,
      todayAppointments,
      pendingPractices,
      openShipments,
      pendingPackages,
      pendingMovements,
      cashSessionStatus: cashSession?.status ?? "NONE",
    },
    pendingPractices: recentPendingPractices,
    date: new Date().toISOString(),
  };
}

export async function buildSafeContextJson(input: BuildContextInput): Promise<string> {
  const ctx = await buildAiContext(input);
  return JSON.stringify(redactObject(ctx)).slice(0, 24_000);
}
