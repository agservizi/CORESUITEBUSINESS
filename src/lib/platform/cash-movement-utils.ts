import { prisma } from "@/lib/prisma";
import { getCashSessionForDate } from "@/lib/platform/cash-register-service";

export const MOVEMENT_STATUSES = ["Pagato", "In lavorazione", "Sospeso", "Annullato"] as const;
export type MovementStatus = (typeof MOVEMENT_STATUSES)[number];

const PAID_ALIASES = new Set(["pagato", "completato"]);
const PENDING_ALIASES = new Set(["in lavorazione", "sospeso", "pending"]);

export function normalizeMovementStatus(status?: string | null): MovementStatus {
  const s = (status || "").trim().toLowerCase();
  if (PAID_ALIASES.has(s)) return "Pagato";
  if (s === "annullato" || s === "annullata") return "Annullato";
  if (s === "sospeso") return "Sospeso";
  return "In lavorazione";
}

export function isPaidMovementStatus(status?: string | null) {
  return normalizeMovementStatus(status) === "Pagato";
}

export function paidAtForStatus(status: MovementStatus, existing?: Date | null) {
  if (status === "Pagato") return existing ?? new Date();
  return null;
}

export function buildMovementStatusFilter(notPaidOnly: boolean) {
  if (!notPaidOnly) return undefined;
  return { notIn: ["Pagato", "Completato", "Annullato"] };
}

export async function assertCashSessionOpenForMutation() {
  const session = await getCashSessionForDate(new Date());
  if (!session || session.status !== "OPEN") {
    throw new Error("Giornata cassa non aperta — apri la cassa prima di registrare movimenti");
  }
}

export async function assertCanDeleteCashMovement(id: string) {
  const row = await prisma.cashMovement.findUnique({
    where: { id },
    include: { expressSale: { select: { id: true, receiptNumber: true } } },
  });
  if (!row) throw new Error("Movimento non trovato");
  if (row.expressSale) {
    throw new Error(
      `Movimento collegato a vendita Express${row.expressSale.receiptNumber ? ` #${row.expressSale.receiptNumber}` : ""} — annulla la vendita da Express`
    );
  }
  return row;
}

export async function notifyFinanceEvent(input: {
  title: string;
  body: string;
  link?: string;
  type?: string;
}) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] } },
    select: { id: true },
    take: 20,
  });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((u) => ({
      userId: u.id,
      title: input.title,
      body: input.body,
      link: input.link,
      type: input.type || "finance",
    })),
  });
}
