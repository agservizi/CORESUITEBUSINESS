"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Grid, Card, CardContent, LinearProgress, CircularProgress,
} from "@mui/material";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "@mui/material/styles";
import { getShellTokens, shellPanelSx, chartAxisTick, chartTooltipStyle } from "@/theme/shell-tokens";
import ServicePremiumSubView from "../service-shell/ServicePremiumSubView";
import { CHANNEL_COLORS, CHANNEL_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_LABELS, statusColor } from "./tickets-utils";

interface Stats {
  total: number;
  open: number;
  closed: number;
  resolutionRate: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byChannel: Record<string, number>;
  trend: { day: string; opened: number; resolved: number }[];
}

interface Props {
  serviceColor: string;
}

export default function TicketsReportView({ serviceColor }: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const axisTick = chartAxisTick(theme);
  const chartTooltip = chartTooltipStyle(theme);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/platform/tickets/stats");
    setStats(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress sx={{ color: serviceColor }} />
      </Box>
    );
  }

  if (!stats) return null;

  const priorityData = Object.entries(stats.byPriority).map(([k, v]) => ({
    name: PRIORITY_LABELS[k] || k,
    count: v,
    fill: PRIORITY_COLORS[k] || serviceColor,
  }));

  const channelData = Object.entries(stats.byChannel).map(([k, v]) => ({
    name: CHANNEL_LABELS[k] || k,
    count: v,
    fill: CHANNEL_COLORS[k] || serviceColor,
  }));

  return (
    <ServicePremiumSubView
      moduleKey="tickets"
      viewId="report"
      serviceName="Ticket & Assistenza"
      serviceColor={serviceColor}
      showKpiStrip={false}
    >
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={shellPanelSx}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Ticket totali</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "2rem" }}>{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={shellPanelSx}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Aperti vs chiusi</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.25rem" }}>{stats.open} / {stats.closed}</Typography>
              <LinearProgress
                variant="determinate"
                value={stats.resolutionRate}
                sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: shell.progressTrack, "& .MuiLinearProgress-bar": { bgcolor: "#10b981", borderRadius: 3 } }}
              />
              <Typography variant="caption" color="text.secondary">{stats.resolutionRate}% chiusi</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={shellPanelSx}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Stati attivi</Typography>
              <Box sx={{ mt: 1 }}>
                {Object.entries(stats.byStatus).slice(0, 4).map(([s, c]) => (
                  <Box key={s} sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography sx={{ fontSize: "0.8rem", color: statusColor(s) }}>{STATUS_LABELS[s] || s}</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.8rem" }}>{c}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={shellPanelSx}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Per priorità</Typography>
              <Box sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={shell.borderColor} />
                    <XAxis dataKey="name" tick={axisTick} />
                    <YAxis tick={axisTick} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltip} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={shellPanelSx}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Per canale</Typography>
              <Box sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={shell.borderColor} />
                    <XAxis dataKey="name" tick={axisTick} />
                    <YAxis tick={axisTick} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltip} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Card sx={shellPanelSx}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Trend settimanale</Typography>
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={shell.borderColor} />
                    <XAxis dataKey="day" tick={axisTick} />
                    <YAxis tick={axisTick} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltip} />
                    <Bar dataKey="opened" name="Aperti" fill={serviceColor} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="resolved" name="Chiusi" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </ServicePremiumSubView>
  );
}
