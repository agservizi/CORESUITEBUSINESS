import type { Prisma } from "@/generated/prisma";
import { notifyBusinessEvent } from "@/lib/business-wow";
import { slaDueFromPriority } from "@/lib/platform/module-crud";

export interface ExpressIntegrationSettings {
  loyalty_on_sale: boolean;
  loyalty_points_per_sim: number;
  loyalty_points_per_euro: number;
  ticket_on_sim_sale: boolean;
  notify_staff_on_sale: boolean;
}

export interface ExpressSaleIntegrations {
  loyaltyPoints?: number;
  ticketId?: string;
  ticketCode?: string;
}

export interface SaleIntegrationInput {
  saleId: string;
  clientId?: string | null;
  userId: string;
  total: number;
  receiptLabel: string;
  simLines: Array<{
    description: string;
    assignedNumber?: string | null;
    iccid?: string | null;
    operatorName?: string | null;
  }>;
  client?: { name: string | null; email: string | null; phone: string | null } | null;
}

export function parseExpressIntegrationSettings(
  data: Record<string, unknown>
): ExpressIntegrationSettings {
  return {
    loyalty_on_sale: Boolean(data.loyalty_on_sale ?? true),
    loyalty_points_per_sim: Number(data.loyalty_points_per_sim ?? 10),
    loyalty_points_per_euro: Number(data.loyalty_points_per_euro ?? 0),
    ticket_on_sim_sale: Boolean(data.ticket_on_sim_sale ?? true),
    notify_staff_on_sale: Boolean(data.notify_staff_on_sale ?? true),
  };
}

function nextTicketCode() {
  return `TK-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export async function applyExpressSaleIntegrations(
  tx: Prisma.TransactionClient,
  settings: ExpressIntegrationSettings,
  input: SaleIntegrationInput
): Promise<ExpressSaleIntegrations> {
  const result: ExpressSaleIntegrations = {};

  if (input.clientId && settings.loyalty_on_sale) {
    const simCount = input.simLines.length;
    let points = simCount * settings.loyalty_points_per_sim;
    if (settings.loyalty_points_per_euro > 0) {
      points += Math.floor(input.total * settings.loyalty_points_per_euro);
    }
    if (points > 0) {
      await tx.loyaltyPoint.create({
        data: {
          clientId: input.clientId,
          points,
          reason: `Vendita Express ${input.receiptLabel}${simCount ? ` · ${simCount} SIM` : ""}`,
        },
      });
      result.loyaltyPoints = points;
    }
  }

  if (settings.ticket_on_sim_sale && input.simLines.length > 0) {
    const subject = `Attivazione SIM · Vendita ${input.receiptLabel}`;
    const bodyParts = input.simLines.map((line, index) => {
      const parts = [line.description];
      if (line.operatorName) parts.push(`Operatore: ${line.operatorName}`);
      if (line.iccid) parts.push(`ICCID: ${line.iccid}`);
      if (line.assignedNumber) parts.push(`Numero: ${line.assignedNumber}`);
      return `${index + 1}. ${parts.join(" · ")}`;
    });

    const ticket = await tx.ticket.create({
      data: {
        code: nextTicketCode(),
        subject,
        clientId: input.clientId ?? undefined,
        customerName: input.client?.name ?? undefined,
        customerEmail: input.client?.email ?? undefined,
        customerPhone: input.client?.phone ?? undefined,
        type: "TECH",
        priority: "MEDIUM",
        status: "OPEN",
        channel: "INTERNAL",
        createdById: input.userId,
        slaDueAt: slaDueFromPriority("MEDIUM"),
        tags: ["express", "attivazione-sim"],
      },
    });

    await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: input.userId,
        authorName: "Express POS",
        body: `Ticket auto-generato da vendita Express.\n\n${bodyParts.join("\n")}`,
        isInternal: true,
        statusSnapshot: "OPEN",
      },
    });

    result.ticketId = ticket.id;
    result.ticketCode = ticket.code;
  }

  return result;
}

export async function notifyExpressSaleIntegrations(
  input: {
    saleId: string;
    total: number;
    receiptLabel: string;
    loyaltyPoints?: number;
    ticketCode?: string;
  },
  settings: ExpressIntegrationSettings
) {
  if (!settings.notify_staff_on_sale) return;

  const parts = [`€${input.total.toFixed(2)}`];
  if (input.loyaltyPoints) parts.push(`+${input.loyaltyPoints} pt fedeltà`);
  if (input.ticketCode) parts.push(`ticket ${input.ticketCode}`);

  await notifyBusinessEvent({
    title: "Vendita Express completata",
    body: `${input.receiptLabel} · ${parts.join(" · ")}`,
    type: "express_sale",
    link: `/services/express?view=vendite&id=${input.saleId}`,
    notifyStaff: true,
  });
}
