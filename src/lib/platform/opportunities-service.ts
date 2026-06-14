import { prisma } from "@/lib/prisma";
import type { OpportunityCategory, Prisma } from "@/generated/prisma";
import { notifyBusinessEvent } from "@/lib/business-wow";
export {
  OPPORTUNITY_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
} from "@/lib/platform/opportunities-constants";

export const COMMISSION_EXCLUDED_STATUSES = new Set(["annullato"]);

export const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  TELEFONIA: "Telefonia",
  LUCE: "Luce",
  GAS: "Gas",
};

const STAFF_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATORE"]);

export function isStaffRole(role: string) {
  return STAFF_ROLES.has(role);
}

const opportunityInclude = {
  status: true,
  provider: true,
  offer: true,
  client: { select: { id: true, name: true, companyName: true, email: true, morosityScore: true } },
  collaborator: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
  managedBy: { select: { id: true, name: true, email: true } },
  files: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.OpportunityInclude;

export type SerializedOpportunity = Record<string, unknown> & {
  id: string;
  code: string;
  category: OpportunityCategory;
  statusCode: string;
  commissionAmount: number | null;
  commission: number;
  customerName: string;
  collaboratorName?: string;
  statusLabel?: string;
  statusColor?: string;
  title: string;
};

export function serializeOpportunity(row: Record<string, unknown>): SerializedOpportunity {
  const r = row as {
    commissionAmount?: unknown;
    metadata?: unknown;
    customerBirthDate?: Date | null;
    documentIssuedAt?: Date | null;
    documentExpiresAt?: Date | null;
    lastStatusChange?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    collaborator?: { name?: string | null; firstName?: string | null; lastName?: string | null; email?: string };
    status?: { code: string; label: string; color: string };
  };

  const collaboratorName = r.collaborator
    ? [r.collaborator.firstName || r.collaborator.name?.split(" ")[0], r.collaborator.lastName || r.collaborator.name?.split(" ").slice(1).join(" ")].filter(Boolean).join(" ") || r.collaborator.email
    : undefined;

  return {
    ...row,
    id: String((row as { id: string }).id),
    code: String((row as { code: string }).code),
    category: (row as { category: OpportunityCategory }).category,
    statusCode: String((row as { statusCode: string }).statusCode),
    commissionAmount: r.commissionAmount != null ? Number(r.commissionAmount) : null,
    commission: r.commissionAmount != null ? Number(r.commissionAmount) : 0,
    customerName: `${(row as { customerFirstName?: string }).customerFirstName ?? ""} ${(row as { customerLastName?: string }).customerLastName ?? ""}`.trim(),
    collaboratorName,
    statusLabel: r.status?.label,
    statusColor: r.status?.color,
    title: `${CATEGORY_LABELS[(row as { category: OpportunityCategory }).category] ?? ""} · ${(row as { providerLabel?: string }).providerLabel ?? ""}`.trim(),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt ?? ""),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt ?? ""),
    lastStatusChange: r.lastStatusChange instanceof Date ? r.lastStatusChange.toISOString() : r.lastStatusChange ?? null,
    documentExpiresAt: r.documentExpiresAt instanceof Date ? r.documentExpiresAt.toISOString() : r.documentExpiresAt ?? null,
  };
}

export async function buildOpportunityScope(userId: string, role: string): Promise<Prisma.OpportunityWhereInput> {
  if (isStaffRole(role)) return {};
  if (role === "COLLABORATORE") return { collaboratorId: userId };
  return { collaboratorId: userId };
}

export function viewToFilters(view?: string) {
  switch (view) {
    case "telefonia":
      return { category: "TELEFONIA" as OpportunityCategory };
    case "luce":
      return { category: "LUCE" as OpportunityCategory };
    case "gas":
      return { category: "GAS" as OpportunityCategory };
    case "attivi":
      return { statusCode: { notIn: ["annullato", "attivato"] } };
    case "attivati":
    case "vinte":
      return { statusCode: "attivato" };
    case "annullati":
    case "perse":
      return { statusCode: "annullato" };
    case "verifica":
    case "aperte":
      return { statusCode: "in_verifica" };
    case "documenti":
      return { statusCode: "documenti_ok" };
    case "firma":
      return { statusCode: "in_firma_otp" };
    default:
      return {};
  }
}

async function generateUniqueCode() {
  for (let i = 0; i < 20; i++) {
    const code = `OP${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
    const exists = await prisma.opportunity.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new Error("Impossibile generare codice opportunity");
}

export async function listOpportunities(input: {
  userId: string;
  role: string;
  page?: number;
  limit?: number;
  view?: string;
  statusCode?: string;
  category?: OpportunityCategory;
  q?: string;
}) {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const scope = await buildOpportunityScope(input.userId, input.role);
  const viewFilter = viewToFilters(input.view);

  const where: Prisma.OpportunityWhereInput = {
    ...scope,
    ...viewFilter,
    ...(input.statusCode && { statusCode: input.statusCode }),
    ...(input.category && { category: input.category }),
    ...(input.q?.trim() && {
      OR: [
        { code: { contains: input.q.trim(), mode: "insensitive" } },
        { customerFirstName: { contains: input.q.trim(), mode: "insensitive" } },
        { customerLastName: { contains: input.q.trim(), mode: "insensitive" } },
        { customerTaxCode: { contains: input.q.trim(), mode: "insensitive" } },
        { customerEmail: { contains: input.q.trim(), mode: "insensitive" } },
        { customerPhone: { contains: input.q.trim(), mode: "insensitive" } },
        { providerLabel: { contains: input.q.trim(), mode: "insensitive" } },
        { contractCode: { contains: input.q.trim(), mode: "insensitive" } },
      ],
    }),
  };

  const [rows, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: opportunityInclude,
    }),
    prisma.opportunity.count({ where }),
  ]);

  return {
    items: rows.map((r) => serializeOpportunity(r as unknown as Record<string, unknown>)),
    total,
    page,
    limit,
  };
}

export async function getOpportunityById(id: string, userId: string, role: string) {
  const scope = await buildOpportunityScope(userId, role);
  const row = await prisma.opportunity.findFirst({
    where: { id, ...scope },
    include: opportunityInclude,
  });
  return row ? serializeOpportunity(row as unknown as Record<string, unknown>) : null;
}

export async function getStatusOptions() {
  return prisma.opportunityStatusDef.findMany({ orderBy: [{ ordering: "asc" }, { label: "asc" }] });
}

export async function getProviderCatalog(category?: OpportunityCategory) {
  const providers = await prisma.opportunityProvider.findMany({
    where: { active: true, ...(category && { category }) },
    orderBy: [{ category: "asc" }, { ordering: "asc" }, { name: "asc" }],
    include: {
      offers: { where: { active: true }, orderBy: [{ ordering: "asc" }, { name: "asc" }] },
    },
  });

  const catalog: Record<string, typeof providers> = { TELEFONIA: [], LUCE: [], GAS: [] };
  for (const p of providers) {
    catalog[p.category].push(p);
  }
  return catalog;
}

function parseDate(v: unknown) {
  if (!v) return undefined;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

type StatusHistoryEntry = { statusCode: string; at: string; userId?: string };

function appendStatusHistory(
  metadata: unknown,
  statusCode: string,
  userId: string
): Prisma.InputJsonValue {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const history = Array.isArray(base.statusHistory)
    ? [...(base.statusHistory as StatusHistoryEntry[])]
    : [];
  history.push({ statusCode, at: new Date().toISOString(), userId });
  return { ...base, statusHistory: history } as Prisma.InputJsonValue;
}

export async function createOpportunity(data: Record<string, unknown>, userId: string, role: string) {
  const category = String(data.category || "").toUpperCase() as OpportunityCategory;
  if (!["TELEFONIA", "LUCE", "GAS"].includes(category)) {
    throw new Error("Categoria non valida");
  }

  const providerId = String(data.providerId || "");
  const provider = await prisma.opportunityProvider.findFirst({
    where: { id: providerId, category, active: true },
  });
  if (!provider) throw new Error("Gestore non valido");

  let offerId: string | undefined;
  let offerLabel: string | undefined;
  let commissionAmount = provider.defaultCommission ? Number(provider.defaultCommission) : null;

  if (data.offerId) {
    const offer = await prisma.opportunityOffer.findFirst({
      where: { id: String(data.offerId), providerId: provider.id, active: true },
    });
    if (!offer) throw new Error("Offerta non valida");
    offerId = offer.id;
    offerLabel = offer.name;
    if (offer.commission != null) commissionAmount = Number(offer.commission);
  }

  const customerFirstName = String(data.customerFirstName || "").trim();
  const customerLastName = String(data.customerLastName || "").trim();
  const customerTaxCode = String(data.customerTaxCode || "").trim().toUpperCase();
  const customerPhone = String(data.customerPhone || "").trim();
  const customerEmail = String(data.customerEmail || "").trim().toLowerCase();

  if (!customerFirstName || !customerLastName || !customerTaxCode || !customerPhone || !customerEmail) {
    throw new Error("Dati cliente obbligatori mancanti");
  }

  const metadata: Record<string, unknown> =
    data.metadata && typeof data.metadata === "object" ? { ...(data.metadata as object) } : {};

  if (category === "TELEFONIA") {
    const contractType = String(data.telefoniaContractType || metadata.telefonia_contract_type || "migrazione");
    metadata.telefonia_contract_type = contractType;
    if (contractType === "migrazione") {
      if (!data.telefoniaCurrentOperator || !data.telefoniaLineNumber) {
        throw new Error("Operatore e numero linea obbligatori per migrazione");
      }
    }
  }
  if (category === "LUCE" && !data.lucePod) throw new Error("POD obbligatorio");
  if (category === "GAS" && !data.gasPdr) throw new Error("PDR obbligatorio");

  const collaboratorId = role === "COLLABORATORE" ? userId : String(data.collaboratorId || userId);
  const code = await generateUniqueCode();

  const opportunity = await prisma.opportunity.create({
    data: {
      code,
      category,
      statusCode: "in_verifica",
      providerId: provider.id,
      offerId,
      providerLabel: provider.name,
      offerLabel,
      collaboratorId,
      commissionAmount,
      customerFirstName,
      customerLastName,
      customerTaxCode,
      customerBirthDate: parseDate(data.customerBirthDate),
      customerBirthPlace: data.customerBirthPlace ? String(data.customerBirthPlace) : undefined,
      customerPhone,
      customerEmail,
      customerAddress: data.customerAddress ? String(data.customerAddress) : undefined,
      customerCity: data.customerCity ? String(data.customerCity) : undefined,
      customerPostalCode: data.customerPostalCode ? String(data.customerPostalCode) : undefined,
      customerProvince: data.customerProvince ? String(data.customerProvince) : undefined,
      documentType: data.documentType ? String(data.documentType) : undefined,
      documentNumber: data.documentNumber ? String(data.documentNumber) : undefined,
      documentIssuedBy: data.documentIssuedBy ? String(data.documentIssuedBy) : undefined,
      documentIssuedAt: parseDate(data.documentIssuedAt),
      documentExpiresAt: parseDate(data.documentExpiresAt),
      telefoniaCurrentOperator: data.telefoniaCurrentOperator ? String(data.telefoniaCurrentOperator) : undefined,
      telefoniaLineNumber: data.telefoniaLineNumber ? String(data.telefoniaLineNumber) : undefined,
      lucePod: data.lucePod ? String(data.lucePod).toUpperCase() : undefined,
      gasPdr: data.gasPdr ? String(data.gasPdr).toUpperCase() : undefined,
      paymentMethod: String(data.paymentMethod || "IBAN").toUpperCase() === "BOLLETTINO" ? "BOLLETTINO" : "IBAN",
      paymentIban: data.paymentIban ? String(data.paymentIban).replace(/\s/g, "").toUpperCase() : undefined,
      paymentHolderIsCustomer: data.paymentHolderIsCustomer !== false && data.paymentHolderIsCustomer !== "0",
      paymentHolderFirstName: data.paymentHolderFirstName ? String(data.paymentHolderFirstName) : undefined,
      paymentHolderLastName: data.paymentHolderLastName ? String(data.paymentHolderLastName) : undefined,
      paymentHolderTaxCode: data.paymentHolderTaxCode ? String(data.paymentHolderTaxCode) : undefined,
      additionalNotes: data.additionalNotes ? String(data.additionalNotes) : undefined,
      metadata: appendStatusHistory(
        Object.keys(metadata).length ? metadata : undefined,
        "in_verifica",
        userId
      ),
      lastStatusChange: new Date(),
    },
    include: opportunityInclude,
  });

  await notifyOpportunityEvent({
    title: "Nuova opportunity contratto",
    body: `${code} · ${customerFirstName} ${customerLastName}`,
    type: "success",
    link: `/services/opportunities?v=elenco&id=${opportunity.id}`,
    userIds: [collaboratorId],
    notifyStaff: true,
  });

  return serializeOpportunity(opportunity as unknown as Record<string, unknown>);
}

export async function updateOpportunityStatus(
  id: string,
  statusCode: string,
  userId: string,
  role: string,
  adminNotes?: string
) {
  const existing = await getOpportunityById(id, userId, role);
  if (!existing) throw new Error("Opportunity non trovata");

  const status = await prisma.opportunityStatusDef.findUnique({ where: { code: statusCode } });
  if (!status) throw new Error("Stato non valido");

  const canManage = isStaffRole(role);
  if (!canManage && statusCode !== "annullato") {
    throw new Error("Non autorizzato ad aggiornare lo stato");
  }

  const raw = await prisma.opportunity.findFirst({
    where: { id, ...(await buildOpportunityScope(userId, role)) },
    select: { metadata: true },
  });
  if (!raw) throw new Error("Opportunity non trovata");

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: {
      statusCode,
      adminNotes: adminNotes ?? undefined,
      managedById: canManage ? userId : undefined,
      lastStatusChange: new Date(),
      metadata: appendStatusHistory(raw.metadata, statusCode, userId),
    },
    include: opportunityInclude,
  });

  await notifyOpportunityEvent({
    title: `Opportunity ${status.label.toLowerCase()}`,
    body: String(opportunity.code),
    type: statusCode === "attivato" ? "success" : statusCode === "annullato" ? "error" : "info",
    link: `/services/opportunities?v=elenco&id=${opportunity.id}`,
    userIds: [opportunity.collaboratorId],
    notifyStaff: statusCode === "attivato" || statusCode === "annullato",
  });

  return serializeOpportunity(opportunity as unknown as Record<string, unknown>);
}

export async function updateOpportunityCodes(
  id: string,
  payload: { contractCode?: string; clientCode?: string },
  userId: string,
  role: string
) {
  if (!isStaffRole(role)) throw new Error("Non autorizzato");
  const existing = await getOpportunityById(id, userId, role);
  if (!existing) throw new Error("Opportunity non trovata");

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: {
      contractCode: payload.contractCode?.trim() || null,
      clientCode: payload.clientCode?.trim() || null,
      managedById: userId,
    },
    include: opportunityInclude,
  });

  return serializeOpportunity(opportunity as unknown as Record<string, unknown>);
}

export async function deleteOpportunity(id: string, userId: string, role: string) {
  if (!isStaffRole(role)) throw new Error("Non autorizzato");
  const existing = await getOpportunityById(id, userId, role);
  if (!existing) throw new Error("Opportunity non trovata");
  await prisma.opportunity.delete({ where: { id } });
}

export async function getOpportunityStats(userId: string, role: string) {
  const scope = await buildOpportunityScope(userId, role);

  const [byStatus, byCategory, totals, recent, statuses] = await Promise.all([
    prisma.opportunity.groupBy({
      by: ["statusCode"],
      where: scope,
      _count: { id: true },
      _sum: { commissionAmount: true },
    }),
    prisma.opportunity.groupBy({
      by: ["category"],
      where: scope,
      _count: { id: true },
    }),
    prisma.opportunity.aggregate({
      where: scope,
      _count: { id: true },
      _sum: { commissionAmount: true },
    }),
    prisma.opportunity.findMany({
      where: scope,
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: opportunityInclude,
    }),
    getStatusOptions(),
  ]);

  const statusMap = Object.fromEntries(
    byStatus.map((s) => [s.statusCode, { count: s._count.id, commission: Number(s._sum.commissionAmount ?? 0) }])
  );

  const categoryMap = Object.fromEntries(
    byCategory.map((c) => [c.category, c._count.id])
  );

  const totalCount = totals._count.id;
  const activated = statusMap.attivato?.count ?? 0;
  const cancelled = statusMap.annullato?.count ?? 0;
  const active = Math.max(0, totalCount - activated - cancelled);
  const winRate = totalCount > 0 ? Math.round((activated / totalCount) * 100) : 0;

  const pipelineCommission = Object.entries(statusMap)
    .filter(([code]) => !COMMISSION_EXCLUDED_STATUSES.has(code) && code !== "attivato")
    .reduce((s, [, v]) => s + v.commission, 0);

  const wonCommission = statusMap.attivato?.commission ?? 0;

  return {
    total: totalCount,
    active,
    activated,
    cancelled,
    winRate,
    pipelineCommission,
    wonCommission,
    totalCommission: Number(totals._sum.commissionAmount ?? 0),
    byStatus: statusMap,
    byCategory: categoryMap,
    statuses,
    recent: recent.map((r) => serializeOpportunity(r as unknown as Record<string, unknown>)),
  };
}

export async function getPipelineBoard(userId: string, role: string) {
  const scope = await buildOpportunityScope(userId, role);
  const [statuses, rows] = await Promise.all([
    getStatusOptions(),
    prisma.opportunity.findMany({
      where: scope,
      orderBy: { updatedAt: "desc" },
      include: opportunityInclude,
    }),
  ]);

  return statuses.map((status) => ({
    status: status.code,
    label: status.label,
    color: status.color,
    opportunities: rows
      .filter((r) => r.statusCode === status.code)
      .map((r) => serializeOpportunity(r as unknown as Record<string, unknown>)),
  }));
}

export async function getCommissionReport(userId: string, role: string, monthKey?: string) {
  const scope = await buildOpportunityScope(userId, role);
  const key = monthKey && /^\d{4}-\d{2}$/.test(monthKey)
    ? monthKey
    : new Date().toISOString().slice(0, 7);
  const start = new Date(`${key}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const rows = await prisma.opportunity.findMany({
    where: {
      ...scope,
      createdAt: { gte: start, lt: end },
      statusCode: { notIn: [...COMMISSION_EXCLUDED_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
    include: opportunityInclude,
  });

  const serialized = rows.map((r) => serializeOpportunity(r as unknown as Record<string, unknown>));
  const activated = serialized.filter((r) => (r as { statusCode?: string }).statusCode === "attivato");
  const pending = serialized.filter((r) => (r as { statusCode?: string }).statusCode !== "attivato");

  return {
    monthKey: key,
    wonTotal: activated.reduce((s, r) => s + (r.commission || 0), 0),
    pendingTotal: pending.reduce((s, r) => s + (r.commission || 0), 0),
    won: activated,
    pending,
  };
}

export async function getMonthlyCommissionsByCollaborator(monthKey: string) {
  const key = /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : new Date().toISOString().slice(0, 7);
  const start = new Date(`${key}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const rows = await prisma.opportunity.groupBy({
    by: ["collaboratorId"],
    where: {
      createdAt: { gte: start, lt: end },
      statusCode: { notIn: [...COMMISSION_EXCLUDED_STATUSES] },
    },
    _count: { id: true },
    _sum: { commissionAmount: true },
    orderBy: { _sum: { commissionAmount: "desc" } },
  });

  const userIds = rows.map((r) => r.collaboratorId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, firstName: true, lastName: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => {
    const u = userMap.get(r.collaboratorId);
    const name = u ? [u.firstName || u.name, u.lastName].filter(Boolean).join(" ") || u.email : "—";
    return {
      collaboratorId: r.collaboratorId,
      name,
      email: u?.email,
      opportunities: r._count.id,
      totalCommission: Number(r._sum.commissionAmount ?? 0),
    };
  });
}

export async function listCollaboratorLinks(collaboratorId?: string) {
  return prisma.collaboratorCustomer.findMany({
    where: collaboratorId ? { collaboratorId } : undefined,
    orderBy: { lastSeenAt: "desc" },
    include: {
      collaborator: { select: { id: true, name: true, email: true } },
      client: { select: { id: true, name: true, companyName: true, email: true } },
    },
    take: 200,
  });
}

export async function assignCollaboratorClient(collaboratorId: string, clientId: string) {
  return prisma.collaboratorCustomer.upsert({
    where: { collaboratorId_clientId: { collaboratorId, clientId } },
    create: { collaboratorId, clientId },
    update: { lastSeenAt: new Date() },
    include: {
      collaborator: { select: { id: true, name: true, email: true } },
      client: { select: { id: true, name: true, companyName: true } },
    },
  });
}

export async function removeCollaboratorClient(collaboratorId: string, clientId: string) {
  await prisma.collaboratorCustomer.delete({
    where: { collaboratorId_clientId: { collaboratorId, clientId } },
  });
}

export async function listCollaborators() {
  return prisma.user.findMany({
    where: { role: "COLLABORATORE" },
    select: { id: true, name: true, email: true, firstName: true, lastName: true },
    orderBy: { name: "asc" },
  });
}

export async function getOpportunityDraft(collaboratorId: string) {
  return prisma.opportunityDraft.findUnique({ where: { collaboratorId } });
}

export async function saveOpportunityDraft(collaboratorId: string, payload: Record<string, unknown>) {
  return prisma.opportunityDraft.upsert({
    where: { collaboratorId },
    create: { collaboratorId, payload: payload as Prisma.InputJsonValue },
    update: { payload: payload as Prisma.InputJsonValue },
  });
}

export async function deleteOpportunityDraft(collaboratorId: string) {
  await prisma.opportunityDraft.deleteMany({ where: { collaboratorId } });
}

export async function listOpportunityFiles(opportunityId: string, userId: string, role: string) {
  const opp = await getOpportunityById(opportunityId, userId, role);
  if (!opp) throw new Error("Opportunity non trovata");
  return prisma.opportunityFile.findMany({
    where: { opportunityId },
    orderBy: { createdAt: "desc" },
  });
}

export async function uploadOpportunityFile(
  opportunityId: string,
  file: File,
  userId: string,
  role: string
) {
  const opp = await getOpportunityById(opportunityId, userId, role);
  if (!opp) throw new Error("Opportunity non trovata");

  const { saveOpportunityFileToDisk } = await import("./opportunity-uploads");
  const saved = await saveOpportunityFileToDisk(opportunityId, file);

  return prisma.opportunityFile.create({
    data: {
      opportunityId,
      originalName: saved.originalName,
      storedName: saved.storedName,
      filePath: saved.filePath,
      mimeType: saved.mimeType,
      fileSize: saved.fileSize,
      uploadedById: userId,
    },
  });
}

export async function deleteOpportunityFile(
  opportunityId: string,
  fileId: string,
  userId: string,
  role: string
) {
  const opp = await getOpportunityById(opportunityId, userId, role);
  if (!opp) throw new Error("Opportunity non trovata");

  const file = await prisma.opportunityFile.findFirst({
    where: { id: fileId, opportunityId },
  });
  if (!file) throw new Error("File non trovato");

  const { deleteOpportunityFileFromDisk } = await import("./opportunity-uploads");
  await deleteOpportunityFileFromDisk(file.filePath);
  await prisma.opportunityFile.delete({ where: { id: fileId } });
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "item";
}

export async function adminListProviders(includeInactive = false) {
  return prisma.opportunityProvider.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: [{ category: "asc" }, { ordering: "asc" }, { name: "asc" }],
    include: { offers: { orderBy: [{ ordering: "asc" }, { name: "asc" }] } },
  });
}

export async function adminCreateProvider(data: Record<string, unknown>, role: string) {
  if (!isStaffRole(role)) throw new Error("Non autorizzato");
  const category = String(data.category || "").toUpperCase() as OpportunityCategory;
  const name = String(data.name || "").trim();
  if (!name || !["TELEFONIA", "LUCE", "GAS"].includes(category)) {
    throw new Error("Dati gestore non validi");
  }
  return prisma.opportunityProvider.create({
    data: {
      category,
      name,
      slug: slugify(String(data.slug || name)),
      defaultCommission: data.defaultCommission != null ? Number(data.defaultCommission) : undefined,
      ordering: data.ordering != null ? Number(data.ordering) : 0,
      active: data.active !== false,
    },
    include: { offers: true },
  });
}

export async function adminUpdateProvider(id: string, data: Record<string, unknown>, role: string) {
  if (!isStaffRole(role)) throw new Error("Non autorizzato");
  return prisma.opportunityProvider.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: String(data.name) }),
      ...(data.defaultCommission !== undefined && { defaultCommission: Number(data.defaultCommission) }),
      ...(data.ordering !== undefined && { ordering: Number(data.ordering) }),
      ...(data.active !== undefined && { active: Boolean(data.active) }),
    },
    include: { offers: true },
  });
}

export async function adminCreateOffer(providerId: string, data: Record<string, unknown>, role: string) {
  if (!isStaffRole(role)) throw new Error("Non autorizzato");
  const name = String(data.name || "").trim();
  if (!name) throw new Error("Nome offerta obbligatorio");
  return prisma.opportunityOffer.create({
    data: {
      providerId,
      name,
      slug: slugify(String(data.slug || name)),
      commission: data.commission != null ? Number(data.commission) : undefined,
      ordering: data.ordering != null ? Number(data.ordering) : 0,
      active: data.active !== false,
    },
  });
}

export async function adminUpdateOffer(id: string, data: Record<string, unknown>, role: string) {
  if (!isStaffRole(role)) throw new Error("Non autorizzato");
  return prisma.opportunityOffer.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: String(data.name) }),
      ...(data.commission !== undefined && { commission: Number(data.commission) }),
      ...(data.ordering !== undefined && { ordering: Number(data.ordering) }),
      ...(data.active !== undefined && { active: Boolean(data.active) }),
    },
  });
}

async function notifyOpportunityEvent(input: {
  title: string;
  body: string;
  type: string;
  link?: string;
  userIds?: string[];
  notifyStaff?: boolean;
}) {
  await notifyBusinessEvent({
    title: input.title,
    body: input.body,
    type: input.type,
    link: input.link,
    userIds: input.userIds,
    notifyStaff: input.notifyStaff,
  });
}
