import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { deleteOpportunityFile } from "@/lib/platform/opportunities-service";

type Params = { id: string; fileId: string };

export const DELETE = async (request: Request, routeContext: { params: Promise<Params> }) => {
  const params = await routeContext.params;
  return withApi(
    async (_req, { user }) => {
      try {
        await deleteOpportunityFile(params.id, params.fileId, user.id, user.role);
        return NextResponse.json({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Errore eliminazione";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    },
    { serviceSlug: "opportunities" }
  )(request as never, routeContext);
};
