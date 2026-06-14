import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { getProviderInsights } from "@/lib/platform/express-analytics";
import { computeCampaignDiscount } from "@/lib/platform/express-discount";

export { computeCampaignDiscount };

export async function getExpressSettingsRecord() {
  const settings = await prisma.expressSettings.findUnique({ where: { id: "default" } });
  const data = (settings?.data ?? {}) as Record<string, unknown>;
  return {
    ...data,
    default_vat: Number(data.default_vat ?? 22),
    sim_vat: Number(data.sim_vat ?? 0),
    payment_methods: (data.payment_methods as string[]) ?? ["Contanti", "Carta", "POS"],
    default_payment_method: (data.default_payment_method as string) ?? "Contanti",
    sim_price_default: Number(data.sim_price_default ?? 9.99),
    stock_alert_threshold: Number(data.stock_alert_threshold ?? 10),
    tax_note: String(data.tax_note ?? "Operazione non soggetta a IVA ai sensi dell'art. 74 DPR 633/72"),
    allow_negative_margin: Boolean(data.allow_negative_margin ?? false),
    notify_on_sale: Boolean(data.notify_on_sale ?? true),
    loyalty_on_sale: Boolean(data.loyalty_on_sale ?? true),
    loyalty_points_per_sim: Number(data.loyalty_points_per_sim ?? 10),
    loyalty_points_per_euro: Number(data.loyalty_points_per_euro ?? 0),
    ticket_on_sim_sale: Boolean(data.ticket_on_sim_sale ?? true),
    notify_staff_on_sale: Boolean(data.notify_staff_on_sale ?? true),
    receipt_counter: Number(data.receipt_counter ?? 1),
    fiscal_rt_enabled: Boolean(data.fiscal_rt_enabled ?? false),
    store_name: String(data.store_name ?? "AG SERVIZI VIA PLINIO 72 DI CAVALIERE CARMINE"),
    store_address: String(data.store_address ?? "Via Plinio 72"),
    store_city: String(data.store_city ?? ""),
    store_vat: String(data.store_vat ?? ""),
    store_phone: String(data.store_phone ?? ""),
    store_email: String(data.store_email ?? ""),
    receipt_footer: String(data.receipt_footer ?? "Grazie per aver scelto i nostri servizi"),
    store_logo: typeof data.store_logo === "string" ? data.store_logo : "",
  };
}

export async function updateExpressSettings(patch: Record<string, unknown>) {
  const current = await prisma.expressSettings.findUnique({ where: { id: "default" } });
  const merged = { ...((current?.data ?? {}) as Record<string, unknown>), ...patch };
  const jsonData = merged as Prisma.InputJsonValue;
  return prisma.expressSettings.upsert({
    where: { id: "default" },
    create: { id: "default", data: jsonData },
    update: { data: jsonData },
  });
}

export function isOfferValid(
  offer: { status: string; validFrom?: Date | null; validTo?: Date | null },
  now = new Date()
) {
  if (offer.status !== "Active") return false;
  if (offer.validFrom && offer.validFrom > now) return false;
  if (offer.validTo && offer.validTo < now) return false;
  return true;
}

export async function listActiveDiscountCampaigns() {
  const now = new Date();
  const campaigns = await prisma.expressDiscountCampaign.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return campaigns.filter((c) => {
    if (c.startsAt && c.startsAt > now) return false;
    if (c.endsAt && c.endsAt < now) return false;
    return true;
  });
}

export async function getCampaignPerformance() {
  const campaigns = await prisma.expressDiscountCampaign.findMany({ orderBy: { name: "asc" } });
  const results = [];
  for (const c of campaigns) {
    const agg = await prisma.expressSale.aggregate({
      where: { discountCampaignId: c.id, status: { not: "Annullata" } },
      _count: true,
      _sum: { total: true, discount: true },
    });
    results.push({
      id: c.id,
      name: c.name,
      type: c.type,
      value: Number(c.value),
      active: c.active,
      salesCount: agg._count,
      revenue: Number(agg._sum.total ?? 0),
      discountGiven: Number(agg._sum.discount ?? 0),
    });
  }
  return results;
}

export async function listDiscountCampaigns() {
  return prisma.expressDiscountCampaign.findMany({ orderBy: { name: "asc" } });
}

export async function upsertDiscountCampaign(input: {
  id?: string;
  name: string;
  description?: string;
  type: string;
  value: number;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}) {
  const data = {
    name: input.name,
    description: input.description,
    type: input.type,
    value: input.value,
    active: input.active ?? true,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
  };
  if (input.id) {
    return prisma.expressDiscountCampaign.update({ where: { id: input.id }, data });
  }
  return prisma.expressDiscountCampaign.create({ data });
}

export async function createExpressOffer(input: {
  operatorId?: string;
  title: string;
  description?: string;
  price: number;
  cost?: number;
  status?: string;
  validFrom?: string | null;
  validTo?: string | null;
}) {
  return prisma.expressOffer.create({
    data: {
      operatorId: input.operatorId || null,
      title: input.title,
      description: input.description,
      price: input.price,
      cost: input.cost ?? 0,
      status: input.status ?? "Active",
      validFrom: input.validFrom ? new Date(input.validFrom) : null,
      validTo: input.validTo ? new Date(input.validTo) : null,
    },
    include: { operator: { select: { id: true, name: true } } },
  });
}

export async function updateExpressOffer(
  id: string,
  input: Partial<{
    operatorId: string | null;
    title: string;
    description: string;
    price: number;
    cost?: number;
    status: string;
    validFrom: string | null;
    validTo: string | null;
  }>
) {
  return prisma.expressOffer.update({
    where: { id },
    data: {
      ...input,
      validFrom: input.validFrom === undefined ? undefined : input.validFrom ? new Date(input.validFrom) : null,
      validTo: input.validTo === undefined ? undefined : input.validTo ? new Date(input.validTo) : null,
    },
    include: { operator: { select: { id: true, name: true } } },
  });
}

export async function createExpressProduct(input: {
  name: string;
  sku?: string;
  imei?: string;
  category?: string;
  price: number;
  cost?: number;
  vatRate?: number;
  stockQty?: number;
  reorderThreshold?: number;
  notes?: string;
  active?: boolean;
}) {
  return prisma.expressProduct.create({ data: input });
}

export async function updateExpressProduct(
  id: string,
  input: Partial<{
    name: string;
    sku: string | null;
    imei: string | null;
    category: string | null;
    price: number;
    cost: number;
    vatRate: number;
    stockQty: number;
    reorderThreshold: number;
    notes: string | null;
    active: boolean;
  }>
) {
  return prisma.expressProduct.update({ where: { id }, data: input });
}

export async function restockExpressProduct(id: string, qty: number) {
  if (qty <= 0) throw new Error("Quantità non valida");
  return prisma.expressProduct.update({
    where: { id },
    data: { stockQty: { increment: qty } },
  });
}

export async function listExpressSalesFiltered(filters: {
  status?: string;
  paymentMethod?: string;
  operatorId?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
  page?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
  if (filters.from || filters.to) {
    where.soldAt = {};
    if (filters.from) (where.soldAt as Record<string, Date>).gte = new Date(filters.from);
    if (filters.to) {
      const to = new Date(filters.to);
      to.setHours(23, 59, 59, 999);
      (where.soldAt as Record<string, Date>).lte = to;
    }
  }
  if (filters.operatorId) {
    where.lines = { some: { operatorId: filters.operatorId } };
  }
  if (filters.search?.trim()) {
    where.OR = [
      { client: { name: { contains: filters.search.trim(), mode: "insensitive" } } },
      { paymentMethod: { contains: filters.search.trim(), mode: "insensitive" } },
      { notes: { contains: filters.search.trim(), mode: "insensitive" } },
    ];
  }

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(500, filters.limit ?? 50);
  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.expressSale.count({ where }),
    prisma.expressSale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { soldAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        discountCampaign: { select: { id: true, name: true } },
        lines: {
          include: {
            operator: { select: { id: true, name: true } },
            offer: { select: { id: true, title: true } },
            iccidStock: { select: { id: true, iccid: true } },
            product: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  return {
    items: items.map((s) => ({
      ...s,
      total: Number(s.total),
      discount: Number(s.discount),
      soldAt: s.soldAt.toISOString(),
      lines: s.lines.map((l) => ({
        ...l,
        unitPrice: Number(l.unitPrice),
        lineTotal: Number(l.lineTotal),
        lineDiscount: Number(l.lineDiscount),
        vatRate: Number(l.vatRate),
      })),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function refundExpressSaleLines(
  saleId: string,
  refunds: { lineId: string; quantity: number }[]
) {
  if (!refunds.length) throw new Error("Nessuna riga da rimborsare");

  return prisma.$transaction(async (tx) => {
    const sale = await tx.expressSale.findUnique({
      where: { id: saleId },
      include: { lines: true, cashMovement: true },
    });
    if (!sale) throw new Error("Vendita non trovata");
    if (sale.status === "Annullata") throw new Error("Vendita già annullata");

    let refundTotal = 0;

    for (const r of refunds) {
      const line = sale.lines.find((l) => l.id === r.lineId);
      if (!line) throw new Error("Riga non trovata");
      const qty = Math.max(1, r.quantity);
      const maxReturn = line.quantity - line.returnedQty;
      if (qty > maxReturn) throw new Error(`Quantità reso eccessiva per ${line.description}`);

      const unitNet = Number(line.lineTotal) / Math.max(line.quantity, 1);
      refundTotal += unitNet * qty;

      await tx.expressSaleLine.update({
        where: { id: line.id },
        data: { returnedQty: { increment: qty } },
      });

      if (line.iccidStockId && qty >= 1) {
        await tx.expressIccidStock.update({
          where: { id: line.iccidStockId },
          data: { status: "InStock", saleId: null },
        });
      }
      if (line.productId) {
        await tx.expressProduct.update({
          where: { id: line.productId },
          data: { stockQty: { increment: qty } },
        });
      }
    }

    const allReturned = sale.lines.every((l) => {
      const refund = refunds.find((r) => r.lineId === l.id);
      const added = refund?.quantity ?? 0;
      return l.returnedQty + added >= l.quantity;
    });

    const newStatus = allReturned ? "Rimborsata" : "Parzialmente rimborsata";
    const newTotal = Math.max(0, Number(sale.total) - refundTotal);

    if (sale.cashMovementId) {
      await tx.cashMovement.update({
        where: { id: sale.cashMovementId },
        data: {
          amount: newTotal,
          unitPrice: newTotal,
          status: allReturned ? "Annullato" : "Pagato",
          notes: `Rimborso parziale €${refundTotal.toFixed(2)}`,
        },
      });
    }

    await tx.cashMovement.create({
      data: {
        clientId: sale.clientId,
        type: "USCITA",
        description: `Rimborso Express #${sale.mysqlId ?? sale.id.slice(-6)}`,
        amount: refundTotal,
        quantity: 1,
        unitPrice: refundTotal,
        method: sale.paymentMethod,
        status: "Pagato",
        paidAt: new Date(),
      },
    });

    return tx.expressSale.update({
      where: { id: saleId },
      data: { status: newStatus, total: newTotal },
      include: { client: true, lines: true, cashMovement: true },
    });
  });
}

export async function listExpressRequests(status?: string) {
  return prisma.expressRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      product: { select: { id: true, name: true, price: true } },
      handledBy: { select: { id: true, name: true } },
    },
  });
}

export async function upsertExpressRequest(input: {
  id?: string;
  clientId: string;
  productId?: string;
  title: string;
  requestType?: string;
  status?: string;
  depositAmount?: number;
  installments?: number;
  paymentMethod?: string;
  desiredDate?: string | null;
  clientNotes?: string;
  internalNotes?: string;
  handledById?: string;
}) {
  const data = {
    clientId: input.clientId,
    productId: input.productId || null,
    title: input.title,
    requestType: input.requestType ?? "Purchase",
    status: input.status ?? "Pending",
    depositAmount: input.depositAmount,
    installments: input.installments,
    paymentMethod: input.paymentMethod,
    desiredDate: input.desiredDate ? new Date(input.desiredDate) : null,
    clientNotes: input.clientNotes,
    internalNotes: input.internalNotes,
    handledById: input.handledById,
    handledAt: input.handledById ? new Date() : undefined,
  };
  if (input.id) {
    return prisma.expressRequest.update({ where: { id: input.id }, data });
  }
  return prisma.expressRequest.create({ data });
}

export async function listPortalClients() {
  return prisma.expressPortalClient.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
}

export async function linkPortalClient(clientId: string, pickupMysqlId?: number) {
  return prisma.expressPortalClient.upsert({
    where: { clientId },
    create: { clientId, pickupMysqlId, status: "active" },
    update: { pickupMysqlId, status: "active" },
    include: { client: { select: { id: true, name: true, email: true } } },
  });
}

export async function updatePortalClientStatus(id: string, status: string) {
  return prisma.expressPortalClient.update({ where: { id }, data: { status } });
}

export async function createPdaImport(payload: Record<string, unknown>, userId: string, reference?: string) {
  return prisma.expressPdaImport.create({
    data: { payload: payload as Prisma.InputJsonValue, createdById: userId, reference, status: "Pending" },
  });
}

export async function listPdaImports(limit = 20) {
  return prisma.expressPdaImport.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}

export async function getPdaPrefill(id: string) {
  const row = await prisma.expressPdaImport.findUnique({ where: { id } });
  if (!row) return null;
  const payload = row.payload as Record<string, unknown>;
  const lines = (payload.lines as Array<Record<string, unknown>>) ?? [];
  return {
    id: row.id,
    reference: row.reference,
    clientName: payload.clientName as string | undefined,
    paymentMethod: (payload.paymentMethod as string) ?? "Contanti",
    lines: lines.map((l) => ({
      lineType: String(l.lineType ?? l.type ?? "servizio"),
      description: String(l.description ?? ""),
      unitPrice: Number(l.unitPrice ?? l.price ?? 0),
      quantity: Number(l.quantity ?? 1),
    })),
  };
}

export async function syncStockAlerts() {
  const insights = await getProviderInsights();
  const products = await prisma.expressProduct.findMany({ where: { active: true } });
  let created = 0;
  let resolved = 0;

  for (const op of insights) {
    if (op.belowThreshold) {
      const existing = await prisma.expressStockAlert.findFirst({
        where: { operatorId: op.id, status: "Open" },
      });
      const message = `Stock ${op.name}: ${op.currentStock} SIM (soglia ${op.threshold})`;
      if (existing) {
        await prisma.expressStockAlert.update({ where: { id: existing.id }, data: { message } });
      } else {
        await prisma.expressStockAlert.create({
          data: { operatorId: op.id, message, status: "Open" },
        });
        created++;
      }
    } else {
      const r = await prisma.expressStockAlert.updateMany({
        where: { operatorId: op.id, status: "Open" },
        data: { status: "Resolved", resolvedAt: new Date() },
      });
      resolved += r.count;
    }
  }

  for (const p of products) {
    if (p.stockQty <= p.reorderThreshold && p.reorderThreshold > 0) {
      const existing = await prisma.expressStockAlert.findFirst({
        where: { productId: p.id, status: "Open" },
      });
      const message = `Prodotto ${p.name}: ${p.stockQty} pz (soglia ${p.reorderThreshold})`;
      if (!existing) {
        await prisma.expressStockAlert.create({
          data: { productId: p.id, message, status: "Open" },
        });
        created++;
      }
    }
  }

  return { created, resolved };
}

export async function listOpenStockAlerts() {
  return prisma.expressStockAlert.findMany({
    where: { status: "Open" },
    orderBy: { createdAt: "asc" },
    include: {
      operator: { select: { id: true, name: true } },
      product: { select: { id: true, name: true } },
    },
  });
}

export async function getProductInsights() {
  const products = await prisma.expressProduct.findMany({ where: { active: true } });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    currentStock: p.stockQty,
    threshold: p.reorderThreshold,
    belowThreshold: p.reorderThreshold > 0 && p.stockQty <= p.reorderThreshold,
    price: Number(p.price),
  }));
}

export async function notifyExpressSale(userId: string, saleId: string, total: number) {
  const settings = await getExpressSettingsRecord();
  if (!settings.notify_on_sale) return;
  await prisma.notification.create({
    data: {
      userId,
      title: "Vendita Express registrata",
      body: `Nuova vendita #${saleId.slice(-6)} · €${total.toFixed(2)}`,
      type: "express_sale",
      link: `/services/express?view=vendite&id=${saleId}`,
    },
  });
}

export async function seedDefaultCampaignsIfEmpty() {
  const count = await prisma.expressDiscountCampaign.count();
  if (count > 0) return;
  await prisma.expressDiscountCampaign.createMany({
    data: [
      { name: "Benvenuto 5€", description: "Sconto fisso nuovi clienti", type: "Fixed", value: 5, active: true },
      { name: "Promo 10%", description: "Sconto percentuale", type: "Percent", value: 10, active: true },
    ],
  });
}

export async function createExpressOperator(input: { name: string; reorderThreshold?: number }) {
  const name = input.name.trim();
  if (!name) throw new Error("Nome operatore richiesto");
  return prisma.expressOperator.create({
    data: { name, reorderThreshold: input.reorderThreshold ?? 10 },
  });
}

export async function updateExpressOperator(
  id: string,
  input: Partial<{ name: string; reorderThreshold: number; active: boolean }>
) {
  return prisma.expressOperator.update({ where: { id }, data: input });
}

export async function deleteExpressOffer(id: string) {
  const used = await prisma.expressSaleLine.count({ where: { offerId: id } });
  if (used > 0) {
    return prisma.expressOffer.update({ where: { id }, data: { status: "Archived" } });
  }
  return prisma.expressOffer.delete({ where: { id } });
}

export async function deleteExpressProduct(id: string) {
  const used = await prisma.expressSaleLine.count({ where: { productId: id } });
  if (used > 0) {
    return prisma.expressProduct.update({ where: { id }, data: { active: false } });
  }
  return prisma.expressProduct.delete({ where: { id } });
}

export async function deleteDiscountCampaign(id: string) {
  const used = await prisma.expressSale.count({ where: { discountCampaignId: id } });
  if (used > 0) {
    return prisma.expressDiscountCampaign.update({ where: { id }, data: { active: false } });
  }
  return prisma.expressDiscountCampaign.delete({ where: { id } });
}

export async function completePdaImport(pdaImportId: string, saleId: string) {
  return prisma.expressPdaImport.update({
    where: { id: pdaImportId },
    data: { saleId, status: "Processed" },
  });
}

export async function unlinkPortalClient(id: string) {
  return prisma.expressPortalClient.delete({ where: { id } });
}

export async function updatePortalClientPickup(id: string, pickupMysqlId: number | null) {
  return prisma.expressPortalClient.update({
    where: { id },
    data: { pickupMysqlId },
  });
}

export async function convertRequestToSale(
  requestId: string,
  userId: string,
  lines?: Array<{
    lineType: string;
    description: string;
    unitPrice: number;
    quantity?: number;
    productId?: string;
    offerId?: string;
    operatorId?: string;
  }>
) {
  const request = await prisma.expressRequest.findUnique({
    where: { id: requestId },
    include: { product: true, client: true },
  });
  if (!request) throw new Error("Richiesta non trovata");
  if (request.status === "Completed") throw new Error("Richiesta già completata");

  const saleLines =
    lines && lines.length > 0
      ? lines
      : [
          {
            lineType: request.productId ? "prodotto" : "servizio",
            description: request.title,
            unitPrice: request.product ? Number(request.product.price) : Number(request.depositAmount ?? 0),
            quantity: 1,
            productId: request.productId ?? undefined,
          },
        ];

  const { createExpressSale } = await import("@/lib/platform/express-service");
  const { sale } = await createExpressSale({
    clientId: request.clientId,
    userId,
    paymentMethod: request.paymentMethod || "Contanti",
    notes: request.internalNotes || request.clientNotes || undefined,
    lines: saleLines,
  });

  await prisma.expressRequest.update({
    where: { id: requestId },
    data: {
      status: "Completed",
      handledById: userId,
      handledAt: new Date(),
    },
  });

  return sale;
}

export async function exportSalesCsv(filters: {
  status?: string;
  from?: string;
  to?: string;
  search?: string;
}) {
  const { items } = await listExpressSalesFiltered({ ...filters, limit: 5000, page: 1 });
  const header = "ID,Data,Cliente,Stato,Pagamento,Totale,Sconto,Righe\n";
  const rows = items
    .map((s) => {
      const date = new Date(s.soldAt).toLocaleString("it-IT");
      const client = s.client?.name?.replace(/"/g, '""') ?? "";
      return [
        s.mysqlId ?? s.id.slice(-8),
        date,
        `"${client}"`,
        s.status,
        s.paymentMethod,
        Number(s.total).toFixed(2),
        Number(s.discount).toFixed(2),
        s.lines?.length ?? 0,
      ].join(",");
    })
    .join("\n");
  return header + rows;
}

export async function allocateReceiptNumber() {
  const settings = await getExpressSettingsRecord();
  const current = await prisma.expressSettings.findUnique({ where: { id: "default" } });
  const data = (current?.data ?? {}) as Record<string, unknown>;
  const next = Number(data.receipt_counter ?? 1);
  await updateExpressSettings({ receipt_counter: next + 1 });
  return next;
}
