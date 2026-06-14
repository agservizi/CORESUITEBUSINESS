import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { getCashRegisterReport } from "@/lib/platform/cash-register-service";

export const GET = withApi(
  async (request) => {
    const period = (new URL(request.url).searchParams.get("period") || "month") as
      | "day"
      | "week"
      | "month"
      | "year";
    const report = await getCashRegisterReport(
      ["day", "week", "month", "year"].includes(period) ? period : "month"
    );
    return NextResponse.json({ report });
  },
  { requireCsrf: false, serviceSlug: "entrate-uscite" }
);
