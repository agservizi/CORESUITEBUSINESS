import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { auditAction } from "@/lib/api-guard";
import { createOpportunity, listOpportunities } from "@/lib/platform/opportunities-service";
import type { OpportunityCategory } from "@/generated/prisma";

export const GET = withApi(
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || searchParams.get("v") || "elenco";
    const category = searchParams.get("category") as OpportunityCategory | null;

    const result = await listOpportunities({
      userId: user.id,
      role: user.role,
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "20", 10),
      view,
      statusCode: searchParams.get("status") || undefined,
      category: category || undefined,
      q: searchParams.get("q") || undefined,
    });

    return NextResponse.json(result);
  },
  { requireCsrf: false, serviceSlug: "opportunities" }
);

export const POST = withApi(
  async (request, { user }) => {
    const body = await request.json();
    try {
      const item = await createOpportunity(body, user.id, user.role);
      await auditAction(request, user.id, "CREATE", "opportunity", item.id);
      return NextResponse.json({ item }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore creazione";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
  { serviceSlug: "opportunities" }
);
