import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { syncAppointmentToGoogle } from "@/lib/platform/appointment-google-sync";
import { isGoogleCalendarConfigured } from "@/lib/google/google-calendar-config";

export const POST = withApi(
  async (request) => {
    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json({ error: "Google Calendar non configurato" }, { status: 400 });
    }

    const body = await request.json();
    const appointmentId = String(body.appointmentId || "");
    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId richiesto" }, { status: 400 });
    }

    try {
      await syncAppointmentToGoogle(appointmentId);
      return NextResponse.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync fallita";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  },
  { serviceSlug: "appuntamenti" }
);
