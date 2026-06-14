import { prisma } from "@/lib/prisma";
import type { Priority } from "@/generated/prisma";
import {
  computeCashMovementFields,
  createEmailCampaign,
  slaDueFromPriority,
} from "./module-crud";
import {
  normalizeMovementStatus,
  paidAtForStatus,
} from "./cash-movement-utils";
import {
  defaultAppointmentEndsAt,
  removeAppointmentFromGoogle,
  syncAppointmentToGoogle,
} from "./appointment-google-sync";

function nextCode(prefix: string) {
  const n = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix}-${n}`;
}

export async function createModuleRecord(
  moduleKey: string,
  data: Record<string, unknown>,
  userId: string
) {
  switch (moduleKey) {
    case "tickets": {
      const priority = (data.priority as Priority) || "MEDIUM";
      return prisma.ticket.create({
        data: {
          code: nextCode("TK"),
          subject: String(data.subject),
          customerName: data.customerName ? String(data.customerName) : undefined,
          customerEmail: data.customerEmail ? String(data.customerEmail) : undefined,
          customerPhone: data.customerPhone ? String(data.customerPhone) : undefined,
          clientId: data.clientId ? String(data.clientId) : undefined,
          type: (data.type as "SUPPORT" | "TECH" | "ADMIN" | "SALES") || "SUPPORT",
          priority,
          slaDueAt: slaDueFromPriority(priority),
          createdById: userId,
        },
      });
    }
    case "appuntamenti": {
      const startsAt = new Date(String(data.startsAt));
      const endsAt = data.endsAt ? new Date(String(data.endsAt)) : defaultAppointmentEndsAt(startsAt);
      const created = await prisma.appointment.create({
        data: {
          clientId: String(data.clientId || "demo-client"),
          title: String(data.title),
          serviceType: String(data.serviceType),
          startsAt,
          endsAt,
          location: data.location ? String(data.location) : undefined,
          assignee: data.assignee ? String(data.assignee) : undefined,
          notes: data.notes ? String(data.notes) : undefined,
          status: data.status ? String(data.status) : undefined,
        },
      });
      try {
        await syncAppointmentToGoogle(created.id);
      } catch (error) {
        console.error("[Google Calendar] Creazione evento non riuscita:", error);
      }
      return (await prisma.appointment.findUnique({ where: { id: created.id } })) ?? created;
    }
    case "caf-patronato":
      return prisma.practice.create({
        data: {
          code: nextCode("PR"),
          clientId: String(data.clientId || "demo-client"),
          category: data.category as "CAF" | "PATRONATO",
          practiceType: String(data.practiceType),
          year: data.year ? Number(data.year) : undefined,
          notes: data.notes ? String(data.notes) : undefined,
        },
      });
    case "entrate-uscite": {
      const computed = await computeCashMovementFields(data);
      const status = normalizeMovementStatus(data.status ? String(data.status) : "In lavorazione");
      return prisma.cashMovement.create({
        data: {
          description: String(data.description),
          type: (data.type as "ENTRATA" | "USCITA") || "ENTRATA",
          amount: computed.amount,
          quantity: computed.quantity,
          unitPrice: computed.unitPrice,
          priceListItemId: data.priceListItemId ? String(data.priceListItemId) : undefined,
          resellerCost: computed.resellerCost,
          clientPrice: computed.clientPrice,
          margin: computed.margin,
          method: data.method ? String(data.method) : "Bonifico",
          status,
          paidAt: paidAtForStatus(status),
          dueDate: data.dueDate ? new Date(String(data.dueDate)) : undefined,
          clientId: data.clientId ? String(data.clientId) : undefined,
          reference: data.reference ? String(data.reference) : undefined,
          notes: data.notes ? String(data.notes) : undefined,
        },
      });
    }
    case "energia":
      return prisma.energyContract.create({
        data: {
          clientId: String(data.clientId || "demo-client"),
          supplier: data.supplier ? String(data.supplier) : undefined,
          contractType: data.contractType ? String(data.contractType) : undefined,
          pod: data.pod ? String(data.pod) : undefined,
          pdr: data.pdr ? String(data.pdr) : undefined,
        },
      });
    case "anpr":
      return prisma.anprRequest.create({
        data: {
          clientId: String(data.clientId || "demo-client"),
          requestType: String(data.requestType),
          scheduledAt: data.scheduledAt ? new Date(String(data.scheduledAt)) : undefined,
          notes: data.notes ? String(data.notes) : undefined,
        },
      });
    case "cie":
      return prisma.cieBooking.create({
        data: {
          clientId: String(data.clientId || "demo-client"),
          slotAt: new Date(String(data.slotAt)),
          notes: data.notes ? String(data.notes) : undefined,
        },
      });
    case "visure-cr":
      return prisma.visureCase.create({
        data: {
          clientId: String(data.clientId || "demo-client"),
          caseType: String(data.caseType),
          registry: data.registry ? String(data.registry) : undefined,
        },
      });
    case "brt":
      return prisma.shipment.create({
        data: {
          trackingCode: nextCode("BRT"),
          recipientName: String(data.recipientName),
          recipientAddress: data.recipientAddress ? String(data.recipientAddress) : undefined,
          weightKg: data.weightKg ? Number(data.weightKg) : undefined,
          clientId: data.clientId ? String(data.clientId) : undefined,
        },
      });
    case "logistica":
      return prisma.pickupPackage.create({
        data: {
          senderName: String(data.senderName),
          description: data.description ? String(data.description) : undefined,
          clientId: data.clientId ? String(data.clientId) : undefined,
        },
      });
    case "marketing":
      return prisma.emailSubscriber.create({
        data: {
          email: String(data.email),
          firstName: data.firstName ? String(data.firstName) : undefined,
          lastName: data.lastName ? String(data.lastName) : undefined,
        },
      });
    case "marketing-campaigns":
      return createEmailCampaign(data);
    case "fedelta":
      return prisma.loyaltyPoint.create({
        data: {
          clientId: String(data.clientId || "demo-client"),
          points: Number(data.points) || 0,
          reason: data.reason ? String(data.reason) : undefined,
        },
      });
    case "curriculum":
      return prisma.curriculumRecord.create({
        data: {
          clientId: String(data.clientId || "demo-client"),
          title: String(data.title),
          notes: data.notes ? String(data.notes) : undefined,
        },
      });
    case "aci":
      return prisma.aciPractice.create({
        data: {
          clientId: String(data.clientId || "demo-client"),
          practiceType: String(data.practiceType),
          plate: data.plate ? String(data.plate) : undefined,
        },
      });
    case "telegrammi":
      return prisma.telegramRequest.create({
        data: {
          senderName: String(data.senderName),
          recipient: String(data.recipient),
          body: String(data.body),
          clientId: data.clientId ? String(data.clientId) : undefined,
        },
      });
    case "posta-telematica":
      throw new Error(
        "La casella PEC è configurata nel file .env (PEC_SMTP_* / PEC_IMAP_*). Usa Nuovo invio o Posta in arrivo."
      );
    case "express":
      throw new Error(
        "Le vendite Express vanno registrate dal modulo POS (/services/express?view=pos)"
      );
    case "listino":
      return prisma.priceListItem.create({
        data: {
          code: data.code ? String(data.code) : nextCode("PL"),
          name: String(data.name),
          category: data.category ? String(data.category) : undefined,
          resellerCost: data.resellerCost ? Number(data.resellerCost) : 0,
          clientPrice: data.clientPrice ? Number(data.clientPrice) : 0,
          margin: data.margin
            ? Number(data.margin)
            : (Number(data.clientPrice) || 0) - (Number(data.resellerCost) || 0),
        },
      });
    case "opportunities":
      throw new Error(
        "I contratti opportunity vanno creati dal modulo dedicato (/services/opportunities?view=nuovo)"
      );
    case "web-projects":
      return prisma.webProject.create({
        data: {
          clientId: String(data.clientId || "demo-client"),
          name: String(data.name),
          domain: data.domain ? String(data.domain) : undefined,
          notes: data.notes ? String(data.notes) : undefined,
        },
      });
    default:
      throw new Error(`Modulo non supportato: ${moduleKey}`);
  }
}

export async function listModuleRecords(
  moduleKey: string,
  filter?: Record<string, unknown>,
  take = 100,
  view?: string,
  skip = 0
) {
  const where = filter || {};

  if (moduleKey === "marketing" && view === "campagne") {
    return prisma.emailCampaign.findMany({ take, orderBy: { createdAt: "desc" } });
  }

  switch (moduleKey) {
    case "tickets":
      return prisma.ticket.findMany({ where, take, orderBy: { createdAt: "desc" } });
    case "appuntamenti":
      return prisma.appointment.findMany({ where, take, orderBy: { startsAt: "desc" } });
    case "caf-patronato":
      return prisma.practice.findMany({ where, take, orderBy: { createdAt: "desc" } });
    case "entrate-uscite":
      return prisma.cashMovement.findMany({
        where,
        take,
        skip,
        orderBy:
          view === "scadenze"
            ? [{ dueDate: "asc" }, { createdAt: "desc" }]
            : { createdAt: "desc" },
        include: {
          client: { select: { id: true, name: true } },
          expressSale: { select: { id: true, receiptNumber: true, paymentMethod: true } },
        },
      });
    case "energia":
      return prisma.energyContract.findMany({ where, take, orderBy: { createdAt: "desc" } });
    case "anpr":
      return prisma.anprRequest.findMany({ where, take, orderBy: { createdAt: "desc" } });
    case "cie":
      return prisma.cieBooking.findMany({ where, take, orderBy: { slotAt: "desc" } });
    case "visure-cr":
      return prisma.visureCase.findMany({ where, take, orderBy: { createdAt: "desc" } });
    case "brt":
      return prisma.shipment.findMany({ where, take, orderBy: { createdAt: "desc" } });
    case "logistica":
      return prisma.pickupPackage.findMany({ where, take, orderBy: { createdAt: "desc" } });
    case "marketing":
      return prisma.emailSubscriber.findMany({ where, take, orderBy: { createdAt: "desc" } });
    case "marketing-campaigns":
      return prisma.emailCampaign.findMany({ where, take, orderBy: { createdAt: "desc" } });
    case "fedelta":
      return prisma.loyaltyPoint.findMany({
        where,
        take,
        orderBy: { movedAt: "desc" },
        include: { client: { select: { name: true } } },
      });
    case "curriculum":
      return prisma.curriculumRecord.findMany({ where, take, orderBy: { createdAt: "desc" } });
    case "aci":
      return prisma.aciPractice.findMany({ where, take, orderBy: { createdAt: "desc" } });
    case "telegrammi":
      return prisma.telegramRequest.findMany({ where, take, orderBy: { createdAt: "desc" } });
    case "posta-telematica":
      return prisma.pecMailbox.findMany({ where, take, orderBy: { createdAt: "desc" } });
    case "express":
      return prisma.expressSale.findMany({
        where,
        take,
        orderBy: { soldAt: "desc" },
        include: {
          client: { select: { id: true, name: true } },
          _count: { select: { lines: true } },
        },
      });
    case "listino":
      return prisma.priceListItem.findMany({ where, take, orderBy: { name: "asc" } });
    case "opportunities":
      return prisma.opportunity.findMany({
        where,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          status: true,
          provider: true,
          collaborator: { select: { id: true, name: true, email: true } },
          client: { select: { id: true, name: true, companyName: true } },
        },
      });
    case "web-projects":
      return prisma.webProject.findMany({ where, take, orderBy: { createdAt: "desc" } });
    default:
      throw new Error(`Modulo non supportato: ${moduleKey}`);
  }
}

export async function getModuleRecord(moduleKey: string, id: string) {
  switch (moduleKey) {
    case "tickets":
      return prisma.ticket.findUnique({
        where: { id },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          assignedTo: { select: { id: true, name: true, email: true } },
          client: { select: { id: true, name: true, companyName: true } },
        },
      });
    case "appuntamenti":
      return prisma.appointment.findUnique({
        where: { id },
        include: { client: { select: { id: true, name: true, companyName: true } } },
      });
    case "caf-patronato":
      return prisma.practice.findUnique({
        where: { id },
        include: { client: { select: { id: true, name: true, companyName: true } } },
      });
    case "entrate-uscite":
      return prisma.cashMovement.findUnique({ where: { id } });
    case "energia":
      return prisma.energyContract.findUnique({
        where: { id },
        include: { client: { select: { id: true, name: true } } },
      });
    case "anpr":
      return prisma.anprRequest.findUnique({
        where: { id },
        include: { client: { select: { id: true, name: true } } },
      });
    case "cie":
      return prisma.cieBooking.findUnique({
        where: { id },
        include: { client: { select: { id: true, name: true } } },
      });
    case "visure-cr":
      return prisma.visureCase.findUnique({
        where: { id },
        include: { client: { select: { id: true, name: true } } },
      });
    case "brt":
      return prisma.shipment.findUnique({ where: { id } });
    case "logistica":
      return prisma.pickupPackage.findUnique({ where: { id } });
    case "marketing":
      return prisma.emailSubscriber.findUnique({ where: { id } });
    case "fedelta":
      return prisma.loyaltyPoint.findUnique({
        where: { id },
        include: { client: { select: { id: true, name: true } } },
      });
    case "curriculum":
      return prisma.curriculumRecord.findUnique({
        where: { id },
        include: { client: { select: { id: true, name: true } } },
      });
    case "aci":
      return prisma.aciPractice.findUnique({
        where: { id },
        include: { client: { select: { id: true, name: true } } },
      });
    case "telegrammi":
      return prisma.telegramRequest.findUnique({ where: { id } });
    default:
      throw new Error(`Modulo non supportato: ${moduleKey}`);
  }
}

function strField(data: Record<string, unknown>, key: string) {
  return data[key] !== undefined ? String(data[key]) : undefined;
}

export async function updateModuleRecord(
  moduleKey: string,
  id: string,
  data: Record<string, unknown>
) {
  switch (moduleKey) {
    case "tickets":
      return prisma.ticket.update({
        where: { id },
        data: {
          ...(data.subject !== undefined && { subject: String(data.subject) }),
          ...(data.status !== undefined && { status: data.status as never }),
          ...(data.priority !== undefined && { priority: data.priority as never }),
          ...(data.assignedToId !== undefined && {
            assignedToId: data.assignedToId ? String(data.assignedToId) : null,
          }),
          ...(data.customerName !== undefined && { customerName: strField(data, "customerName") }),
          ...(data.customerEmail !== undefined && { customerEmail: strField(data, "customerEmail") }),
        },
      });
    case "appuntamenti":
      return prisma.appointment.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: String(data.title) }),
          ...(data.serviceType !== undefined && { serviceType: String(data.serviceType) }),
          ...(data.startsAt !== undefined && { startsAt: new Date(String(data.startsAt)) }),
          ...(data.location !== undefined && { location: strField(data, "location") }),
          ...(data.assignee !== undefined && { assignee: strField(data, "assignee") }),
          ...(data.status !== undefined && { status: String(data.status) }),
        },
      });
    case "caf-patronato":
      return prisma.practice.update({
        where: { id },
        data: {
          ...(data.practiceType !== undefined && { practiceType: String(data.practiceType) }),
          ...(data.status !== undefined && { status: data.status as never }),
          ...(data.notes !== undefined && { notes: strField(data, "notes") }),
        },
      });
    case "entrate-uscite":
      return prisma.cashMovement.update({
        where: { id },
        data: {
          ...(data.description !== undefined && { description: String(data.description) }),
          ...(data.amount !== undefined && { amount: Number(data.amount) }),
          ...(data.status !== undefined && { status: String(data.status) }),
          ...(data.dueDate !== undefined && {
            dueDate: data.dueDate ? new Date(String(data.dueDate)) : null,
          }),
        },
      });
    case "energia":
      return prisma.energyContract.update({
        where: { id },
        data: {
          ...(data.supplier !== undefined && { supplier: strField(data, "supplier") }),
          ...(data.contractType !== undefined && { contractType: strField(data, "contractType") }),
          ...(data.pod !== undefined && { pod: strField(data, "pod") }),
          ...(data.status !== undefined && { status: String(data.status) }),
        },
      });
    case "anpr":
      return prisma.anprRequest.update({
        where: { id },
        data: {
          ...(data.requestType !== undefined && { requestType: String(data.requestType) }),
          ...(data.status !== undefined && { status: String(data.status) }),
          ...(data.notes !== undefined && { notes: strField(data, "notes") }),
        },
      });
    case "cie":
      return prisma.cieBooking.update({
        where: { id },
        data: {
          ...(data.slotAt !== undefined && { slotAt: new Date(String(data.slotAt)) }),
          ...(data.status !== undefined && { status: String(data.status) }),
          ...(data.notes !== undefined && { notes: strField(data, "notes") }),
        },
      });
    case "visure-cr":
      return prisma.visureCase.update({
        where: { id },
        data: {
          ...(data.caseType !== undefined && { caseType: String(data.caseType) }),
          ...(data.registry !== undefined && { registry: strField(data, "registry") }),
          ...(data.status !== undefined && { status: String(data.status) }),
        },
      });
    case "brt":
      return prisma.shipment.update({
        where: { id },
        data: {
          ...(data.recipientName !== undefined && { recipientName: String(data.recipientName) }),
          ...(data.status !== undefined && { status: data.status as never }),
        },
      });
    case "logistica":
      return prisma.pickupPackage.update({
        where: { id },
        data: {
          ...(data.senderName !== undefined && { senderName: String(data.senderName) }),
          ...(data.status !== undefined && { status: data.status as never }),
        },
      });
    case "marketing":
      return prisma.emailSubscriber.update({
        where: { id },
        data: {
          ...(data.email !== undefined && { email: String(data.email) }),
          ...(data.firstName !== undefined && { firstName: strField(data, "firstName") }),
          ...(data.status !== undefined && { status: data.status as never }),
        },
      });
    case "fedelta":
      return prisma.loyaltyPoint.update({
        where: { id },
        data: {
          ...(data.points !== undefined && { points: Number(data.points) }),
          ...(data.reason !== undefined && { reason: strField(data, "reason") }),
        },
      });
    case "curriculum":
      return prisma.curriculumRecord.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: String(data.title) }),
          ...(data.status !== undefined && { status: String(data.status) }),
          ...(data.notes !== undefined && { notes: strField(data, "notes") }),
        },
      });
    case "aci":
      return prisma.aciPractice.update({
        where: { id },
        data: {
          ...(data.practiceType !== undefined && { practiceType: String(data.practiceType) }),
          ...(data.plate !== undefined && { plate: strField(data, "plate") }),
          ...(data.status !== undefined && { status: String(data.status) }),
        },
      });
    case "telegrammi":
      return prisma.telegramRequest.update({
        where: { id },
        data: {
          ...(data.recipient !== undefined && { recipient: String(data.recipient) }),
          ...(data.body !== undefined && { body: String(data.body) }),
          ...(data.status !== undefined && { status: String(data.status) }),
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
    case "appuntamenti":
      return prisma.appointment.delete({ where: { id } });
    case "caf-patronato":
      return prisma.practice.delete({ where: { id } });
    case "entrate-uscite":
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
    case "fedelta":
      return prisma.loyaltyPoint.delete({ where: { id } });
    case "curriculum":
      return prisma.curriculumRecord.delete({ where: { id } });
    case "aci":
      return prisma.aciPractice.delete({ where: { id } });
    case "telegrammi":
      return prisma.telegramRequest.delete({ where: { id } });
    default:
      throw new Error(`Modulo non supportato: ${moduleKey}`);
  }
}

export async function getOperationsCharts() {
  const months: { key: string; label: string; start: Date; end: Date }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("it-IT", { month: "short", year: "2-digit" }),
      start: d,
      end,
    });
  }

  const revenueTrend = await Promise.all(
    months.map(async (m) => {
      const agg = await prisma.cashMovement.aggregate({
        where: {
          type: "ENTRATA",
          createdAt: { gte: m.start, lte: m.end },
        },
        _sum: { amount: true },
      });
      return { month: m.label, revenue: Number(agg._sum.amount || 0) };
    })
  );

  const [
    tickets,
    appointments,
    practices,
    shipments,
    packages,
    movements,
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.appointment.count(),
    prisma.practice.count(),
    prisma.shipment.count(),
    prisma.pickupPackage.count(),
    prisma.cashMovement.count(),
  ]);

  const moduleStats = [
    { module: "Ticket", count: tickets, color: "#0ea5e9" },
    { module: "Appuntamenti", count: appointments, color: "#10b981" },
    { module: "Pratiche", count: practices, color: "#f59e0b" },
    { module: "Spedizioni", count: shipments, color: "#ef4444" },
    { module: "Pacchi", count: packages, color: "#f97316" },
    { module: "Movimenti", count: movements, color: "#22c55e" },
  ];

  return { revenueTrend, moduleStats };
}

export async function getOperationsKpi() {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

  const [
    openTickets,
    todayAppointments,
    pendingPractices,
    openShipments,
    pendingPackages,
    activeClients,
    openDeals,
    pendingMovements,
    dailyRevenue,
    energyContracts,
    anprRequests,
    emailSubscribers,
    activeCampaigns,
  ] = await Promise.all([
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.appointment.count({
      where: { startsAt: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.practice.count({ where: { status: { in: ["BOZZA", "IN_LAVORAZIONE"] } } }),
    prisma.shipment.count({ where: { status: { in: ["REGISTRATO", "IN_CORSO"] } } }),
    prisma.pickupPackage.count({ where: { status: { in: ["SEGNALATO", "RICEVUTO", "PRONTO"] } } }),
    prisma.client.count({ where: { status: "ACTIVE" } }),
    prisma.deal.count({ where: { status: "OPEN" } }),
    prisma.cashMovement.count({ where: { status: "In lavorazione" } }),
    prisma.cashMovement.aggregate({
      where: {
        type: "ENTRATA",
        paidAt: { gte: todayStart, lte: todayEnd },
      },
      _sum: { amount: true },
    }),
    prisma.energyContract.count({ where: { status: { not: "Disattivato" } } }),
    prisma.anprRequest.count({ where: { status: { in: ["In attesa", "In lavorazione"] } } }),
    prisma.emailSubscriber.count({ where: { status: "ACTIVE" } }),
    prisma.emailCampaign.count({
      where: { status: { in: ["DRAFT", "SCHEDULED", "SENDING"] } },
    }),
  ]);

  return {
    openTickets,
    todayAppointments,
    pendingPractices,
    openShipments,
    pendingPackages,
    activeClients,
    openDeals,
    pendingMovements,
    dailyRevenue: Number(dailyRevenue._sum.amount ?? 0),
    energyContracts,
    anprRequests,
    emailSubscribers,
    activeCampaigns,
  };
}

export async function countModuleRecords(
  moduleKey: string,
  filter?: Record<string, unknown>
) {
  const where = filter || {};
  switch (moduleKey) {
    case "entrate-uscite":
      return prisma.cashMovement.count({ where });
    default:
      return (await listModuleRecords(moduleKey, filter, 10000)).length;
  }
}

export function buildEntrateUsciteSearchFilter(
  base: Record<string, unknown> | undefined,
  q?: string | null
) {
  const where = { ...(base || {}) } as Record<string, unknown>;
  const term = q?.trim();
  if (!term) return where;
  return {
    AND: [
      where,
      {
        OR: [
          { description: { contains: term, mode: "insensitive" } },
          { method: { contains: term, mode: "insensitive" } },
          { reference: { contains: term, mode: "insensitive" } },
          { notes: { contains: term, mode: "insensitive" } },
          { client: { name: { contains: term, mode: "insensitive" } } },
        ],
      },
    ],
  };
}
