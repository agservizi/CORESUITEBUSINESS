import { prisma } from "@/lib/prisma";
import {
  deleteGoogleCalendarEvent,
  upsertGoogleCalendarEvent,
} from "@/lib/google/google-calendar-service";
import { getGoogleCalendarConfig, isGoogleCalendarConfigured } from "@/lib/google/google-calendar-config";

type AppointmentWithClient = {
  id: string;
  title: string;
  serviceType: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  notes: string | null;
  status: string;
  googleEventId: string | null;
  client?: { name: string; email: string | null } | null;
};

async function loadAppointment(id: string): Promise<AppointmentWithClient | null> {
  return prisma.appointment.findUnique({
    where: { id },
    include: { client: { select: { name: true, email: true } } },
  });
}

export async function syncAppointmentToGoogle(appointmentId: string): Promise<void> {
  if (!isGoogleCalendarConfigured()) return;

  const appointment = await loadAppointment(appointmentId);
  if (!appointment) return;

  try {
    const googleEventId = await upsertGoogleCalendarEvent({
      googleEventId: appointment.googleEventId,
      title: appointment.title,
      serviceType: appointment.serviceType,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      location: appointment.location,
      notes: appointment.notes,
      status: appointment.status,
      clientEmail: appointment.client?.email,
      clientName: appointment.client?.name,
    });

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { googleEventId, googleSyncedAt: new Date() },
    });
  } catch (error) {
    console.error(`[Google Calendar] Sync fallita per appuntamento ${appointmentId}:`, error);
    throw error;
  }
}

export async function removeAppointmentFromGoogle(appointment: {
  googleEventId: string | null;
}): Promise<void> {
  if (!appointment.googleEventId || !isGoogleCalendarConfigured()) return;
  await deleteGoogleCalendarEvent(appointment.googleEventId);
}

export function defaultAppointmentEndsAt(startsAt: Date): Date {
  const cfg = getGoogleCalendarConfig();
  return new Date(startsAt.getTime() + cfg.defaultDurationMinutes * 60 * 1000);
}
