import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { getOpportunityInsights } from "@/lib/platform/opportunities-wow";

export const GET = withApi(
  async (_request, { user }) => {
    const insights = await getOpportunityInsights(user.id, user.role);
    return NextResponse.json(insights);
  },
  { requireCsrf: false, serviceSlug: "opportunities" }
);
