import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { getOperationsKpi, getOperationsCharts } from "@/lib/platform/module-handlers";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const [kpi, charts] = await Promise.all([getOperationsKpi(), getOperationsCharts()]);
    return NextResponse.json({ kpi, ...charts });
  } catch (error) {
    console.error("GET /api/platform/operations:", error);
    return NextResponse.json({ error: "Errore KPI" }, { status: 500 });
  }
}
