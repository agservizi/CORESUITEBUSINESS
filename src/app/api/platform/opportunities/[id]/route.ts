import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { auditAction } from "@/lib/api-guard";
import {
  deleteOpportunity,
  getOpportunityById,
  updateOpportunityCodes,
  updateOpportunityStatus,
} from "@/lib/platform/opportunities-service";

type Params = { id: string };

function withIdApi(
  handler: (
    request: Request,
    ctx: { user: { id: string; role: string }; params: Params }
  ) => Promise<NextResponse>,
  options: { requireCsrf?: boolean } = {}
) {
  return async (request: Request, routeContext: { params: Promise<Params> }) => {
    const params = await routeContext.params;
    return withApi(
      async (req, { user }) => handler(req, { user, params }),
      { ...options, serviceSlug: "opportunities" }
    )(request as never, routeContext);
  };
}

export const GET = withIdApi(
  async (_request, { user, params }) => {
    const item = await getOpportunityById(params.id, user.id, user.role);
    if (!item) return NextResponse.json({ error: "Non trovata" }, { status: 404 });
    return NextResponse.json({ item });
  },
  { requireCsrf: false }
);

export const PATCH = withIdApi(async (request, { user, params }) => {
  try {
    const body = await request.json();

    if (body.statusCode || body.status) {
      const item = await updateOpportunityStatus(
        params.id,
        String(body.statusCode || body.status),
        user.id,
        user.role,
        body.adminNotes
      );
      await auditAction(request as never, user.id, "UPDATE", "opportunity", params.id);
      return NextResponse.json({ item });
    }

    if (body.contractCode !== undefined || body.clientCode !== undefined) {
      const item = await updateOpportunityCodes(params.id, body, user.id, user.role);
      await auditAction(request as never, user.id, "UPDATE", "opportunity", params.id);
      return NextResponse.json({ item });
    }

    return NextResponse.json({ error: "Nessuna modifica valida" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore aggiornamento";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

export const DELETE = withIdApi(async (request, { user, params }) => {
  try {
    await deleteOpportunity(params.id, user.id, user.role);
    await auditAction(request as never, user.id, "DELETE", "opportunity", params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore eliminazione";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
