import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { adminUpdateOffer } from "@/lib/platform/opportunities-service";

type Params = { id: string };

export const PATCH = async (request: Request, routeContext: { params: Promise<Params> }) => {
  const params = await routeContext.params;
  return withApi(
    async (req, { user }) => {
      try {
        const body = await req.json();
        const offer = await adminUpdateOffer(params.id, body, user.role);
        return NextResponse.json({ offer });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Errore aggiornamento";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    },
    { serviceSlug: "opportunities" }
  )(request as never, routeContext);
};
