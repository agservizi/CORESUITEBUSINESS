export type GoogleCalendarSendUpdates = "all" | "externalOnly" | "none";

export interface GoogleCalendarConfig {
  enabled: boolean;
  calendarId: string;
  timezone: string;
  defaultDurationMinutes: number;
  inviteClient: boolean;
  sendUpdates: GoogleCalendarSendUpdates;
  credentials: Record<string, unknown> | null;
}

function parseCredentials(): Record<string, unknown> | null {
  const rawJson = process.env.GOOGLE_CALENDAR_CREDENTIALS_JSON?.trim();
  const path = process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH?.trim();

  if (rawJson) {
    try {
      const decoded = rawJson.startsWith("{") ? rawJson : Buffer.from(rawJson, "base64").toString("utf8");
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      console.error("[Google Calendar] Credenziali JSON non validhe");
      return null;
    }
  }

  if (path) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs") as typeof import("fs");
      return JSON.parse(fs.readFileSync(path, "utf8")) as Record<string, unknown>;
    } catch {
      console.error("[Google Calendar] Impossibile leggere GOOGLE_CALENDAR_CREDENTIALS_PATH");
      return null;
    }
  }

  return null;
}

export function getGoogleCalendarConfig(): GoogleCalendarConfig {
  const sendUpdates = (process.env.GOOGLE_CALENDAR_SEND_UPDATES?.trim() || "none") as GoogleCalendarSendUpdates;
  return {
    enabled: process.env.GOOGLE_CALENDAR_ENABLED === "true",
    calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID?.trim() || "primary",
    timezone: process.env.GOOGLE_CALENDAR_TIMEZONE?.trim() || "Europe/Rome",
    defaultDurationMinutes: Math.max(15, Number(process.env.GOOGLE_CALENDAR_DEFAULT_DURATION || 60)),
    inviteClient: process.env.GOOGLE_CALENDAR_INVITE_CLIENT !== "false",
    sendUpdates: ["all", "externalOnly", "none"].includes(sendUpdates) ? sendUpdates : "none",
    credentials: parseCredentials(),
  };
}

export function isGoogleCalendarConfigured(): boolean {
  const cfg = getGoogleCalendarConfig();
  return cfg.enabled && Boolean(cfg.credentials?.client_email && cfg.credentials?.private_key);
}
