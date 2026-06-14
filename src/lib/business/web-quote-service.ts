import { prisma } from "@/lib/prisma";
import type { WebQuoteStatus } from "@/generated/prisma";
import type { WebQuoteInput } from "./web-quote-types";
import { computeQuoteTotals } from "./web-quote-utils";

async function generateQuoteNumber() {
  const year = new Date().getFullYear();
  const prefix = `PREV-${year}-`;
  const last = await prisma.webQuote.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const lastSeq = last?.number ? parseInt(last.number.replace(prefix, ""), 10) || 0 : 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

const quoteInclude = {
  client: {
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true,
      phone: true,
      vatNumber: true,
      address: true,
      city: true,
    },
  },
  author: { select: { id: true, name: true, email: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
};

function mapItems(items: WebQuoteInput["items"] = []) {
  return items
    .filter((item) => item.title?.trim())
    .map((item, index) => ({
      sortOrder: item.sortOrder ?? index,
      title: item.title.trim(),
      description: item.description?.trim() || undefined,
      category: item.category?.trim() || undefined,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      total: 0,
      isOptional: Boolean(item.isOptional),
      isPremium: Boolean(item.isPremium),
    }));
}

export async function listWebQuotes(params?: { status?: string; clientId?: string; q?: string }) {
  const where = {
    ...(params?.status && { status: params.status as WebQuoteStatus }),
    ...(params?.clientId && { clientId: params.clientId }),
    ...(params?.q && {
      OR: [
        { title: { contains: params.q, mode: "insensitive" as const } },
        { number: { contains: params.q, mode: "insensitive" as const } },
        { client: { name: { contains: params.q, mode: "insensitive" as const } } },
        { client: { companyName: { contains: params.q, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [quotes, statsRows] = await Promise.all([
    prisma.webQuote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.webQuote.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  return {
    quotes,
    stats: {
      total: quotes.length,
      pipelineValue: quotes
        .filter((q) => q.status === "DRAFT" || q.status === "SENT")
        .reduce((s, q) => s + q.total, 0),
      acceptedValue: quotes.filter((q) => q.status === "ACCEPTED").reduce((s, q) => s + q.total, 0),
      byStatus: Object.fromEntries(statsRows.map((s) => [s.status, s._count._all])),
    },
  };
}

export async function getWebQuote(id: string) {
  return prisma.webQuote.findUnique({ where: { id }, include: quoteInclude });
}

export async function createWebQuote(input: WebQuoteInput, authorId?: string) {
  const items = mapItems(input.items);
  const totals = computeQuoteTotals(items, input.discountPercent ?? 0, input.taxPercent ?? 22);
  const number = await generateQuoteNumber();

  return prisma.webQuote.create({
    data: {
      number,
      title: input.title.trim(),
      clientId: input.clientId,
      authorId,
      projectType: input.projectType || "website",
      validUntil: input.validUntil ? new Date(input.validUntil) : new Date(Date.now() + 30 * 86400000),
      introduction: input.introduction?.trim() || undefined,
      scopeNotes: input.scopeNotes?.trim() || undefined,
      terms: input.terms?.trim() || undefined,
      paymentPlan: input.paymentPlan?.trim() || undefined,
      discountPercent: input.discountPercent ?? 0,
      taxPercent: input.taxPercent ?? 22,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      total: totals.total,
      templateStyle: input.templateStyle || "premium",
      accentColor: input.accentColor || "#6366f1",
      showBranding: input.showBranding ?? true,
      includeTimeline: input.includeTimeline ?? true,
      includePackages: input.includePackages ?? false,
      packages: input.packages || [],
      milestones: input.milestones || [],
      status: (input.status as WebQuoteStatus) || "DRAFT",
      items: {
        create: totals.items.map((item, index) => ({
          ...item,
          sortOrder: index,
          total: item.total,
        })),
      },
    },
    include: quoteInclude,
  });
}

export async function updateWebQuote(id: string, input: WebQuoteInput) {
  const items = mapItems(input.items);
  const totals = computeQuoteTotals(items, input.discountPercent ?? 0, input.taxPercent ?? 22);

  return prisma.$transaction(async (tx) => {
    await tx.webQuoteItem.deleteMany({ where: { quoteId: id } });
    return tx.webQuote.update({
      where: { id },
      data: {
        title: input.title.trim(),
        clientId: input.clientId,
        projectType: input.projectType || "website",
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        introduction: input.introduction?.trim() || undefined,
        scopeNotes: input.scopeNotes?.trim() || undefined,
        terms: input.terms?.trim() || undefined,
        paymentPlan: input.paymentPlan?.trim() || undefined,
        discountPercent: input.discountPercent ?? 0,
        taxPercent: input.taxPercent ?? 22,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        templateStyle: input.templateStyle || "premium",
        accentColor: input.accentColor || "#6366f1",
        showBranding: input.showBranding ?? true,
        includeTimeline: input.includeTimeline ?? true,
        includePackages: input.includePackages ?? false,
        packages: input.packages || [],
        milestones: input.milestones || [],
        ...(input.status && { status: input.status as WebQuoteStatus }),
        items: {
          create: totals.items.map((item, index) => ({
            ...item,
            sortOrder: index,
            total: item.total,
          })),
        },
      },
      include: quoteInclude,
    });
  });
}

export async function duplicateWebQuote(id: string, authorId?: string) {
  const source = await getWebQuote(id);
  if (!source) return null;

  return createWebQuote(
    {
      title: `${source.title} (copia)`,
      clientId: source.clientId,
      projectType: source.projectType,
      validUntil: source.validUntil?.toISOString(),
      introduction: source.introduction || undefined,
      scopeNotes: source.scopeNotes || undefined,
      terms: source.terms || undefined,
      paymentPlan: source.paymentPlan || undefined,
      discountPercent: source.discountPercent,
      taxPercent: source.taxPercent,
      templateStyle: source.templateStyle,
      accentColor: source.accentColor,
      showBranding: source.showBranding,
      includeTimeline: source.includeTimeline,
      includePackages: source.includePackages,
      packages: source.packages as WebQuoteInput["packages"],
      milestones: source.milestones as WebQuoteInput["milestones"],
      status: "DRAFT",
      items: source.items.map((item) => ({
        title: item.title,
        description: item.description || undefined,
        category: item.category || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        isOptional: item.isOptional,
        isPremium: item.isPremium,
      })),
    },
    authorId
  );
}

export async function markWebQuoteSent(id: string) {
  return prisma.webQuote.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
    include: quoteInclude,
  });
}

export async function deleteWebQuote(id: string) {
  return prisma.webQuote.delete({ where: { id } });
}

export async function touchWebQuotePdfGenerated(id: string) {
  return prisma.webQuote.update({
    where: { id },
    data: { pdfGeneratedAt: new Date() },
  });
}
