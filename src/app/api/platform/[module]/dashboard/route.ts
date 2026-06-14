import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { getModuleDashboard } from "@/lib/platform/module-dashboard-service";
import { getServiceSlugForModule, isPlatformModule } from "@/lib/platform/module-crud";

type RouteParams = { module: string };

export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<RouteParams> }
) {
  const params = await routeContext.params;
  const serviceSlug = getServiceSlugForModule(params.module);
  return withApi(
    async () => {
      if (!isPlatformModule(params.module)) {
        return NextResponse.json({ error: "Modulo non trovato" }, { status: 404 });
      }
      try {
        const data = await getModuleDashboard(params.module);
        return NextResponse.json(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Errore dashboard";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    },
    { requireCsrf: false, serviceSlug }
  )(request, routeContext);
}
