import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { auditAction } from "@/lib/api-guard";
import { getModuleDefinition } from "@/config/platform-modules";
import { createModuleRecord, listModuleRecords, countModuleRecords, buildEntrateUsciteSearchFilter } from "@/lib/platform/module-handlers";
import { assertCashSessionOpenForMutation, notifyFinanceEvent } from "@/lib/platform/cash-movement-utils";
import {
  getServiceSlugForModule,
  isPlatformModule,
  PLATFORM_MODULE_KEYS,
} from "@/lib/platform/module-crud";
import { prisma } from "@/lib/prisma";

const MODULES_NEEDING_CLIENT = new Set([
  "appuntamenti",
  "caf-patronato",
  "energia",
  "anpr",
  "cie",
  "visure-cr",
  "fedelta",
  "curriculum",
  "aci",
  "posta-telematica",
  "web-projects",
]);

async function resolveClientId(data: Record<string, unknown>) {
  if (data.clientId) return String(data.clientId);
  const client = await prisma.client.findFirst({ orderBy: { createdAt: "asc" } });
  return client?.id;
}

type RouteParams = { module: string };

function withModuleListApi(
  handler: (
    request: Request,
    ctx: { user: { id: string; role: string; email: string; clientId?: string | null }; params: RouteParams }
  ) => Promise<NextResponse>,
  options: { requireCsrf?: boolean } = {}
) {
  return async (
    request: Request,
    routeContext: { params: Promise<RouteParams> }
  ) => {
    const params = await routeContext.params;
    const serviceSlug = getServiceSlugForModule(params.module);
    return withApi(
      async (req, { user }) => handler(req, { user, params }),
      { ...options, serviceSlug }
    )(request as never, routeContext);
  };
}

export const GET = withModuleListApi(
  async (request, { params }) => {
    const { module } = params;
    if (!isPlatformModule(module)) {
      return NextResponse.json({ error: "Modulo non trovato" }, { status: 404 });
    }

    const view = new URL(request.url).searchParams.get("view") || "elenco";
    const def = getModuleDefinition(module);
    const baseFilter = def?.listFilter?.(view);
    const q = new URL(request.url).searchParams.get("q");
    const page = Math.max(1, Number(new URL(request.url).searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(new URL(request.url).searchParams.get("limit") || 25)));

    try {
      if (module === "entrate-uscite") {
        const where = buildEntrateUsciteSearchFilter(baseFilter, q);
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
          listModuleRecords(module, where, limit, view, skip),
          countModuleRecords(module, where),
        ]);
        return NextResponse.json({ items, total, page, limit });
      }

      const items = await listModuleRecords(module, baseFilter, 100, view);
      return NextResponse.json({ items });
    } catch (error) {
      console.error(`GET /api/platform/${module}:`, error);
      return NextResponse.json({ error: "Errore nel recupero dati" }, { status: 500 });
    }
  },
  { requireCsrf: false }
);

export const POST = withModuleListApi(async (request, { user, params }) => {
  const { module } = params;
  if (!isPlatformModule(module)) {
    return NextResponse.json({ error: "Modulo non trovato" }, { status: 404 });
  }

  try {
    const body = await request.json();

    if (module === "entrate-uscite") {
      await assertCashSessionOpenForMutation();
    }

    if (MODULES_NEEDING_CLIENT.has(module)) {
      const clientId = await resolveClientId(body);
      if (!clientId) {
        return NextResponse.json(
          { error: "Crea almeno un cliente nel modulo Business prima di procedere" },
          { status: 400 }
        );
      }
      body.clientId = clientId;
    }

    const record = await createModuleRecord(module, body, user.id);
    await auditAction(request as never, user.id, "CREATE", module, String(record.id));

    if (module === "entrate-uscite") {
      const r = record as { id: string; description?: string; amount?: unknown; type?: string };
      void notifyFinanceEvent({
        title: "Nuovo movimento di cassa",
        body: `${r.type === "USCITA" ? "Uscita" : "Entrata"}: ${r.description ?? "—"} · €${Number(r.amount ?? 0).toFixed(2)}`,
        link: `/services/entrate-uscite?id=${r.id}`,
      });
    }

    return NextResponse.json({ item: record }, { status: 201 });
  } catch (error) {
    console.error(`POST /api/platform/${module}:`, error);
    return NextResponse.json({ error: "Errore nella creazione" }, { status: 500 });
  }
});

export { PLATFORM_MODULE_KEYS };
