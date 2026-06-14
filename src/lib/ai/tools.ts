import { prisma } from "@/lib/prisma";
import { updateModuleRecord } from "@/lib/platform/module-crud";
import { confirmBrtShipment } from "@/lib/platform/brt-service";
import { updatePickupStatus } from "@/lib/platform/logistica-service";
import { addLoyaltyMovement, redeemLoyaltyReward } from "@/lib/platform/fedelta-service";
import type { PracticeStatus } from "@/generated/prisma";

export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AiToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiToolResult {
  tool: string;
  success: boolean;
  summary: string;
  data?: Record<string, unknown>;
}

export interface AiToolContext {
  userId: string;
  role: string;
  scope: string;
  entityId?: string;
  moduleKey?: string;
}

const PRACTICE_STATUSES = new Set<PracticeStatus>([
  "BOZZA",
  "IN_LAVORAZIONE",
  "INVIATA",
  "COMPLETATA",
  "ANNULLATA",
]);

export const AI_TOOL_DEFINITIONS: AiToolDefinition[] = [
  {
    name: "list_pending_practices",
    description:
      "Elenca pratiche CAF/Patronato ancora aperte (non completate né annullate). Usa quando l'operatore chiede pratiche in sospeso.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max risultati (default 10)" },
        category: { type: "string", enum: ["CAF", "PATRONATO"], description: "Filtra per categoria" },
      },
    },
  },
  {
    name: "update_practice_status",
    description:
      "Aggiorna lo stato di una pratica CAF/Patronato. Usa practiceId o practiceCode. Per completare usa status COMPLETATA.",
    parameters: {
      type: "object",
      properties: {
        practiceId: { type: "string", description: "ID pratica (preferito se nel contesto)" },
        practiceCode: { type: "string", description: "Codice pratica es. PR-0001" },
        status: {
          type: "string",
          enum: ["BOZZA", "IN_LAVORAZIONE", "INVIATA", "COMPLETATA", "ANNULLATA"],
        },
        notes: { type: "string", description: "Note opzionali da aggiungere" },
      },
      required: ["status"],
    },
  },
  {
    name: "update_ticket_status",
    description: "Aggiorna lo stato di un ticket assistenza.",
    parameters: {
      type: "object",
      properties: {
        ticketId: { type: "string" },
        ticketCode: { type: "string" },
        status: {
          type: "string",
          enum: ["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "WAITING_PARTNER", "RESOLVED", "CLOSED"],
        },
      },
      required: ["status"],
    },
  },
  {
    name: "mark_movement_paid",
    description: "Segna un movimento cassa come pagato.",
    parameters: {
      type: "object",
      properties: {
        movementId: { type: "string" },
      },
      required: ["movementId"],
    },
  },
  {
    name: "update_appointment_status",
    description: "Aggiorna lo stato di un appuntamento.",
    parameters: {
      type: "object",
      properties: {
        appointmentId: { type: "string" },
        status: { type: "string", description: "Es. Programmato, Completato, Annullato" },
      },
      required: ["appointmentId", "status"],
    },
  },
  {
    name: "update_anpr_status",
    description: "Aggiorna lo stato di una richiesta ANPR. Usa requestId dal contesto se disponibile.",
    parameters: {
      type: "object",
      properties: {
        requestId: { type: "string" },
        status: {
          type: "string",
          enum: ["In attesa", "In lavorazione", "Completato", "Annullato"],
        },
        notes: { type: "string" },
      },
      required: ["status"],
    },
  },
  {
    name: "confirm_brt_shipment",
    description: "Conferma e spedisce un collo BRT (genera etichetta e tracking).",
    parameters: {
      type: "object",
      properties: {
        shipmentId: { type: "string" },
        trackingCode: { type: "string", description: "Codice tracking se shipmentId non noto" },
      },
    },
  },
  {
    name: "update_pickup_status",
    description: "Aggiorna lo stato di un pacco in logistica/ritiro.",
    parameters: {
      type: "object",
      properties: {
        packageId: { type: "string" },
        status: {
          type: "string",
          enum: ["SEGNALATO", "RICEVUTO", "PRONTO", "RITIRATO"],
        },
        note: { type: "string" },
      },
      required: ["status"],
    },
  },
  {
    name: "update_module_record_status",
    description:
      "Aggiorna stato e note di un record modulo (cie, visure-cr, aci, telegrammi, energia). Usa moduleKey + recordId.",
    parameters: {
      type: "object",
      properties: {
        moduleKey: {
          type: "string",
          enum: ["cie", "visure-cr", "aci", "telegrammi", "energia"],
        },
        recordId: { type: "string" },
        status: { type: "string" },
        notes: { type: "string" },
      },
      required: ["moduleKey", "status"],
    },
  },
  {
    name: "add_loyalty_points",
    description: "Accredita o scala punti fedeltà a un cliente.",
    parameters: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        points: { type: "number" },
        description: { type: "string" },
        movementType: { type: "string", enum: ["accredito", "riscatto", "rettifica"] },
      },
      required: ["clientId", "points"],
    },
  },
  {
    name: "redeem_loyalty_reward",
    description: "Riscatta un premio dal catalogo fedeltà per un cliente.",
    parameters: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        rewardId: { type: "string" },
        rewardName: { type: "string", description: "Nome premio se rewardId non noto" },
      },
      required: ["clientId"],
    },
  },
];

export function toolsCatalogJson(): string {
  return JSON.stringify(
    AI_TOOL_DEFINITIONS.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }))
  );
}

async function resolvePracticeId(args: Record<string, unknown>, ctx: AiToolContext): Promise<string> {
  if (args.practiceId) return String(args.practiceId);
  if (args.practiceCode) {
    const p = await prisma.practice.findFirst({
      where: { code: { equals: String(args.practiceCode), mode: "insensitive" } },
      select: { id: true },
    });
    if (!p) throw new Error(`Pratica ${args.practiceCode} non trovata`);
    return p.id;
  }
  if (ctx.entityId && (ctx.moduleKey === "caf-patronato" || !ctx.moduleKey)) {
    const exists = await prisma.practice.findUnique({ where: { id: ctx.entityId }, select: { id: true } });
    if (exists) return ctx.entityId;
  }
  throw new Error("Specifica practiceId o practiceCode, oppure apri una pratica specifica");
}

async function resolveTicketId(args: Record<string, unknown>, ctx: AiToolContext): Promise<string> {
  if (args.ticketId) return String(args.ticketId);
  if (args.ticketCode) {
    const t = await prisma.ticket.findFirst({
      where: { code: { equals: String(args.ticketCode), mode: "insensitive" } },
      select: { id: true },
    });
    if (!t) throw new Error(`Ticket ${args.ticketCode} non trovato`);
    return t.id;
  }
  if (ctx.entityId && ctx.scope === "tickets") return ctx.entityId;
  throw new Error("Specifica ticketId o ticketCode");
}

function normalizePracticeStatus(raw: unknown): PracticeStatus {
  const s = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const aliases: Record<string, PracticeStatus> = {
    COMPLETATA: "COMPLETATA",
    COMPLETATO: "COMPLETATA",
    COMPLETE: "COMPLETATA",
    CHIUSA: "COMPLETATA",
    CHIUSO: "COMPLETATA",
    IN_LAVORAZIONE: "IN_LAVORAZIONE",
    LAVORAZIONE: "IN_LAVORAZIONE",
    SOSPESO: "IN_LAVORAZIONE",
    IN_SOSPESO: "IN_LAVORAZIONE",
    INVIATA: "INVIATA",
    BOZZA: "BOZZA",
    ANNULLATA: "ANNULLATA",
    ANNULLATO: "ANNULLATA",
  };
  const status = aliases[s] ?? (s as PracticeStatus);
  if (!PRACTICE_STATUSES.has(status)) {
    throw new Error(`Stato pratica non valido: ${raw}`);
  }
  return status;
}

export async function executeAiTool(
  call: AiToolCall,
  ctx: AiToolContext
): Promise<AiToolResult> {
  try {
    switch (call.name) {
      case "list_pending_practices": {
        const limit = Math.min(Number(call.arguments.limit) || 10, 25);
        const category = call.arguments.category ? String(call.arguments.category) : undefined;
        const rows = await prisma.practice.findMany({
          where: {
            status: { notIn: ["COMPLETATA", "ANNULLATA"] },
            ...(category ? { category: category as "CAF" | "PATRONATO" } : {}),
          },
          take: limit,
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
        return {
          tool: call.name,
          success: true,
          summary: `${rows.length} pratiche in sospeso trovate`,
          data: { practices: rows },
        };
      }

      case "update_practice_status": {
        const id = await resolvePracticeId(call.arguments, ctx);
        const status = normalizePracticeStatus(call.arguments.status);
        const notes = call.arguments.notes ? String(call.arguments.notes) : undefined;

        const updated = await prisma.practice.update({
          where: { id },
          data: {
            status,
            ...(status === "COMPLETATA" ? { completedAt: new Date() } : {}),
            ...(status === "INVIATA" ? { submittedAt: new Date() } : {}),
            ...(notes ? { notes } : {}),
          },
          include: { client: { select: { name: true } } },
        });

        return {
          tool: call.name,
          success: true,
          summary: `Pratica ${updated.code} → ${status.replace(/_/g, " ")}`,
          data: {
            id: updated.id,
            code: updated.code,
            status: updated.status,
            clientName: updated.client?.name,
            moduleKey: "caf-patronato",
          },
        };
      }

      case "update_ticket_status": {
        const id = await resolveTicketId(call.arguments, ctx);
        const status = String(call.arguments.status);
        const updated = await updateModuleRecord("tickets", id, { status }, ctx.userId);
        return {
          tool: call.name,
          success: true,
          summary: `Ticket ${(updated as { code?: string }).code ?? id} → ${status}`,
          data: { id, status, moduleKey: "tickets" },
        };
      }

      case "mark_movement_paid": {
        const movementId = String(call.arguments.movementId || ctx.entityId || "");
        if (!movementId) throw new Error("movementId richiesto");
        const updated = await updateModuleRecord(
          "entrate-uscite",
          movementId,
          { status: "Pagato" },
          ctx.userId
        );
        return {
          tool: call.name,
          success: true,
          summary: `Movimento segnato come pagato`,
          data: {
            id: movementId,
            status: (updated as { status?: string }).status,
            moduleKey: "entrate-uscite",
          },
        };
      }

      case "update_appointment_status": {
        const appointmentId = String(call.arguments.appointmentId);
        const status = String(call.arguments.status);
        const updated = await updateModuleRecord(
          "appuntamenti",
          appointmentId,
          { status },
          ctx.userId
        );
        return {
          tool: call.name,
          success: true,
          summary: `Appuntamento aggiornato → ${status}`,
          data: { id: appointmentId, status, moduleKey: "appuntamenti" },
        };
      }

      case "update_anpr_status": {
        const requestId = String(call.arguments.requestId || ctx.entityId || "");
        if (!requestId) throw new Error("requestId richiesto");
        const status = String(call.arguments.status);
        const notes = call.arguments.notes ? String(call.arguments.notes) : undefined;
        const updated = await updateModuleRecord(
          "anpr",
          requestId,
          { status, ...(notes ? { notes } : {}) },
          ctx.userId
        );
        return {
          tool: call.name,
          success: true,
          summary: `Richiesta ANPR → ${status}`,
          data: { id: requestId, status, moduleKey: "anpr" },
        };
      }

      case "confirm_brt_shipment": {
        let shipmentId = call.arguments.shipmentId ? String(call.arguments.shipmentId) : "";
        if (!shipmentId && call.arguments.trackingCode) {
          const s = await prisma.shipment.findFirst({
            where: { trackingCode: String(call.arguments.trackingCode) },
            select: { id: true },
          });
          if (!s) throw new Error(`Spedizione ${call.arguments.trackingCode} non trovata`);
          shipmentId = s.id;
        }
        if (!shipmentId && ctx.entityId && ctx.moduleKey === "brt") shipmentId = ctx.entityId;
        if (!shipmentId) throw new Error("shipmentId o trackingCode richiesto");
        const updated = await confirmBrtShipment(shipmentId, ctx.userId);
        return {
          tool: call.name,
          success: true,
          summary: `Spedizione ${updated.trackingCode} confermata → IN CORSO`,
          data: { id: shipmentId, trackingCode: updated.trackingCode, moduleKey: "brt" },
        };
      }

      case "update_pickup_status": {
        const packageId = String(call.arguments.packageId || ctx.entityId || "");
        if (!packageId) throw new Error("packageId richiesto");
        const status = String(call.arguments.status);
        const note = call.arguments.note ? String(call.arguments.note) : undefined;
        const updated = await updatePickupStatus(packageId, status, note, ctx.userId);
        return {
          tool: call.name,
          success: true,
          summary: `Pacco → ${status}`,
          data: { id: packageId, status: updated.status, moduleKey: "logistica" },
        };
      }

      case "update_module_record_status": {
        const moduleKey = String(call.arguments.moduleKey || ctx.moduleKey || "");
        if (!moduleKey) throw new Error("moduleKey richiesto");
        const recordId = String(call.arguments.recordId || ctx.entityId || "");
        if (!recordId) throw new Error("recordId richiesto");
        const status = String(call.arguments.status);
        const notes = call.arguments.notes ? String(call.arguments.notes) : undefined;
        await updateModuleRecord(
          moduleKey,
          recordId,
          { status, ...(notes ? { notes } : {}) },
          ctx.userId
        );
        return {
          tool: call.name,
          success: true,
          summary: `${moduleKey} → ${status}`,
          data: { id: recordId, status, moduleKey },
        };
      }

      case "add_loyalty_points": {
        const clientId = String(call.arguments.clientId || ctx.entityId || "");
        if (!clientId) throw new Error("clientId richiesto");
        const points = Number(call.arguments.points);
        const movement = await addLoyaltyMovement(
          {
            clientId,
            points,
            movementType: String(call.arguments.movementType || "accredito"),
            description: call.arguments.description ? String(call.arguments.description) : undefined,
          },
          { id: ctx.userId, email: ctx.role }
        );
        return {
          tool: call.name,
          success: true,
          summary: `${points > 0 ? "+" : ""}${points} punti → saldo ${movement.balanceAfter}`,
          data: { id: movement.id, clientId, balanceAfter: movement.balanceAfter, moduleKey: "fedelta" },
        };
      }

      case "redeem_loyalty_reward": {
        const clientId = String(call.arguments.clientId || ctx.entityId || "");
        if (!clientId) throw new Error("clientId richiesto");
        let rewardId = call.arguments.rewardId ? String(call.arguments.rewardId) : "";
        if (!rewardId && call.arguments.rewardName) {
          const { prisma } = await import("@/lib/prisma");
          const reward = await prisma.loyaltyReward.findFirst({
            where: { name: { contains: String(call.arguments.rewardName), mode: "insensitive" }, isActive: true },
          });
          if (!reward) throw new Error("Premio non trovato");
          rewardId = reward.id;
        }
        if (!rewardId) throw new Error("rewardId o rewardName richiesto");
        const movement = await redeemLoyaltyReward(clientId, rewardId, { id: ctx.userId, email: ctx.role });
        return {
          tool: call.name,
          success: true,
          summary: `Premio riscattato — saldo ${movement.balanceAfter}`,
          data: { id: movement.id, clientId, moduleKey: "fedelta" },
        };
      }

      default:
        return { tool: call.name, success: false, summary: `Tool sconosciuto: ${call.name}` };
    }
  } catch (error) {
    return {
      tool: call.name,
      success: false,
      summary: error instanceof Error ? error.message : "Errore esecuzione tool",
    };
  }
}

export async function executeAiTools(
  calls: AiToolCall[],
  ctx: AiToolContext
): Promise<AiToolResult[]> {
  const results: AiToolResult[] = [];
  for (const call of calls.slice(0, 5)) {
    results.push(await executeAiTool(call, ctx));
  }
  return results;
}
