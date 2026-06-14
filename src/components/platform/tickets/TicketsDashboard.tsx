"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Typography, Grid, Card, CardContent, Chip, LinearProgress, Stack, Button,
} from "@mui/material";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import TimerOffIcon from "@mui/icons-material/TimerOff";
import { motion } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";
import AnimatedCounter from "@/components/hub/AnimatedCounter";
import type { TicketRow } from "@/lib/platform/tickets-service";
import { STATUS_LABELS, statusColor, customerLabel } from "./tickets-utils";
import { ticketKpiHover } from "./tickets-motion";
import TicketsHero from "./TicketsHero";
import TicketsLiveFeed from "./TicketsLiveFeed";
import TicketsPulseBanner from "./TicketsPulseBanner";
import TicketsInsights from "./TicketsInsights";

interface Stats {
  total: number;
  open: number;
  closed: number;
  today: number;
  urgent: number;
  slaBreached: number;
  slaAtRisk: number;
  unassigned: number;
  resolutionRate: number;
  byStatus: Record<string, number>;
  recent: TicketRow[];
}

interface Props {
  serviceColor: string;
  onNavigate: (viewId: string) => void;
  onOpenTicket: (id: string) => void;
  onNew: () => void;
}

export default function TicketsDashboard({ serviceColor, onNavigate, onOpenTicket, onNew }: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveOpen, setLiveOpen] = useState<number | null>(null);
  const [liveUrgent, setLiveUrgent] = useState(0);
  const [liveSla, setLiveSla] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/platform/tickets/stats");
    setStats(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const es = new EventSource("/api/platform/tickets/stream");
    esRef.current = es;
    es.addEventListener("pulse", (e) => {
      try {
        const data = JSON.parse(e.data);
        setLiveOpen(data.openCount);
        setLiveUrgent(data.urgentCount ?? 0);
        setLiveSla(data.slaBreached ?? 0);
      } catch { /* ignore */ }
    });
    es.addEventListener("tickets", () => load());
    return () => es.close();
  }, [load]);

  const kpis = [
    { label: "Ticket totali", value: stats?.total ?? 0, icon: ConfirmationNumberIcon, color: serviceColor, gradient: `linear-gradient(135deg, ${serviceColor} 0%, #06b6d4 100%)` },
    { label: "Aperti", value: stats?.open ?? 0, icon: NotificationsActiveIcon, color: "#6366f1", gradient: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)" },
    { label: "Chiusi", value: stats?.closed ?? 0, icon: CheckCircleOutlinedIcon, color: "#10b981", gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)" },
    { label: "SLA scaduti", value: stats?.slaBreached ?? 0, icon: TimerOffIcon, color: "#ef4444", gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" },
  ];

  const statusRows = Object.entries(stats?.byStatus || {}).sort((a, b) => b[1] - a[1]);

  return (
    <Box>
      <TicketsPulseBanner
        slaBreached={stats?.slaBreached ?? liveSla}
        slaAtRisk={stats?.slaAtRisk ?? 0}
        urgentCount={stats?.urgent ?? liveUrgent}
        onNavigate={onNavigate}
      />

      <TicketsHero
        serviceColor={serviceColor}
        liveOpen={liveOpen ?? stats?.open ?? null}
        urgentCount={stats?.urgent ?? liveUrgent}
        slaBreached={stats?.slaBreached ?? liveSla}
        onNew={onNew}
      />

      <TicketsLiveFeed onRefresh={load} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              whileHover={ticketKpiHover}
            >
              <Card sx={[shellPanelSx, { height: "100%", position: "relative", overflow: "hidden" }]}>
                <Box sx={{ position: "absolute", top: -24, right: -24, width: 90, height: 90, borderRadius: "50%", background: `radial-gradient(circle, ${k.color}18 0%, transparent 70%)` }} />
                <CardContent>
                  <Box sx={{ width: 40, height: 40, borderRadius: "10px", background: k.gradient, display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5, boxShadow: `0 4px 14px ${k.color}44` }}>
                    <k.icon sx={{ fontSize: 20, color: "#fff" }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">{k.label}</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", mt: 0.5, lineHeight: 1 }}>
                    {loading ? "—" : <AnimatedCounter value={k.value} format="number" />}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <TicketsInsights serviceColor={serviceColor} onNavigate={onNavigate} onOpenTicket={onOpenTicket} />

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={shellPanelSx}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Distribuzione per stato</Typography>
              {loading ? (
                <LinearProgress />
              ) : (
                <Stack spacing={1.25}>
                  {statusRows.map(([status, count]) => {
                    const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0;
                    const col = statusColor(status);
                    return (
                      <Box key={status}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography sx={{ fontSize: "0.825rem", fontWeight: 600, color: col }}>
                            {STATUS_LABELS[status] || status}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{count} · {pct}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, bgcolor: shell.progressTrack, "& .MuiLinearProgress-bar": { bgcolor: col, borderRadius: 3 } }} />
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={shellPanelSx}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography sx={{ fontWeight: 700 }}>Attività recente</Typography>
                <Button size="small" onClick={() => onNavigate("elenco")}>Vedi tutti</Button>
              </Box>
              {!stats?.recent?.length ? (
                <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>Nessun ticket recente.</Typography>
              ) : (
                stats.recent.map((t) => (
                  <Box
                    key={t.id}
                    onClick={() => onOpenTicket(t.id)}
                    sx={{
                      py: 1.25,
                      borderBottom: shell.border,
                      cursor: "pointer",
                      "&:last-child": { borderBottom: 0 },
                      "&:hover": { opacity: 0.85 },
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.825rem" }} noWrap>{t.code}</Typography>
                      <Chip size="small" label={STATUS_LABELS[t.status] || t.status} sx={{ height: 22, fontSize: "0.65rem", bgcolor: `${statusColor(t.status)}22`, color: statusColor(t.status) }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" noWrap>{t.subject} · {customerLabel(t)}</Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
