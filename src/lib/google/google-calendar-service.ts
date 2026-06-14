import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import {
  getGoogleCalendarConfig,
  isGoogleCalendarConfigured,
  type GoogleCalendarSendUpdates,
} from "./google-calendar-config";

export interface GoogleCalendarEventItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  description?: string | null;
  htmlLink?: string | null;
  source: "google";
}

export interface GoogleCalendarStatus {
  enabled: boolean;
  configured: boolean;
  connected: boolean;
  calendarId: string;
  timezone: string;
  error?: string;
}

let calendarClient: calendar_v3.Calendar | null = null;

function getCalendarClient(): calendar_v3.Calendar {
  if (calendarClient) return calendarClient;

  const cfg = getGoogleCalendarConfig();
  if (!cfg.credentials) throw new Error("Credenziali Google Calendar mancanti");

  const auth = new google.auth.JWT({
    email: String(cfg.credentials.client_email),
    key: String(cfg.credentials.private_key),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  calendarClient = google.calendar({ version: "v3", auth });
  return calendarClient;
}

function sendUpdatesParam(): GoogleCalendarSendUpdates {
  return getGoogleCalendarConfig().sendUpdates;
}

export async function checkGoogleCalendarConnection(): Promise<GoogleCalendarStatus> {
  const cfg = getGoogleCalendarConfig();
  const base: GoogleCalendarStatus = {
    enabled: cfg.enabled,
    configured: isGoogleCalendarConfigured(),
    connected: false,
    calendarId: cfg.calendarId,
    timezone: cfg.timezone,
  };

  if (!cfg.enabled) return base;
  if (!base.configured) {
    return { ...base, error: "Credenziali Google Calendar non configurate" };
  }

  try {
    const calendar = getCalendarClient();
    await calendar.calendars.get({ calendarId: cfg.calendarId });
    return { ...base, connected: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connessione fallita";
    return { ...base, error: message };
  }
}

export async function listGoogleCalendarEvents(
  timeMin: Date,
  timeMax: Date
): Promise<GoogleCalendarEventItem[]> {
  if (!isGoogleCalendarConfigured()) return [];

  const cfg = getGoogleCalendarConfig();
  const calendar = getCalendarClient();

  const res = await calendar.events.list({
    calendarId: cfg.calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  return (res.data.items || [])
    .filter((ev) => ev.id && (ev.start?.dateTime || ev.start?.date))
    .map((ev) => {
      const start = ev.start?.dateTime || (ev.start?.date ? `${ev.start.date}T00:00:00` : "");
      const end = ev.end?.dateTime || ev.end?.date || null;
      return {
        id: ev.id!,
        title: ev.summary || "(Senza titolo)",
        startsAt: start,
        endsAt: end,
        location: ev.location || null,
        description: ev.description || null,
        htmlLink: ev.htmlLink || null,
        source: "google" as const,
      };
    });
}

export interface UpsertGoogleEventInput {
  googleEventId?: string | null;
  title: string;
  serviceType: string;
  startsAt: Date;
  endsAt?: Date | null;
  location?: string | null;
  notes?: string | null;
  status?: string;
  clientEmail?: string | null;
  clientName?: string | null;
}

export async function upsertGoogleCalendarEvent(
  input: UpsertGoogleEventInput
): Promise<string> {
  if (!isGoogleCalendarConfigured()) {
    throw new Error("Google Calendar non configurato");
  }

  const cfg = getGoogleCalendarConfig();
  const calendar = getCalendarClient();
  const endsAt =
    input.endsAt ??
    new Date(input.startsAt.getTime() + cfg.defaultDurationMinutes * 60 * 1000);

  const description = [
    input.serviceType,
    input.status ? `Stato: ${input.status}` : null,
    input.notes || null,
    input.clientName ? `Cliente: ${input.clientName}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const body: calendar_v3.Schema$Event = {
    summary: input.title,
    description: description || undefined,
    location: input.location || undefined,
    start: { dateTime: input.startsAt.toISOString(), timeZone: cfg.timezone },
    end: { dateTime: endsAt.toISOString(), timeZone: cfg.timezone },
    attendees:
      cfg.inviteClient && input.clientEmail
        ? [{ email: input.clientEmail, displayName: input.clientName || undefined }]
        : undefined,
  };

  if (input.googleEventId) {
    const res = await calendar.events.patch({
      calendarId: cfg.calendarId,
      eventId: input.googleEventId,
      requestBody: body,
      sendUpdates: sendUpdatesParam(),
    });
    return res.data.id || input.googleEventId;
  }

  const res = await calendar.events.insert({
    calendarId: cfg.calendarId,
    requestBody: body,
    sendUpdates: sendUpdatesParam(),
  });

  if (!res.data.id) throw new Error("Google Calendar non ha restituito un ID evento");
  return res.data.id;
}

export async function deleteGoogleCalendarEvent(googleEventId: string): Promise<void> {
  if (!isGoogleCalendarConfigured() || !googleEventId) return;

  const cfg = getGoogleCalendarConfig();
  const calendar = getCalendarClient();

  try {
    await calendar.events.delete({
      calendarId: cfg.calendarId,
      eventId: googleEventId,
      sendUpdates: sendUpdatesParam(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("404") || msg.includes("Not Found")) return;
    throw error;
  }
}

export function resetGoogleCalendarClient() {
  calendarClient = null;
}
