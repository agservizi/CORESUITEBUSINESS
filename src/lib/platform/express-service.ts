import { prisma } from "@/lib/prisma";
import {
  buildNextSteps,
  getExpressMetrics,
  getOperatorActivity,
  getOperatorSalesBreakdown,
  getPaymentBreakdown,
  getProviderInsights,
  getSalesTrend7Days,
  type ExpressPeriod,
} from "@/lib/platform/express-analytics";
import {
  computeCampaignDiscount,
  getCampaignPerformance,
  getExpressSettingsRecord,
  getProductInsights,
  isOfferValid,
  listActiveDiscountCampaigns,
  listOpenStockAlerts,
  notifyExpressSale,
  syncStockAlerts,
} from "@/lib/platform/express-admin";
import {
  resolveExpressLineVatRate,
  saleHasTaxableLines,
} from "@/lib/platform/express-vat";
import { generateReceiptToken } from "@/lib/platform/express-wow";
import { formatRecentSaleLabel } from "@/lib/platform/express-format";
import {
  applyExpressSaleIntegrations,
  notifyExpressSaleIntegrations,
  parseExpressIntegrationSettings,
  type ExpressSaleIntegrations,
  type SaleIntegrationInput,
} from "@/lib/platform/express-integrations";

async function getExpressSettingsData() {
  return getExpressSettingsRecord();
}

export async function getExpressDashboard(period: ExpressPeriod = "day") {
  await syncStockAlerts();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    periodMetrics,
    salesToday,
    salesMonth,
    completedMonth,
    iccidInStock,
    offersActive,
    recentSales,
    providerInsights,
    salesTrend,
    operatorActivity,
    paymentBreakdown,
    operatorBreakdown,
    settings,
    campaignPerformance,
    stockAlerts,
    productInsights,
  ] = await Promise.all([
    getExpressMetrics(period),
    prisma.expressSale.count({
      where: { soldAt: { gte: startOfDay }, status: "Completata" },
    }),
    prisma.expressSale.aggregate({
      where: { soldAt: { gte: startOfMonth }, status: "Completata" },
      _sum: { total: true },
      _count: true,
    }),
    prisma.expressSale.count({
      where: { soldAt: { gte: startOfMonth }, status: "Completata" },
    }),
    prisma.expressIccidStock.count({ where: { status: "InStock" } }),
    prisma.expressOffer.count({ where: { status: "Active" } }),
    prisma.expressSale.findMany({
      take: 10,
      orderBy: { soldAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        lines: {
          select: { id: true, lineType: true, description: true },
          orderBy: { id: "asc" },
          take: 4,
        },
        _count: { select: { lines: true } },
      },
    }),
    getProviderInsights(),
    getSalesTrend7Days(),
    getOperatorActivity(15),
    getPaymentBreakdown(period),
    getOperatorSalesBreakdown(period),
    getExpressSettingsData(),
    getCampaignPerformance(),
    listOpenStockAlerts(),
    getProductInsights(),
  ]);

  const operatorAlerts = providerInsights
    .filter((op) => op.belowThreshold)
    .map((op) => ({
      id: op.id,
      name: op.name,
      inStock: op.currentStock,
      threshold: op.threshold,
      suggestedReorder: op.suggestedReorder,
    }));

  const nextSteps = await buildNextSteps(periodMetrics, providerInsights);

  return {
    period,
    kpis: {
      salesToday,
      revenueMonth: Number(salesMonth._sum.total ?? 0),
      salesMonthCount: completedMonth,
      iccidInStock,
      iccidTotal: periodMetrics.iccidTotal,
      iccidSold: periodMetrics.iccidSold,
      offersActive,
      operatorsCount: providerInsights.length,
      periodSales: periodMetrics.salesCount,
      periodRevenue: periodMetrics.revenueSum,
    },
    operatorAlerts,
    providerInsights,
    salesTrend,
    operatorActivity,
    paymentBreakdown,
    operatorBreakdown,
    nextSteps,
    campaignPerformance,
    stockAlerts,
    productInsights,
    recentSales: recentSales.map((s) => ({
      id: s.id,
      mysqlId: s.mysqlId,
      total: Number(s.total),
      discount: Number(s.discount ?? 0),
      status: s.status,
      paymentMethod: s.paymentMethod,
      soldAt: s.soldAt.toISOString(),
      client: s.client,
      _count: s._count,
      summary: formatRecentSaleLabel({
        client: s.client,
        lines: s.lines,
        _count: s._count,
      }),
      lines: s.lines.map((l) => ({
        id: l.id,
        lineType: l.lineType,
        description: l.description,
        unitPrice: 0,
        lineTotal: 0,
      })),
    })),
    settings,
  };
}

export async function getPosContext() {
  const [operators, allOffers, products, settings, campaigns] = await Promise.all([
    prisma.expressOperator.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        iccidStock: {
          where: { status: "InStock" },
          take: 200,
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.expressOffer.findMany({
      orderBy: { title: "asc" },
      include: { operator: { select: { id: true, name: true } } },
    }),
    prisma.expressProduct.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    getExpressSettingsData(),
    listActiveDiscountCampaigns().catch(() => []),
  ]);

  const offers = allOffers.filter((o) => isOfferValid(o));

  return {
    operators: operators.map((o) => ({
      id: o.id,
      name: o.name,
      iccidStock: o.iccidStock.map((s) => ({
        id: s.id,
        iccid: s.iccid,
        assignedNumber: s.assignedNumber,
      })),
    })),
    offers: offers.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      price: Number(o.price),
      status: o.status,
      operatorId: o.operatorId,
      operator: o.operator,
      validFrom: o.validFrom?.toISOString() ?? null,
      validTo: o.validTo?.toISOString() ?? null,
    })),
    allOffers: allOffers.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      price: Number(o.price),
      status: o.status,
      operatorId: o.operatorId,
      operator: o.operator,
    })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: Number(p.price),
      stockQty: p.stockQty,
      vatRate: Number(p.vatRate),
    })),
    settings,
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      value: Number(c.value),
      description: c.description,
    })),
    taxNote: settings.tax_note,
  };
}

interface SaleLineInput {
  lineType: string;
  description: string;
  unitPrice: number;
  quantity?: number;
  operatorId?: string;
  offerId?: string;
  productId?: string;
  iccidStockId?: string;
  vatRate?: number;
  lineDiscount?: number;
  vatCode?: string;
  assignedNumber?: string;
}

export async function createExpressSale(input: {
  clientId?: string;
  userId: string;
  paymentMethod: string;
  discount?: number;
  discountCampaignId?: string;
  notes?: string;
  pdaImportId?: string;
  lines: SaleLineInput[];
}): Promise<{ sale: Awaited<ReturnType<typeof prisma.expressSale.update>>; integrations: ExpressSaleIntegrations }> {
  if (!input.lines.length) {
    throw new Error("Almeno una riga vendita richiesta");
  }

  const { assertCashSessionOpenForMutation } = await import("@/lib/platform/cash-movement-utils");
  await assertCashSessionOpenForMutation();

  const settings = await getExpressSettingsData();

  if (input.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
      select: { morosityScore: true, name: true },
    });
    if (client?.morosityScore === "BLOCCATO") {
      throw new Error(`Cliente ${client.name} bloccato per morosità — vendita non consentita`);
    }
  }

  let subtotal = input.lines.reduce(
    (sum, l) => sum + l.unitPrice * (l.quantity ?? 1) - (l.lineDiscount ?? 0),
    0
  );

  let campaignDiscount = 0;
  if (input.discountCampaignId) {
    const campaign = await prisma.expressDiscountCampaign.findUnique({
      where: { id: input.discountCampaignId },
    });
    if (campaign) {
      campaignDiscount = computeCampaignDiscount(subtotal, campaign);
    }
  }

  const manualDiscount = input.discount ?? 0;
  const total = Math.max(0, subtotal - manualDiscount - campaignDiscount);
  const totalDiscount = manualDiscount + campaignDiscount;

  if (!settings.allow_negative_margin && total < 0) {
    throw new Error("Totale vendita negativo — sconti eccessivi");
  }
  if (!settings.allow_negative_margin) {
    for (const line of input.lines) {
      const net = line.unitPrice * (line.quantity ?? 1) - (line.lineDiscount ?? 0);
      if (net < 0) {
        throw new Error(`Margine negativo sulla riga "${line.description}" — vendita non consentita`);
      }
    }
  }

  const iccidIds = input.lines.map((l) => l.iccidStockId).filter(Boolean) as string[];
  if (new Set(iccidIds).size !== iccidIds.length) {
    throw new Error("ICCID duplicato nel carrello");
  }

  const resolvedLines = await Promise.all(
    input.lines.map(async (line) => {
      let productVatRate: number | undefined;
      if (line.productId) {
        const product = await prisma.expressProduct.findUnique({
          where: { id: line.productId },
          select: { vatRate: true },
        });
        productVatRate = product ? Number(product.vatRate) : undefined;
      }
      const vatRate = resolveExpressLineVatRate(line.lineType, {
        defaultVat: settings.default_vat,
        simVat: settings.sim_vat,
        productVatRate,
      });
      return { ...line, vatRate };
    })
  );

  const headerVatRate = saleHasTaxableLines(resolvedLines)
    ? Math.max(...resolvedLines.map((l) => l.vatRate))
    : 0;

  return prisma.$transaction(async (tx) => {
    const settingsRow = await tx.expressSettings.findUnique({ where: { id: "default" } });
    const settingsData = (settingsRow?.data ?? {}) as Record<string, unknown>;
    const integrationSettings = parseExpressIntegrationSettings(settingsData);
    const receiptNumber = Number(settingsData.receipt_counter ?? 1);
    await tx.expressSettings.upsert({
      where: { id: "default" },
      create: { id: "default", data: { receipt_counter: receiptNumber + 1 } },
      update: { data: { ...settingsData, receipt_counter: receiptNumber + 1 } },
    });

    const receiptToken = generateReceiptToken();

    const sale = await tx.expressSale.create({
      data: {
        clientId: input.clientId,
        userId: input.userId,
        total,
        discount: totalDiscount,
        discountCampaignId: input.discountCampaignId || null,
        paymentMethod: input.paymentMethod,
        status: "Completata",
        soldAt: new Date(),
        notes: input.notes,
        vatRate: headerVatRate,
        receiptNumber,
        receiptToken,
      },
    });

    const simLines: SaleIntegrationInput["simLines"] = [];

    for (const line of resolvedLines) {
      let assignedNumber: string | null = line.assignedNumber?.trim() || null;
      let iccidFromStock: string | null = null;

      if (line.iccidStockId) {
        const sim = await tx.expressIccidStock.findUnique({ where: { id: line.iccidStockId } });
        if (!sim || sim.status !== "InStock") {
          throw new Error(`ICCID non disponibile: ${line.description}`);
        }
        assignedNumber = assignedNumber || sim.assignedNumber || null;
        iccidFromStock = sim.iccid;
      }

      await tx.expressSaleLine.create({
        data: {
          saleId: sale.id,
          lineType: line.lineType,
          description: line.description,
          quantity: line.quantity ?? 1,
          unitPrice: line.unitPrice,
          vatRate: line.vatRate,
          lineTotal: line.unitPrice * (line.quantity ?? 1) - (line.lineDiscount ?? 0),
          lineDiscount: line.lineDiscount ?? 0,
          vatCode: line.vatCode,
          assignedNumber,
          operatorId: line.operatorId,
          offerId: line.offerId,
          productId: line.productId,
          iccidStockId: line.iccidStockId,
        },
      });

      if (line.iccidStockId) {
        await tx.expressIccidStock.update({
          where: { id: line.iccidStockId },
          data: {
            status: "Sold",
            saleId: sale.id,
            ...(assignedNumber ? { assignedNumber } : {}),
          },
        });
      }

      if (line.lineType === "sim" || line.iccidStockId) {
        let operatorName: string | null = null;
        if (line.operatorId) {
          const op = await tx.expressOperator.findUnique({
            where: { id: line.operatorId },
            select: { name: true },
          });
          operatorName = op?.name ?? null;
        }
        simLines.push({
          description: line.description,
          assignedNumber,
          iccid: iccidFromStock,
          operatorName,
        });
      }

      if (line.productId) {
        const product = await tx.expressProduct.findUnique({ where: { id: line.productId } });
        if (!product || product.stockQty <= 0) {
          throw new Error(`Prodotto esaurito: ${line.description}`);
        }
        await tx.expressProduct.update({
          where: { id: line.productId },
          data: { stockQty: { decrement: line.quantity ?? 1 } },
        });
      }
    }

    const cash = await tx.cashMovement.create({
      data: {
        clientId: input.clientId,
        type: "ENTRATA",
        description: `Vendita Express #${sale.mysqlId ?? sale.id.slice(-6)}`,
        amount: total,
        quantity: 1,
        unitPrice: total,
        method: input.paymentMethod,
        status: "Pagato",
        paidAt: new Date(),
      },
    });

    const updated = await tx.expressSale.update({
      where: { id: sale.id },
      data: { cashMovementId: cash.id },
      include: {
        client: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        discountCampaign: { select: { name: true } },
        lines: {
          include: {
            iccidStock: { select: { iccid: true, assignedNumber: true } },
            operator: { select: { name: true } },
          },
        },
        cashMovement: true,
      },
    });

    await notifyExpressSale(input.userId, sale.id, total);

    if (input.pdaImportId) {
      await tx.expressPdaImport.update({
        where: { id: input.pdaImportId },
        data: { saleId: sale.id, status: "Processed" },
      });
    }

    const client = input.clientId
      ? await tx.client.findUnique({
          where: { id: input.clientId },
          select: { name: true, email: true, phone: true },
        })
      : null;

    const integrations = await applyExpressSaleIntegrations(tx, integrationSettings, {
      saleId: sale.id,
      clientId: input.clientId,
      userId: input.userId,
      total,
      receiptLabel: `#${receiptNumber}`,
      simLines,
      client,
    });

    return { sale: updated, integrations, integrationSettings, receiptNumber };
  }).then(async ({ sale, integrations, integrationSettings, receiptNumber }) => {
    await notifyExpressSaleIntegrations(
      {
        saleId: sale.id,
        total: Number(sale.total),
        receiptLabel: `#${receiptNumber}`,
        loyaltyPoints: integrations.loyaltyPoints,
        ticketCode: integrations.ticketCode,
      },
      integrationSettings
    );
    return { sale, integrations };
  });
}

export async function cancelExpressSale(id: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.expressSale.findUnique({
      where: { id },
      include: { lines: true, cashMovement: true },
    });
    if (!sale) throw new Error("Vendita non trovata");
    if (sale.status === "Annullata") return sale;

    for (const line of sale.lines) {
      if (line.iccidStockId) {
        await tx.expressIccidStock.update({
          where: { id: line.iccidStockId },
          data: { status: "InStock", saleId: null },
        });
      }
      if (line.productId) {
        await tx.expressProduct.update({
          where: { id: line.productId },
          data: { stockQty: { increment: line.quantity ?? 1 } },
        });
      }
    }

    if (sale.cashMovementId) {
      await tx.cashMovement.update({
        where: { id: sale.cashMovementId },
        data: { status: "Annullato" },
      });
    }

    return tx.expressSale.update({
      where: { id },
      data: { status: "Annullata" },
      include: { client: true, lines: true },
    });
  });
}

export async function listExpressSales(limit = 100) {
  return prisma.expressSale.findMany({
    take: limit,
    orderBy: { soldAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      lines: {
        include: {
          operator: { select: { id: true, name: true } },
          offer: { select: { id: true, title: true } },
          iccidStock: { select: { id: true, iccid: true } },
        },
      },
    },
  });
}

export async function listExpressOffers() {
  return prisma.expressOffer.findMany({
    orderBy: [{ status: "asc" }, { title: "asc" }],
    include: { operator: { select: { id: true, name: true } } },
  });
}

export async function listExpressOperatorsWithStock() {
  return prisma.expressOperator.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          iccidStock: { where: { status: "InStock" } },
          offers: { where: { status: "Active" } },
        },
      },
      iccidStock: {
        where: { status: "InStock" },
        take: 50,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function listExpressProducts() {
  return prisma.expressProduct.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getExpressSale(id: string) {
  return prisma.expressSale.findUnique({
    where: { id },
    include: {
      client: true,
      user: { select: { id: true, name: true, email: true } },
      discountCampaign: { select: { name: true } },
      lines: {
        include: {
          operator: true,
          offer: true,
          product: true,
          iccidStock: true,
        },
      },
      cashMovement: true,
    },
  });
}

export async function lookupIccidByCode(iccid: string) {
  const normalized = iccid.trim();
  if (!normalized) return null;
  return prisma.expressIccidStock.findFirst({
    where: {
      iccid: { contains: normalized, mode: "insensitive" },
      status: "InStock",
    },
    include: { operator: { select: { id: true, name: true } } },
  });
}

export async function listIccidStock(params: {
  page?: number;
  perPage?: number;
  operatorId?: string;
  status?: string;
  search?: string;
}) {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(50, Math.max(5, params.perPage ?? 15));
  const where: Record<string, unknown> = {};
  if (params.operatorId) where.operatorId = params.operatorId;
  if (params.status) where.status = params.status;
  if (params.search?.trim()) {
    where.iccid = { contains: params.search.trim(), mode: "insensitive" };
  }

  const [items, total] = await Promise.all([
    prisma.expressIccidStock.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: "desc" },
      include: {
        operator: { select: { id: true, name: true } },
        sale: { select: { id: true, mysqlId: true } },
      },
    }),
    prisma.expressIccidStock.count({ where }),
  ]);

  return { items, total, page, perPage, pages: Math.ceil(total / perPage) };
}

export async function bulkImportIccid(input: {
  operatorId: string;
  iccids: string[];
}) {
  const operator = await prisma.expressOperator.findUnique({
    where: { id: input.operatorId },
  });
  if (!operator) throw new Error("Operatore non trovato");

  const unique = [...new Set(input.iccids.map((s) => s.trim()).filter(Boolean))];
  let created = 0;
  let skipped = 0;

  for (const raw of unique) {
    const parts = raw.split(/[,;\t|]/).map((s) => s.trim()).filter(Boolean);
    const iccid = parts[0];
    const assignedNumber = parts[1] || null;
    if (!iccid) continue;
    const exists = await prisma.expressIccidStock.findFirst({ where: { iccid } });
    if (exists) {
      skipped++;
      continue;
    }
    await prisma.expressIccidStock.create({
      data: {
        iccid,
        operatorId: input.operatorId,
        status: "InStock",
        assignedNumber,
      },
    });
    created++;
  }

  return { created, skipped, total: unique.length };
}

export async function updateIccidAssignedNumber(id: string, assignedNumber: string | null) {
  const normalized = assignedNumber?.trim() || null;
  return prisma.expressIccidStock.update({
    where: { id },
    data: { assignedNumber: normalized },
  });
}

export async function updateOperatorThreshold(operatorId: string, threshold: number) {
  if (threshold < 0) throw new Error("Soglia non valida");
  return prisma.expressOperator.update({
    where: { id: operatorId },
    data: { reorderThreshold: threshold },
  });
}

export async function getExpressReport(
  granularity: "daily" | "monthly" | "yearly" = "daily",
  range?: { from?: string; to?: string }
) {
  const periodMap: Record<string, ExpressPeriod> = {
    daily: "day",
    monthly: "month",
    yearly: "year",
  };
  const period = periodMap[granularity] ?? "day";

  let metrics;
  let payments;
  let operators;
  let trend;
  let label: string;

  if (range?.from || range?.to) {
    const from = range.from ? new Date(range.from) : new Date(0);
    const to = range.to ? new Date(range.to) : new Date();
    to.setHours(23, 59, 59, 999);

    const sales = await prisma.expressSale.findMany({
      where: { soldAt: { gte: from, lte: to }, status: "Completata" },
      select: { total: true, paymentMethod: true, lines: { select: { operatorId: true, lineTotal: true, operator: { select: { name: true } } } } },
    });

    metrics = {
      salesCount: sales.length,
      revenueSum: sales.reduce((s, r) => s + Number(r.total), 0),
      iccidAvailable: await prisma.expressIccidStock.count({ where: { status: "InStock" } }),
      period,
    };

    const payMap = new Map<string, { count: number; total: number }>();
    const opMap = new Map<string, { name: string; count: number; total: number }>();
    for (const sale of sales) {
      const pm = sale.paymentMethod;
      const p = payMap.get(pm) ?? { count: 0, total: 0 };
      p.count++;
      p.total += Number(sale.total);
      payMap.set(pm, p);
      for (const line of sale.lines) {
        if (!line.operator?.name) continue;
        const o = opMap.get(line.operator.name) ?? { name: line.operator.name, count: 0, total: 0 };
        o.count++;
        o.total += Number(line.lineTotal);
        opMap.set(line.operator.name, o);
      }
    }
    payments = [...payMap.entries()].map(([method, v]) => ({ method, count: v.count, total: v.total }));
    operators = [...opMap.values()].sort((a, b) => b.total - a.total);
    trend = await getSalesTrend7Days();
    label = `${from.toLocaleDateString("it-IT")} – ${to.toLocaleDateString("it-IT")}`;
  } else {
    metrics = await getExpressMetrics(period);
    [payments, operators, trend] = await Promise.all([
      getPaymentBreakdown(period),
      getOperatorSalesBreakdown(period),
      getSalesTrend7Days(),
    ]);
    const now = new Date();
    label = now.toLocaleDateString("it-IT");
    if (period === "month") {
      label = now.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
    } else if (period === "year") {
      label = String(now.getFullYear());
    }
  }

  const periodLabels: Record<string, string> = {
    daily: "giornaliero",
    monthly: "mensile",
    yearly: "annuale",
  };

  return {
    granularity,
    period: { label, mode: period },
    periodLabel: periodLabels[granularity] ?? granularity,
    totals: {
      sales: metrics.salesCount,
      revenue: metrics.revenueSum,
      iccidAvailable: metrics.iccidAvailable,
    },
    payments,
    operators,
    trend,
  };
}
