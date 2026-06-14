import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import {
  checkGoogleCalendarConnection,
  listGoogleCalendarEvents,
} from "@/lib/google/google-calendar-service";
import { isGoogleCalendarConfigured } from "@/lib/google/google-calendar-config";

function monthRange(year: number, month: number) {
  const from = new Date(year, month, 1, 0, 0, 0, 0);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

export const GET = withApi(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year") || new Date().getFullYear());
    const month = Number(searchParams.get("month") ?? new Date().getMonth());
    const { from, to } = monthRange(year, month);

    const [googleStatus, rows] = await Promise.all([
      checkGoogleCalendarConnection(),
      prisma.appointment.findMany({
        where: { startsAt: { gte: from, lte: to } },
        orderBy: { startsAt: "asc" },
        include: { client: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    const appointments = rows.map((a) => ({
      id: a.id,
      title: a.title,
      serviceType: a.serviceType,
      status: a.status,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt?.toISOString() ?? null,
      location: a.location,
      assignee: a.assignee,
      googleEventId: a.googleEventId,
      googleSyncedAt: a.googleSyncedAt?.toISOString() ?? null,
      clientName: a.client?.name ?? null,
      source: "local" as const,
      synced: Boolean(a.googleEventId),
    }));

    let externalEvents: Awaited<ReturnType<typeof listGoogleCalendarEvents>> = [];
    if (googleStatus.connected && isGoogleCalendarConfigured()) {
      try {
        const googleEvents = await listGoogleCalendarEvents(from, to);
        const linkedIds = new Set(
          appointments.map((a) => a.googleEventId).filter(Boolean) as string[]
        );
        externalEvents = googleEvents.filter((ev) => !linkedIds.has(ev.id));
      } catch (error) {
        console.error("[Google Calendar] Lettura eventi:", error);
        googleStatus.connected = false;
        googleStatus.error =
          error instanceof Error ? error.message : "Errore lettura eventi Google";
      }
    }

    return NextResponse.json({
      google: googleStatus,
      appointments,
      externalEvents,
      range: { from: from.toISOString(), to: to.toISOString() },
    });
  },
  { requireCsrf: false, serviceSlug: "appuntamenti" }
);
