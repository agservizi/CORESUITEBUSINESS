"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip, CircularProgress,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "@mui/material/styles";
import { getShellTokens, shellPanelSx, chartAxisTick, chartTooltipStyle } from "@/theme/shell-tokens";
import type { TicketRow } from "@/lib/platform/tickets-service";
import {
  customerLabel, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_LABELS, statusColor,
} from "./tickets-utils";
import { hubStaggerContainer, hubFadeUp } from "@/lib/hub-motion";
import { ticketKpiHover } from "./tickets-motion";

interface Suggestion {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  body: string;
  viewId: string;
}

interface Props {
  serviceColor: string;
  onNavigate: (viewId: string) => void;
  onOpenTicket: (id: string) => void;
}

const PRIORITY_CHIP = { high: "#ef4444", medium: "#f59e0b", low: "#6366f1" };

export default function TicketsInsights({ serviceColor, onNavigate, onOpenTicket }: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const axisTick = chartAxisTick(theme);
  const chartTooltip = chartTooltipStyle(theme);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [hot, setHot] = useState<TicketRow[]>([]);
  const [stale, setStale] = useState<TicketRow[]>([]);
  const [trend, setTrend] = useState<{ day: string; opened: number; resolved: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/platform/tickets/insights");
    const data = await res.json();
    setSuggestions(data.suggestions || []);
    setHot(data.hot || []);
    setStale(data.stale || []);
    setTrend(data.stats?.trend || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} sx={{ color: serviceColor }} />
      </Box>
    );
  }

  return (
    <Box component={motion.div} variants={hubStaggerContainer} initial="hidden" animate="show">
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={shellPanelSx} component={motion.div} variants={hubFadeUp}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Trend 7 giorni</Typography>
              <Box sx={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="ticketOpened" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={serviceColor} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={serviceColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={axisTick} />
                    <YAxis tick={axisTick} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltip} />
                    <Area type="monotone" dataKey="opened" name="Aperti" stroke={serviceColor} fill="url(#ticketOpened)" strokeWidth={2} />
                    <Area type="monotone" dataKey="resolved" name="Chiusi" stroke="#10b981" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={shellPanelSx} component={motion.div} variants={hubFadeUp}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <AutoAwesomeIcon sx={{ color: serviceColor, fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700 }}>Azioni consigliate</Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                {suggestions.map((s) => (
                  <Box
                    key={s.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: `1px solid ${PRIORITY_CHIP[s.priority]}33`,
                      bgcolor: `${PRIORITY_CHIP[s.priority]}08`,
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>{s.title}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                      {s.body}
                    </Typography>
                    <Button size="small" onClick={() => onNavigate(s.viewId)} sx={{ color: PRIORITY_CHIP[s.priority] }}>
                      Vai →
                    </Button>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={shellPanelSx} component={motion.div} variants={hubFadeUp} whileHover={ticketKpiHover}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <LocalFireDepartmentIcon sx={{ color: "#ef4444" }} />
                <Typography sx={{ fontWeight: 700 }}>Alta priorità</Typography>
              </Box>
              {hot.length === 0 ? (
                <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>Nessun ticket critico in coda.</Typography>
              ) : (
                hot.map((t) => (
                  <Box
                    key={t.id}
                    onClick={() => onOpenTicket(t.id)}
                    sx={{
                      py: 1,
                      px: 1.5,
                      mb: 0.75,
                      borderRadius: 1.5,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.825rem" }} noWrap>{t.code}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>{customerLabel(t)}</Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={PRIORITY_LABELS[t.priority] || t.priority}
                      sx={{ bgcolor: `${PRIORITY_COLORS[t.priority]}22`, color: PRIORITY_COLORS[t.priority], fontWeight: 600 }}
                    />
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={shellPanelSx} component={motion.div} variants={hubFadeUp} whileHover={ticketKpiHover}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <HourglassEmptyIcon sx={{ color: "#f59e0b" }} />
                <Typography sx={{ fontWeight: 700 }}>Inattivi da 48h+</Typography>
              </Box>
              {stale.length === 0 ? (
                <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>Tutti i ticket hanno attività recente.</Typography>
              ) : (
                stale.map((t) => (
                  <Box
                    key={t.id}
                    onClick={() => onOpenTicket(t.id)}
                    sx={{
                      py: 1,
                      px: 1.5,
                      mb: 0.75,
                      borderRadius: 1.5,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: "0.825rem" }}>{t.subject}</Typography>
                    <Typography variant="caption" sx={{ color: statusColor(t.status) }}>
                      {STATUS_LABELS[t.status] || t.status} · agg. {new Date(t.updatedAt).toLocaleDateString("it-IT")}
                    </Typography>
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
