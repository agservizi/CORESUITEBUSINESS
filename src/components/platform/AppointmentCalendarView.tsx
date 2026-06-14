"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Paper,
  CircularProgress,
  Chip,
  Alert,
  Tooltip,
  Button,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SyncIcon from "@mui/icons-material/Sync";
import GoogleIcon from "@mui/icons-material/Google";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { getShellTokens, shellPaperSx } from "@/theme/shell-tokens";
import { jsonMutationHeaders } from "@/lib/csrf-client";

interface LocalAppointment {
  id: string;
  title: string;
  serviceType: string;
  status: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  clientName?: string | null;
  googleEventId?: string | null;
  googleSyncedAt?: string | null;
  source: "local";
  synced: boolean;
}

interface ExternalEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  htmlLink?: string | null;
  source: "google";
}

interface GoogleStatus {
  enabled: boolean;
  configured: boolean;
  connected: boolean;
  calendarId: string;
  timezone: string;
  error?: string;
}

type CalendarItem =
  | (LocalAppointment & { kind: "local" })
  | (ExternalEvent & { kind: "google" });

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AppointmentCalendarView({
  serviceColor = "#10b981",
}: {
  serviceColor?: string;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [appointments, setAppointments] = useState<LocalAppointment[]>([]);
  const [externalEvents, setExternalEvents] = useState<ExternalEvent[]>([]);
  const [google, setGoogle] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: String(cursor.getFullYear()),
        month: String(cursor.getMonth()),
      });
      const res = await fetch(`/api/platform/appuntamenti/calendar?${params}`);
      const data = await res.json();
      setAppointments(data.appointments || []);
      setExternalEvents(data.externalEvents || []);
      setGoogle(data.google || null);
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    load();
  }, [load]);

  const monthLabel = cursor.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  const allItems: CalendarItem[] = useMemo(
    () => [
      ...appointments.map((a) => ({ ...a, kind: "local" as const })),
      ...externalEvents.map((e) => ({ ...e, kind: "google" as const })),
    ],
    [appointments, externalEvents]
  );

  const calendarDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    allItems.forEach((item) => {
      const key = new Date(item.startsAt).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }
    return map;
  }, [allItems]);

  const selectedItems = selectedDay ? itemsByDay.get(selectedDay.toDateString()) || [] : [];

  async function manualSync(appointmentId: string) {
    setSyncingId(appointmentId);
    try {
      await fetch("/api/platform/appuntamenti/google/sync", {
        method: "POST",
        headers: jsonMutationHeaders(),
        body: JSON.stringify({ appointmentId }),
      });
      await load();
    } finally {
      setSyncingId(null);
    }
  }

  function prevMonth() {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
    setSelectedDay(null);
  }

  function nextMonth() {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
    setSelectedDay(null);
  }

  if (loading && !google) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress sx={{ color: serviceColor }} />
      </Box>
    );
  }

  return (
    <Box>
      {google?.enabled && (
        <Alert
          severity={google.connected ? "success" : "warning"}
          icon={google.connected ? <CloudDoneIcon /> : <CloudOffIcon />}
          sx={{ mb: 2 }}
          action={
            <Tooltip title="Ricarica calendario">
              <IconButton size="small" onClick={load} color="inherit">
                <SyncIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          }
        >
          {google.connected ? (
            <>
              Sincronizzato con Google Calendar · <strong>{google.calendarId}</strong> ({google.timezone})
            </>
          ) : (
            <>
              Google Calendar abilitato ma non connesso
              {google.error ? `: ${google.error}` : ". Verifica credenziali e condivisione calendario con il service account."}
            </>
          )}
        </Alert>
      )}

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, textTransform: "capitalize" }}>
          {monthLabel}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            size="small"
            icon={<GoogleIcon sx={{ fontSize: 16 }} />}
            label={`${appointments.length} appuntamenti`}
            sx={{ fontWeight: 600 }}
          />
          {externalEvents.length > 0 && (
            <Chip size="small" variant="outlined" label={`+${externalEvents.length} da Google`} />
          )}
          <IconButton size="small" onClick={prevMonth}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="small" onClick={nextMonth}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      <Paper sx={[shellPaperSx, { p: 2, position: "relative" }]}>
        {loading && (
          <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.04)", zIndex: 1, borderRadius: 2 }}>
            <CircularProgress size={24} sx={{ color: serviceColor }} />
          </Box>
        )}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 0.5 }}>
          {WEEKDAYS.map((w) => (
            <Typography key={w} align="center" variant="caption" color="text.secondary" sx={{ fontWeight: 600, py: 0.5 }}>
              {w}
            </Typography>
          ))}
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
          {calendarDays.map((day, i) => {
            if (!day) return <Box key={`empty-${i}`} sx={{ minHeight: 72 }} />;
            const key = day.toDateString();
            const dayItems = itemsByDay.get(key) || [];
            const isToday = sameDay(day, new Date());
            const isSelected = selectedDay && sameDay(day, selectedDay);

            return (
              <Box
                key={key}
                onClick={() => setSelectedDay(day)}
                sx={(theme) => {
                  const t = getShellTokens(theme);
                  return {
                    minHeight: 72,
                    p: 0.75,
                    borderRadius: 1.5,
                    cursor: "pointer",
                    border: isSelected
                      ? `2px solid ${serviceColor}`
                      : isToday
                        ? `1px solid ${serviceColor}66`
                        : t.border,
                    background: isSelected ? `${serviceColor}11` : "transparent",
                    "&:hover": { background: t.hover },
                  };
                }}
              >
                <Typography sx={{ fontSize: "0.75rem", fontWeight: isToday ? 700 : 500, color: isToday ? serviceColor : "text.primary" }}>
                  {day.getDate()}
                </Typography>
                {dayItems.slice(0, 2).map((item) => {
                  const isGoogleOnly = item.kind === "google";
                  const color = isGoogleOnly ? "#4285F4" : serviceColor;
                  return (
                    <Typography
                      key={`${item.kind}-${item.id}`}
                      noWrap
                      sx={{
                        fontSize: "0.65rem",
                        mt: 0.25,
                        px: 0.5,
                        borderRadius: 0.5,
                        background: `${color}22`,
                        color,
                        border: isGoogleOnly ? `1px dashed ${color}66` : undefined,
                      }}
                    >
                      {new Date(item.startsAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}{" "}
                      {item.title}
                    </Typography>
                  );
                })}
                {dayItems.length > 2 && (
                  <Typography variant="caption" color="text.secondary">+{dayItems.length - 2}</Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Paper>

      {selectedDay && (
        <Box sx={{ mt: 3 }}>
          <Typography sx={{ fontWeight: 600, mb: 1.5 }}>
            Appuntamenti del {selectedDay.toLocaleDateString("it-IT")}
          </Typography>
          {selectedItems.length === 0 ? (
            <Typography color="text.secondary">Nessun appuntamento</Typography>
          ) : (
            selectedItems.map((item) => {
              if (item.kind === "google") {
                return (
                  <Paper key={item.id} sx={[shellPaperSx, { p: 2, mb: 1, borderLeft: "3px solid #4285F4" }]}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "flex-start" }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>{item.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(item.startsAt).toLocaleString("it-IT")}
                          {item.location ? ` · ${item.location}` : ""}
                        </Typography>
                      </Box>
                      <Chip size="small" icon={<GoogleIcon />} label="Solo Google" sx={{ fontWeight: 600 }} />
                    </Box>
                    {item.htmlLink && (
                      <Button
                        size="small"
                        startIcon={<OpenInNewIcon />}
                        href={item.htmlLink}
                        target="_blank"
                        sx={{ mt: 1 }}
                      >
                        Apri in Google Calendar
                      </Button>
                    )}
                  </Paper>
                );
              }

              const a = item;
              return (
                <Paper key={a.id} sx={[shellPaperSx, { p: 2, mb: 1 }]}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 600 }}>{a.title}</Typography>
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      <Chip label={a.status} size="small" />
                      {a.synced ? (
                        <Chip size="small" color="success" icon={<CloudDoneIcon />} label="Sync Google" />
                      ) : google?.connected ? (
                        <Chip
                          size="small"
                          color="warning"
                          label="Non sync"
                          onClick={() => manualSync(a.id)}
                          disabled={syncingId === a.id}
                          sx={{ cursor: "pointer" }}
                        />
                      ) : null}
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(a.startsAt).toLocaleString("it-IT")} · {a.serviceType}
                    {a.clientName ? ` · ${a.clientName}` : ""}
                  </Typography>
                  {a.location && (
                    <Typography variant="caption" color="text.secondary">{a.location}</Typography>
                  )}
                </Paper>
              );
            })
          )}
        </Box>
      )}
    </Box>
  );
}
