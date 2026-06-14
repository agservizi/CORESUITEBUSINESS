import { prisma } from "@/lib/prisma";
import {
  assertCanDeleteCashMovement,
  normalizeMovementStatus,
  paidAtForStatus,
} from "@/lib/platform/cash-movement-utils";
import type { Priority } from "@/generated/prisma";
import {
  removeAppointmentFromGoogle,
  syncAppointmentToGoogle,
} from "@/lib/platform/appointment-google-sync";

export const PLATFORM_MODULE_KEYS = [
  "tickets",
  "appuntamenti",
  "caf-patronato",
  "entrate-uscite",
  "energia",
  "anpr",
  "cie",
  "visure-cr",
  "brt",
  "logistica",
  "marketing",
  "marketing-campaigns",
  "fedelta",
  "curriculum",
  "aci",
  "telegrammi",
  "posta-telematica",
  "express",
  "listino",
  "opportunities",
  "web-projects",
] as const;

export type PlatformModuleKey = (typeof PLATFORM_MODULE_KEYS)[number];

const MODULE_SERVICE_SLUG: Record<string, string> = {
  "marketing-campaigns": "marketing",
  listino: "entrate-uscite",
  opportunities: "opportunities",
  express: "express",
};

export function getServiceSlugForModule(moduleKey: string): string {
  return MODULE_SERVICE_SLUG[moduleKey] ?? moduleKey;
}

export function isPlatformModule(moduleKey: string): moduleKey is PlatformModuleKey {
  return (PLATFORM_MODULE_KEYS as readonly string[]).includes(moduleKey);
}

const SLA_HOURS: Record<Priority, number> = {
  URGENT: 4,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 72,
};

export function slaDueFromPriority(priority: Priority, from = new Date()): Date {
  const hours = SLA_HOURS[priority] ?? SLA_HOURS.MEDIUM;
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export async function computeCashMovementFields(data: Record<string, unknown>) {
  const quantity = data.quantity !== undefined ? Number(data.quantity) : 1;
  const unitPrice = data.unitPrice !== undefined ? Number(data.unitPrice) : Number(data.amount) || 0;
  const amount = quantity * unitPrice;

  let resellerCost: number | undefined;
  let clientPrice: number | undefined;
  let margin: number | undefined;

  if (data.priceListItemId) {
    const item = await prisma.priceListItem.findUnique({
      where: { id: String(data.priceListItemId) },
    });
    if (item) {
      resellerCost = Number(item.resellerCost);
      clientPrice = Number(item.clientPrice);
      margin = Number(item.margin) * quantity;
    }
  } else if (data.resellerCost !== undefined && data.clientPrice !== undefined) {
    resellerCost = Number(data.resellerCost);
    clientPrice = Number(data.clientPrice);
    margin = clientPrice * quantity - resellerCost * quantity;
  }

  return { quantity, unitPrice, amount, resellerCost, clientPrice, margin };
}

function str(v: unknown) {
  return v !== undefined && v !== null ? String(v) : undefined;
}

function num(v: unknown) {
  return v !== undefined && v !== null ? Number(v) : undefined;
}

function date(v: unknown) {
  return v ? new Date(String(v)) : undefined;
}

export async function getModuleRecord(moduleKey: string, id: string) {
  switch (moduleKey) {
    case "tickets":
      return prisma.ticket.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
    case "appuntamenti":
      return prisma.appointment.findUnique({ where: { id }, include: { client: { select: { name: true } } } });
    case "caf-patronato":
      return prisma.practice.findUnique({ where: { id }, include: { client: { select: { name: true } } } });
    case "entrate-uscite":
      return prisma.cashMovement.findUnique({
        where: { id },
        include: {
          client: { select: { id: true, name: true } },
          expressSale: { select: { id: true, receiptNumber: true, paymentMethod: true } },
        },
      });
    case "energia":
      return prisma.energyContract.findUnique({ where: { id } });
    case "anpr":
      return prisma.anprRequest.findUnique({ where: { id } });
    case "cie":
      return prisma.cieBooking.findUnique({ where: { id } });
    case "visure-cr":
      return prisma.visureCase.findUnique({ where: { id } });
    case "brt":
      return prisma.shipment.findUnique({ where: { id } });
    case "logistica":
      return prisma.pickupPackage.findUnique({ where: { id } });
    case "marketing":
      return prisma.emailSubscriber.findUnique({ where: { id } });
    case "marketing-campaigns":
      return prisma.emailCampaign.findUnique({
        where: { id },
        include: { recipients: { take: 50, orderBy: { sentAt: "desc" } } },
      });
    case "fedelta":
      return prisma.loyaltyPoint.findUnique({ where: { id } });
    case "curriculum":
      return prisma.curriculumRecord.findUnique({ where: { id } });
    case "aci":
      return prisma.aciPractice.findUnique({ where: { id } });
    case "telegrammi":
      return prisma.telegramRequest.findUnique({ where: { id } });
    case "posta-telematica":
      return prisma.pecMailbox.findUnique({ where: { id } });
    case "express":
      return prisma.expressSale.findUnique({ where: { id } });
    case "listino":
      return prisma.priceListItem.findUnique({ where: { id } });
    case "opportunities":
      return prisma.opportunity.findUnique({
        where: { id },
        include: {
          status: true,
          provider: true,
          collaborator: { select: { name: true, email: true } },
        },
      });
    case "web-projects":
      return prisma.webProject.findUnique({ where: { id } });
    default:
      throw new Error(`Modulo non supportato: ${moduleKey}`);
  }
}

export async function updateModuleRecord(
  moduleKey: string,
  id: string,
  data: Record<string, unknown>,
  _userId: string
) {
  switch (moduleKey) {
    case "tickets": {
      const priority = data.priority as Priority | undefined;
      const slaDueAt =
        priority !== undefined ? slaDueFromPriority(priority) : data.slaDueAt ? date(data.slaDueAt) : undefined;
      return prisma.ticket.update({
        where: { id },
        data: {
          ...(data.subject !== undefined && { subject: String(data.subject) }),
          ...(data.customerName !== undefined && { customerName: str(data.customerName) }),
          ...(data.customerEmail !== undefined && { customerEmail: str(data.customerEmail) }),
          ...(data.customerPhone !== undefined && { customerPhone: str(data.customerPhone) }),
          ...(data.type !== undefined && { type: data.type as "SUPPORT" | "TECH" | "ADMIN" | "SALES" }),
          ...(priority !== undefined && { priority, slaDueAt }),
          ...(data.status !== undefined && { status: data.status as never }),
          ...(data.assignedToId !== undefined && { assignedToId: str(data.assignedToId) }),
          ...(data.clientId !== undefined && { clientId: str(data.clientId) }),
          ...(data.tags !== undefined && { tags: data.tags as string[] }),
        },
      });
    }
    case "appuntamenti": {
      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: String(data.title) }),
          ...(data.serviceType !== undefined && { serviceType: String(data.serviceType) }),
          ...(data.startsAt !== undefined && { startsAt: date(data.startsAt)! }),
          ...(data.endsAt !== undefined && { endsAt: date(data.endsAt) }),
          ...(data.location !== undefined && { location: str(data.location) }),
          ...(data.assignee !== undefined && { assignee: str(data.assignee) }),
          ...(data.status !== undefined && { status: String(data.status) }),
          ...(data.notes !== undefined && { notes: str(data.notes) }),
        },
      });
      try {
        await syncAppointmentToGoogle(updated.id);
      } catch (error) {
        console.error("[Google Calendar] Aggiornamento evento non riuscito:", error);
      }
      return (await prisma.appointment.findUnique({ where: { id } })) ?? updated;
    }
    case "caf-patronato":
      return prisma.practice.update({
        where: { id },
        data: {
          ...(data.practiceType !== undefined && { practiceType: String(data.practiceType) }),
          ...(data.category !== undefined && { category: data.category as "CAF" | "PATRONATO" }),
          ...(data.status !== undefined && { status: data.status as never }),
          ...(data.year !== undefined && { year: num(data.year) }),
          ...(data.notes !== undefined && { notes: str(data.notes) }),
          ...(data.assignee !== undefined && { assignee: str(data.assignee) }),
        },
      });
    case "entrate-uscite": {
      const computed = await computeCashMovementFields({ ...data });
      const status =
        data.status !== undefined
          ? normalizeMovementStatus(String(data.status))
          : undefined;
      return prisma.cashMovement.update({
        where: { id },
        data: {
          ...(data.description !== undefined && { description: String(data.description) }),
          ...(data.type !== undefined && { type: data.type as "ENTRATA" | "USCITA" }),
          ...(data.method !== undefined && { method: String(data.method) }),
          ...(status !== undefined && {
            status,
            paidAt: paidAtForStatus(status),
          }),
          ...(data.dueDate !== undefined && { dueDate: date(data.dueDate) }),
          ...(data.paidAt !== undefined && { paidAt: date(data.paidAt) }),
          ...(data.reference !== undefined && { reference: str(data.reference) }),
          ...(data.clientId !== undefined && { clientId: str(data.clientId) }),
          ...(data.priceListItemId !== undefined && { priceListItemId: str(data.priceListItemId) }),
          ...(data.notes !== undefined && { notes: str(data.notes) }),
          quantity: computed.quantity,
          unitPrice: computed.unitPrice,
          amount: computed.amount,
          ...(computed.resellerCost !== undefined && { resellerCost: computed.resellerCost }),
          ...(computed.clientPrice !== undefined && { clientPrice: computed.clientPrice }),
          ...(computed.margin !== undefined && { margin: computed.margin }),
        },
      });
    }
    case "energia":
      return prisma.energyContract.update({
        where: { id },
        data: {
          ...(data.supplier !== undefined && { supplier: str(data.supplier) }),
          ...(data.contractType !== undefined && { contractType: str(data.contractType) }),
          ...(data.pod !== undefined && { pod: str(data.pod) }),
          ...(data.pdr !== undefined && { pdr: str(data.pdr) }),
          ...(data.status !== undefined && { status: String(data.status) }),
          ...(data.startDate !== undefined && { startDate: date(data.startDate) }),
          ...(data.endDate !== undefined && { endDate: date(data.endDate) }),
          ...(data.notes !== undefined && { notes: str(data.notes) }),
        },
      });
    case "anpr":
      return prisma.anprRequest.update({
        where: { id },
        data: {
          ...(data.requestType !== undefined && { requestType: String(data.requestType) }),
          ...(data.status !== undefined && { status: String(data.status) }),
          ...(data.scheduledAt !== undefined && { scheduledAt: date(data.scheduledAt) }),
          ...(data.notes !== undefined && { notes: str(data.notes) }),
        },
      });
    case "cie":
      return prisma.cieBooking.update({
        where: { id },
        data: {
          ...(data.slotAt !== undefined && { slotAt: date(data.slotAt)! }),
          ...(data.status !== undefined && { status: String(data.status) }),
          ...(data.notes !== undefined && { notes: str(data.notes) }),
        },
      });
    case "visure-cr":
      return prisma.visureCase.update({
        where: { id },
        data: {
          ...(data.caseType !== undefined && { caseType: String(data.caseType) }),
          ...(data.registry !== undefined && { registry: str(data.registry) }),
          ...(data.status !== undefined && { status: String(data.status) }),
          ...(data.resultUrl !== undefined && { resultUrl: str(data.resultUrl) }),
          ...(data.notes !== undefined && { notes: str(data.notes) }),
        },
      });
    case "brt":
      return prisma.shipment.update({
        where: { id },
        data: {
          ...(data.recipientName !== undefined && { recipientName: String(data.recipientName) }),
          ...(data.recipientAddress !== undefined && { recipientAddress: str(data.recipientAddress) }),
          ...(data.weightKg !== undefined && { weightKg: num(data.weightKg) }),
          ...(data.status !== undefined && { status: data.status as never }),
          ...(data.notes !== undefined && { notes: str(data.notes) }),
        },
      });
    case "logistica":
      return prisma.pickupPackage.update({
        where: { id },
        data: {
          ...(data.senderName !== undefined && { senderName: String(data.senderName) }),
          ...(data.description !== undefined && { description: str(data.description) }),
          ...(data.status !== undefined && { status: data.status as never }),
          ...(data.notes !== undefined && { notes: str(data.notes) }),
        },
      });
    case "marketing":
      return prisma.emailSubscriber.update({
        where: { id },
        data: {
          ...(data.email !== undefined && { email: String(data.email) }),
          ...(data.firstName !== undefined && { firstName: str(data.firstName) }),
          ...(data.lastName !== undefined && { lastName: str(data.lastName) }),
          ...(data.status !== undefined && { status: data.status as never }),
          ...(data.tags !== undefined && { tags: data.tags as string[] }),
        },
      });
    case "marketing-campaigns":
      return prisma.emailCampaign.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: String(data.name) }),
          ...(data.subject !== undefined && { subject: String(data.subject) }),
          ...(data.htmlBody !== undefined && { htmlBody: String(data.htmlBody) }),
          ...(data.status !== undefined && { status: data.status as never }),
          ...(data.scheduledAt !== undefined && { scheduledAt: date(data.scheduledAt) }),
        },
      });
    case "fedelta":
      return prisma.loyaltyPoint.update({
        where: { id },
        data: {
          ...(data.points !== undefined && { points: Number(data.points) }),
          ...(data.reason !== undefined && { reason: str(data.reason) }),
        },
      });
    case "curriculum":
      return prisma.curriculumRecord.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: String(data.title) }),
          ...(data.status !== undefined && { status: String(data.status) }),
          ...(data.fileUrl !== undefined && { fileUrl: str(data.fileUrl) }),
          ...(data.notes !== undefined && { notes: str(data.notes) }),
        },
      });
    case "aci":
      return prisma.aciPractice.update({
        where: { id },
        data: {
          ...(data.practiceType !== undefined && { practiceType: String(data.practiceType) }),
          ...(data.plate !== undefined && { plate: str(data.plate) }),
          ...(data.status !== undefined && { status: String(data.status) }),
          ...(data.notes !== undefined && { notes: str(data.notes) }),
        },
      });
    case "telegrammi":
      return prisma.telegramRequest.update({
        where: { id },
        data: {
          ...(data.senderName !== undefined && { senderName: String(data.senderName) }),
          ...(data.recipient !== undefined && { recipient: String(data.recipient) }),
          ...(data.body !== undefined && { body: String(data.body) }),
          ...(data.status !== undefined && { status: String(data.status) }),
        },
      });
    case "posta-telematica":
      return prisma.pecMailbox.update({
        where: { id },
        data: {
          ...(data.address !== undefined && { address: String(data.address) }),
          ...(data.provider !== undefined && { provider: str(data.provider) }),
          ...(data.status !== undefined && { status: String(data.status) }),
          ...(data.expiresAt !== undefined && { expiresAt: date(data.expiresAt) }),
          ...(data.notes !== undefined && { notes: str(data.notes) }),
        },
      });
    case "express":
      return prisma.expressSale.update({
        where: { id },
        data: {
          ...(data.status !== undefined && { status: String(data.status) }),
          ...(data.paymentMethod !== undefined && { paymentMethod: String(data.paymentMethod) }),
          ...(data.total !== undefined && { total: num(data.total) }),
          ...(data.discount !== undefined && { discount: num(data.discount) }),
          ...(data.notes !== undefined && { notes: str(data.notes) }),
        },
      });
    case "listino":
      return prisma.priceListItem.update({
        where: { id },
        data: {
          ...(data.code !== undefined && { code: String(data.code) }),
          ...(data.name !== undefined && { name: String(data.name) }),
          ...(data.category !== undefined && { category: str(data.category) }),
          ...(data.resellerCost !== undefined && { resellerCost: num(data.resellerCost) }),
          ...(data.clientPrice !== undefined && { clientPrice: num(data.clientPrice) }),
          ...(data.margin !== undefined && { margin: num(data.margin) }),
          ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
        },
      });
    case "opportunities":
      return prisma.opportunity.update({
        where: { id },
        data: {
          ...(data.statusCode !== undefined && {
            statusCode: String(data.statusCode),
            lastStatusChange: new Date(),
          }),
          ...(data.contractCode !== undefined && { contractCode: str(data.contractCode) }),
          ...(data.clientCode !== undefined && { clientCode: str(data.clientCode) }),
          ...(data.adminNotes !== undefined && { adminNotes: str(data.adminNotes) }),
        },
      });
    case "web-projects":
      return prisma.webProject.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: String(data.name) }),
          ...(data.domain !== undefined && { domain: str(data.domain) }),
          ...(data.status !== undefined && { status: String(data.status) }),
          ...(data.launchDate !== undefined && { launchDate: date(data.launchDate) }),
          ...(data.notes !== undefined && { notes: str(data.notes) }),
        },
      });
    default:
      throw new Error(`Modulo non supportato: ${moduleKey}`);
  }
}

export async function deleteModuleRecord(moduleKey: string, id: string) {
  switch (moduleKey) {
    case "tickets":
      return prisma.ticket.delete({ where: { id } });
    case "appuntamenti": {
      const existing = await prisma.appointment.findUnique({ where: { id } });
      if (existing) {
        try {
          await removeAppointmentFromGoogle(existing);
        } catch (error) {
          console.error("[Google Calendar] Eliminazione evento non riuscita:", error);
        }
      }
      return prisma.appointment.delete({ where: { id } });
    }
    case "caf-patronato":
      return prisma.practice.delete({ where: { id } });
    case "entrate-uscite":
      await assertCanDeleteCashMovement(id);
      return prisma.cashMovement.delete({ where: { id } });
    case "energia":
      return prisma.energyContract.delete({ where: { id } });
    case "anpr":
      return prisma.anprRequest.delete({ where: { id } });
    case "cie":
      return prisma.cieBooking.delete({ where: { id } });
    case "visure-cr":
      return prisma.visureCase.delete({ where: { id } });
    case "brt":
      return prisma.shipment.delete({ where: { id } });
    case "logistica":
      return prisma.pickupPackage.delete({ where: { id } });
    case "marketing":
      return prisma.emailSubscriber.delete({ where: { id } });
    case "marketing-campaigns":
      return prisma.emailCampaign.delete({ where: { id } });
    case "fedelta":
      return prisma.loyaltyPoint.delete({ where: { id } });
    case "curriculum":
      return prisma.curriculumRecord.delete({ where: { id } });
    case "aci":
      return prisma.aciPractice.delete({ where: { id } });
    case "telegrammi":
      return prisma.telegramRequest.delete({ where: { id } });
    case "posta-telematica":
      return prisma.pecMailbox.delete({ where: { id } });
    case "express":
      return prisma.expressSale.delete({ where: { id } });
    case "listino":
      return prisma.priceListItem.delete({ where: { id } });
    case "opportunities":
      return prisma.opportunity.delete({ where: { id } });
    case "web-projects":
      return prisma.webProject.delete({ where: { id } });
    default:
      throw new Error(`Modulo non supportato: ${moduleKey}`);
  }
}

export async function createEmailCampaign(data: Record<string, unknown>) {
  return prisma.emailCampaign.create({
    data: {
      name: String(data.name),
      subject: String(data.subject),
      htmlBody: String(data.htmlBody || data.body || ""),
      status: "DRAFT",
      scheduledAt: data.scheduledAt ? new Date(String(data.scheduledAt)) : undefined,
    },
  });
}

export async function sendEmailCampaign(campaignId: string) {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campagna non trovata");
  if (campaign.status === "SENT") throw new Error("Campagna già inviata");

  const subscribers = await prisma.emailSubscriber.findMany({
    where: { status: "ACTIVE" },
  });

  if (subscribers.length > 0) {
    await prisma.campaignRecipient.createMany({
      data: subscribers.map((s) => ({
        campaignId,
        subscriberId: s.id,
        email: s.email,
        status: "ACTIVE" as const,
        sentAt: new Date(),
      })),
    });
  }

  return prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: "SENT",
      sentAt: new Date(),
      recipientCount: subscribers.length,
    },
    include: { recipients: true },
  });
}
