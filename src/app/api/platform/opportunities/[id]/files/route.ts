import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { listOpportunityFiles, uploadOpportunityFile } from "@/lib/platform/opportunities-service";

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

export const GET = withIdApi(async (_request, { user, params }) => {
  try {
    const files = await listOpportunityFiles(params.id, user.id, user.role);
    return NextResponse.json({ files });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}, { requireCsrf: false });

export const POST = withIdApi(async (request, { user, params }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File mancante" }, { status: 400 });
    }
    const record = await uploadOpportunityFile(params.id, file, user.id, user.role);
    return NextResponse.json({ file: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore upload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
