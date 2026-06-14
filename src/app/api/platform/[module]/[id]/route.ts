import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { auditAction } from "@/lib/api-guard";
import {
  getModuleRecord,
  updateModuleRecord,
  deleteModuleRecord,
  getServiceSlugForModule,
  isPlatformModule,
} from "@/lib/platform/module-crud";

type RouteParams = { module: string; id: string };

function withModuleApi(
  handler: (
    request: NextRequest,
    ctx: { user: { id: string }; params: RouteParams }
  ) => Promise<NextResponse>,
  options: { requireCsrf?: boolean } = {}
) {
  return async (
    request: NextRequest,
    routeContext: { params: Promise<RouteParams> }
  ) => {
    const params = await routeContext.params;
    const serviceSlug = getServiceSlugForModule(params.module);
    return withApi(
      async (req, { user }) => handler(req, { user, params }),
      { ...options, serviceSlug }
    )(request, routeContext);
  };
}

export const GET = withModuleApi(
  async (_request, { params }) => {
    if (!isPlatformModule(params.module)) {
      return NextResponse.json({ error: "Modulo non trovato" }, { status: 404 });
    }

    try {
      const item = await getModuleRecord(params.module, params.id);
      if (!item) return NextResponse.json({ error: "Record non trovato" }, { status: 404 });
      return NextResponse.json({ item });
    } catch (error) {
      console.error(`GET /api/platform/${params.module}/${params.id}:`, error);
      return NextResponse.json({ error: "Errore nel recupero dati" }, { status: 500 });
    }
  },
  { requireCsrf: false }
);

export const PATCH = withModuleApi(async (request, { user, params }) => {
  if (!isPlatformModule(params.module)) {
    return NextResponse.json({ error: "Modulo non trovato" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const item = await updateModuleRecord(params.module, params.id, body, user.id);
    await auditAction(request, user.id, "UPDATE", params.module, params.id);
    return NextResponse.json({ item });
  } catch (error) {
    console.error(`PATCH /api/platform/${params.module}/${params.id}:`, error);
    return NextResponse.json({ error: "Errore nell'aggiornamento" }, { status: 500 });
  }
});

export const DELETE = withModuleApi(async (request, { user, params }) => {
  if (!isPlatformModule(params.module)) {
    return NextResponse.json({ error: "Modulo non trovato" }, { status: 404 });
  }

  try {
    await deleteModuleRecord(params.module, params.id);
    await auditAction(request, user.id, "DELETE", params.module, params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/platform/${params.module}/${params.id}:`, error);
    return NextResponse.json({ error: "Errore nell'eliminazione" }, { status: 500 });
  }
});
