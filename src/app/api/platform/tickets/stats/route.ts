import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { getTicketStats } from "@/lib/platform/tickets-service";

export const GET = withApi(
  async () => {
    const stats = await getTicketStats();
    return NextResponse.json(stats);
  },
  { requireCsrf: false, serviceSlug: "tickets" }
);
