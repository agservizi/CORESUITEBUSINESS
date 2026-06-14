import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { listModuleRecords } from "@/lib/platform/module-handlers";
import { getModuleDefinition } from "@/config/platform-modules";
import { getServiceSlugForModule, isPlatformModule } from "@/lib/platform/module-crud";

type RouteParams = { module: string };

function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<RouteParams> }
) {
  const params = await routeContext.params;
  const serviceSlug = getServiceSlugForModule(params.module);
  return withApi(
    async (req) => {
      if (!isPlatformModule(params.module)) {
        return NextResponse.json({ error: "Modulo non trovato" }, { status: 404 });
      }
      const view = new URL(req.url).searchParams.get("view") || "elenco";
      const def = getModuleDefinition(params.module);
      const filter = def?.listFilter?.(view);
      const items = (await listModuleRecords(params.module, filter, 5000, view)) as Record<
        string,
        unknown
      >[];

      const columns = def?.columns ?? [{ key: "id", label: "ID" }];
      const header = columns.map((c) => c.label).join(",");
      const rows = items.map((item) =>
        columns
          .map((col) => {
            const parts = col.key.split(".");
            let val: unknown = item;
            for (const p of parts) val = (val as Record<string, unknown>)?.[p];
            return csvEscape(val);
          })
          .join(",")
      );

      const csv = [header, ...rows].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${params.module}-${view}.csv"`,
        },
      });
    },
    { requireCsrf: false, serviceSlug }
  )(request, routeContext);
}
