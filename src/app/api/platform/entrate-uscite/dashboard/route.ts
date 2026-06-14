import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { getFinanceDashboard } from "@/lib/platform/finance-dashboard-service";

export const GET = withApi(
  async (request) => {
    const period = (new URL(request.url).searchParams.get("period") || "month") as
      | "day"
      | "week"
      | "month"
      | "year";
    const data = await getFinanceDashboard(
      ["day", "week", "month", "year"].includes(period) ? period : "month"
    );
    return NextResponse.json(data);
  },
  { requireCsrf: false, serviceSlug: "entrate-uscite" }
);
