import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { getCommissionReport, getMonthlyCommissionsByCollaborator } from "@/lib/platform/opportunities-service";

export const GET = withApi(
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || undefined;
    const mode = searchParams.get("mode");

    if (mode === "collaborators") {
      const rows = await getMonthlyCommissionsByCollaborator(month || new Date().toISOString().slice(0, 7));
      return NextResponse.json({ rows, month: month || new Date().toISOString().slice(0, 7) });
    }

    const report = await getCommissionReport(user.id, user.role, month);
    return NextResponse.json(report);
  },
  { requireCsrf: false, serviceSlug: "opportunities" }
);
