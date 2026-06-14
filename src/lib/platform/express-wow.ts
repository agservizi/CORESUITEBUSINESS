import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getProviderInsights } from "@/lib/platform/express-analytics";
import { isOfferValid } from "@/lib/platform/express-admin";

export function generateReceiptToken() {
  return randomBytes(16).toString("hex");
}

export async function getExpressClientProfile(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      expressPortal: { select: { status: true } },
      expressSales: {
        take: 8,
        orderBy: { soldAt: "desc" },
        select: {
          id: true,
          total: true,
          soldAt: true,
          status: true,
          paymentMethod: true,
          lines: {
            select: {
              assignedNumber: true,
              iccidStock: { select: { iccid: true } },
              operator: { select: { name: true } },
            },
          },
        },
      },
      expressRequests: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, status: true, createdAt: true },
      },
    },
  });
  if (!client) return null;

  const allSales = await prisma.expressSale.count({ where: { clientId } });
  const spend = await prisma.expressSale.aggregate({
    where: { clientId, status: { not: "Annullata" } },
    _sum: { total: true },
  });

  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    morosityScore: client.morosityScore,
    morosityFlag: client.morosityFlag,
    portalActive: client.expressPortal?.status === "active",
    stats: {
      totalSales: allSales,
      lifetimeSpend: Number(spend._sum.total ?? 0),
    },
  };
}

export async function lookupExpressClient(query: string) {
  const q = query.trim();
  if (!q || q.length < 2) return null;

  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { phone: { contains: q, mode: "insensitive" } },
        { taxCode: { equals: q, mode: "insensitive" } },
        { vatNumber: { equals: q, mode: "insensitive" } },
        { email: { equals: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
      ],
    },
    include: {
      expressPortal: { select: { status: true } },
      expressSales: {
        take: 8,
        orderBy: { soldAt: "desc" },
        select: {
          id: true,
          total: true,
          soldAt: true,
          status: true,
          paymentMethod: true,
          lines: {
            select: {
              description: true,
              assignedNumber: true,
              iccidStock: { select: { iccid: true } },
              operator: { select: { name: true } },
            },
          },
        },
      },
      expressRequests: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, status: true, createdAt: true },
      },
    },
  });

  if (!client) return null;

  const simNumbers = client.expressSales.flatMap((s) =>
    s.lines
      .filter((l) => l.assignedNumber || l.iccidStock?.iccid)
      .map((l) => ({
        number: l.assignedNumber,
        iccid: l.iccidStock?.iccid,
        operator: l.operator?.name,
        saleDate: s.soldAt,
      }))
  );

  return {
    id: client.id,
    name: client.name,
    companyName: client.companyName,
    email: client.email,
    phone: client.phone,
    morosityScore: client.morosityScore,
    morosityFlag: client.morosityFlag,
    morosityNote: client.morosityNote,
    portalActive: client.expressPortal?.status === "active",
    recentSales: client.expressSales.map((s) => ({
      id: s.id,
      total: Number(s.total),
      soldAt: s.soldAt.toISOString(),
      status: s.status,
      paymentMethod: s.paymentMethod,
      lineCount: s.lines.length,
    })),
    simHistory: simNumbers.slice(0, 10),
    recentRequests: client.expressRequests.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
    stats: {
      totalSales: client.expressSales.length,
      lifetimeSpend: client.expressSales.reduce((sum, s) => sum + Number(s.total), 0),
    },
  };
}

export async function getClientTimeline(clientId: string) {
  const [sales, requests] = await Promise.all([
    prisma.expressSale.findMany({
      where: { clientId },
      orderBy: { soldAt: "desc" },
      take: 30,
      include: {
        user: { select: { name: true } },
        lines: { select: { description: true, lineTotal: true } },
      },
    }),
    prisma.expressRequest.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { handledBy: { select: { name: true } } },
    }),
  ]);

  const events: {
    id: string;
    type: "sale" | "request";
    title: string;
    subtitle?: string;
    amount?: number;
    status: string;
    at: string;
    actor?: string | null;
  }[] = [];

  for (const s of sales) {
    events.push({
      id: s.id,
      type: "sale",
      title: `Vendita · ${s.lines.map((l) => l.description).join(", ").slice(0, 80)}`,
      amount: Number(s.total),
      status: s.status,
      at: s.soldAt.toISOString(),
      actor: s.user?.name,
    });
  }
  for (const r of requests) {
    events.push({
      id: r.id,
      type: "request",
      title: r.title,
      status: r.status,
      at: r.createdAt.toISOString(),
      actor: r.handledBy?.name,
    });
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export async function getCartSuggestions(input: {
  clientId?: string;
  cart: { lineType: string; offerId?: string; productId?: string; operatorId?: string }[];
}) {
  const suggestions: {
    id: string;
    kind: "offer" | "product" | "sim";
    title: string;
    reason: string;
    price: number;
    offerId?: string;
    productId?: string;
    operatorId?: string;
  }[] = [];

  const hasSim = input.cart.some((l) => l.lineType === "sim");
  const hasOffer = input.cart.some((l) => l.offerId);
  const cartOfferIds = new Set(input.cart.map((l) => l.offerId).filter(Boolean));
  const cartProductIds = new Set(input.cart.map((l) => l.productId).filter(Boolean));

  const [offers, products, settings] = await Promise.all([
    prisma.expressOffer.findMany({
      where: { status: "Active" },
      include: { operator: { select: { id: true, name: true } } },
    }),
    prisma.expressProduct.findMany({ where: { active: true, stockQty: { gt: 0 } } }),
    prisma.expressSettings.findUnique({ where: { id: "default" } }),
  ]);

  const simPrice = Number((settings?.data as Record<string, unknown>)?.sim_price_default ?? 9.99);

  if (hasSim && !hasOffer) {
    const topOffer = offers.filter((o) => isOfferValid(o)).sort((a, b) => Number(b.price) - Number(a.price))[0];
    if (topOffer && !cartOfferIds.has(topOffer.id)) {
      suggestions.push({
        id: `offer-${topOffer.id}`,
        kind: "offer",
        title: topOffer.title,
        reason: "Hai una SIM nel carrello — aggiungi un'offerta operatore",
        price: Number(topOffer.price),
        offerId: topOffer.id,
        operatorId: topOffer.operatorId ?? undefined,
      });
    }
  }

  if (!hasSim) {
    suggestions.push({
      id: "sim-default",
      kind: "sim",
      title: "SIM telefonica",
      reason: "Nessuna SIM nel carrello — scansiona ICCID o seleziona dallo stock",
      price: simPrice,
    });
  }

  for (const o of offers.filter((o) => isOfferValid(o)).slice(0, 20)) {
    if (cartOfferIds.has(o.id)) continue;
    if (input.clientId) {
      suggestions.push({
        id: `offer-upsell-${o.id}`,
        kind: "offer",
        title: o.title,
        reason: `Offerta ${o.operator?.name || "operatore"} — upsell consigliato`,
        price: Number(o.price),
        offerId: o.id,
        operatorId: o.operatorId ?? undefined,
      });
      if (suggestions.length >= 6) break;
    }
  }

  for (const p of products.slice(0, 5)) {
    if (cartProductIds.has(p.id)) continue;
    if (p.stockQty > 0 && p.reorderThreshold >= 0) {
      suggestions.push({
        id: `product-${p.id}`,
        kind: "product",
        title: p.name,
        reason: "Accessorio/prodotto disponibile a magazzino",
        price: Number(p.price),
        productId: p.id,
      });
    }
  }

  return suggestions.slice(0, 8);
}

export async function computeCartMargin(
  lines: { lineType: string; unitPrice: number; quantity?: number; lineDiscount?: number; offerId?: string; productId?: string }[]
) {
  let revenue = 0;
  let cost = 0;
  const details: { description: string; revenue: number; cost: number; margin: number; marginPct: number }[] = [];

  for (const line of lines) {
    const qty = line.quantity ?? 1;
    const net = line.unitPrice * qty - (line.lineDiscount ?? 0);
    revenue += net;

    let lineCost = 0;
    if (line.productId) {
      const p = await prisma.expressProduct.findUnique({ where: { id: line.productId }, select: { cost: true, name: true } });
      lineCost = Number(p?.cost ?? 0) * qty;
    } else if (line.offerId) {
      const o = await prisma.expressOffer.findUnique({ where: { id: line.offerId }, select: { cost: true, title: true } });
      lineCost = Number(o?.cost ?? 0) * qty;
    } else if (line.lineType === "sim") {
      lineCost = net * 0.3;
    }

    cost += lineCost;
    const margin = net - lineCost;
    details.push({
      description: line.lineType,
      revenue: net,
      cost: lineCost,
      margin,
      marginPct: net > 0 ? (margin / net) * 100 : 0,
    });
  }

  const margin = revenue - cost;
  return {
    revenue,
    cost,
    margin,
    marginPct: revenue > 0 ? (margin / revenue) * 100 : 0,
    details,
  };
}

export async function getOfferComparison() {
  const offers = await prisma.expressOffer.findMany({
    where: { status: "Active" },
    include: { operator: { select: { id: true, name: true } } },
    orderBy: { price: "asc" },
  });

  const valid = offers.filter((o) => isOfferValid(o));
  const byOperator = new Map<string, typeof valid>();

  for (const o of valid) {
    const key = o.operator?.name || "Generico";
    if (!byOperator.has(key)) byOperator.set(key, []);
    byOperator.get(key)!.push(o);
  }

  return {
    operators: [...byOperator.entries()].map(([name, list]) => ({
      name,
      offers: list.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        price: Number(o.price),
        cost: Number(o.cost),
        margin: Number(o.price) - Number(o.cost),
        validFrom: o.validFrom?.toISOString() ?? null,
        validTo: o.validTo?.toISOString() ?? null,
      })),
      minPrice: Math.min(...list.map((o) => Number(o.price))),
      maxPrice: Math.max(...list.map((o) => Number(o.price))),
    })),
    all: valid.map((o) => ({
      id: o.id,
      title: o.title,
      operator: o.operator?.name,
      price: Number(o.price),
      cost: Number(o.cost),
    })),
  };
}

export async function getStaffLeaderboard(period: "day" | "month" = "day") {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "month") start.setDate(1);

  const sales = await prisma.expressSale.findMany({
    where: { soldAt: { gte: start }, status: { not: "Annullata" }, userId: { not: null } },
    select: { userId: true, total: true, user: { select: { id: true, name: true, email: true } } },
  });

  const map = new Map<string, { userId: string; name: string; count: number; revenue: number }>();
  for (const s of sales) {
    if (!s.userId || !s.user) continue;
    const row = map.get(s.userId) ?? {
      userId: s.userId,
      name: s.user.name || s.user.email,
      count: 0,
      revenue: 0,
    };
    row.count++;
    row.revenue += Number(s.total);
    map.set(s.userId, row);
  }

  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export async function getPredictiveReorderActions() {
  const insights = await getProviderInsights();
  const products = await prisma.expressProduct.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return {
    operators: insights
      .filter((i) => i.belowThreshold || (i.daysCover !== null && i.daysCover < 14))
      .map((i) => ({
        id: i.id,
        name: i.name,
        currentStock: i.currentStock,
        threshold: i.threshold,
        suggestedReorder: i.suggestedReorder,
        daysCover: i.daysCover,
        riskLevel: i.riskLevel,
      })),
    products: products
      .filter((p) => p.reorderThreshold > 0 && p.stockQty <= p.reorderThreshold)
      .map((p) => ({
        id: p.id,
        name: p.name,
        stockQty: p.stockQty,
        threshold: p.reorderThreshold,
        suggestedReorder: Math.max(p.reorderThreshold * 2 - p.stockQty, 1),
      })),
  };
}

export async function getRequestPrefill(requestId: string) {
  const req = await prisma.expressRequest.findUnique({
    where: { id: requestId },
    include: {
      client: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, price: true } },
    },
  });
  if (!req) return null;

  const lines: {
    lineType: string;
    description: string;
    unitPrice: number;
    quantity: number;
    productId?: string;
  }[] = [];

  if (req.product) {
    lines.push({
      lineType: "prodotto",
      description: req.product.name,
      unitPrice: Number(req.product.price),
      quantity: 1,
      productId: req.product.id,
    });
  } else {
    lines.push({
      lineType: "servizio",
      description: req.title,
      unitPrice: Number(req.depositAmount ?? 0),
      quantity: 1,
    });
  }

  return {
    requestId: req.id,
    clientId: req.clientId,
    clientName: req.client.name,
    paymentMethod: req.paymentMethod || "Contanti",
    notes: req.internalNotes || req.clientNotes || undefined,
    lines,
  };
}

export async function notifyExpressRequest(requestId: string, clientName: string, title: string) {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN", "OPERATORE"] } },
    select: { id: true },
    take: 50,
  });

  await prisma.notification.createMany({
    data: staff.map((u) => ({
      userId: u.id,
      title: "Nuova richiesta Express",
      body: `${clientName}: ${title}`,
      type: "express_request",
      link: `/services/express?view=richieste&prefill=${requestId}`,
    })),
  });
}

export async function getPublicReceipt(saleId: string, token: string) {
  const sale = await prisma.expressSale.findFirst({
    where: { id: saleId, receiptToken: token },
    include: {
      client: { select: { name: true } },
      lines: {
        include: {
          iccidStock: { select: { iccid: true, assignedNumber: true } },
          operator: { select: { name: true } },
        },
      },
    },
  });
  if (!sale) return null;

  return {
    id: sale.id,
    receiptNumber: sale.receiptNumber ?? sale.mysqlId,
    soldAt: sale.soldAt.toISOString(),
    total: Number(sale.total),
    discount: Number(sale.discount),
    paymentMethod: sale.paymentMethod,
    status: sale.status,
    clientName: sale.client?.name,
    lines: sale.lines.map((l) => ({
      description: l.description,
      lineTotal: Number(l.lineTotal),
      vatRate: Number(l.vatRate),
      assignedNumber: l.assignedNumber || l.iccidStock?.assignedNumber,
      iccid: l.iccidStock?.iccid,
    })),
  };
}
