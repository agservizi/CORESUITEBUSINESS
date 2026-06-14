import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { getTicketInsights, getTicketStats } from "@/lib/platform/tickets-service";

export const GET = withApi(
  async () => {
    const [insights, stats] = await Promise.all([getTicketInsights(), getTicketStats()]);
    return NextResponse.json({ ...insights, stats });
  },
  { requireCsrf: false, serviceSlug: "tickets" }
);
