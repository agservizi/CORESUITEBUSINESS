import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { checkGoogleCalendarConnection } from "@/lib/google/google-calendar-service";

export const GET = withApi(
  async () => {
    const status = await checkGoogleCalendarConnection();
    return NextResponse.json(status);
  },
  { requireCsrf: false, serviceSlug: "appuntamenti" }
);
