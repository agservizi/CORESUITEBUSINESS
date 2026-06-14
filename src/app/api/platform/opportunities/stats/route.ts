import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { getOpportunityStats } from "@/lib/platform/opportunities-service";

export const GET = withApi(
  async (_request, { user }) => {
    const stats = await getOpportunityStats(user.id, user.role);
    return NextResponse.json(stats);
  },
  { requireCsrf: false, serviceSlug: "opportunities" }
);
