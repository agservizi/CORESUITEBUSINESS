import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { auditAction } from "@/lib/api-guard";
import { createModuleRecord } from "@/lib/platform/module-handlers";
import { listTickets } from "@/lib/platform/tickets-service";
import type { TicketChannel } from "@/generated/prisma";

export const GET = withApi(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel") as TicketChannel | null;
    const result = await listTickets({
      view: searchParams.get("view") || "elenco",
      q: searchParams.get("q") || undefined,
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "25", 10),
      channel: channel || undefined,
    });
    return NextResponse.json(result);
  },
  { requireCsrf: false, serviceSlug: "tickets" }
);

export const POST = withApi(
  async (request, { user }) => {
    const body = await request.json();
    try {
      const item = await createModuleRecord("tickets", body, user.id);
      await auditAction(request, user.id, "CREATE", "tickets", String(item.id));
      return NextResponse.json({ item }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore creazione";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
  { serviceSlug: "tickets" }
);
