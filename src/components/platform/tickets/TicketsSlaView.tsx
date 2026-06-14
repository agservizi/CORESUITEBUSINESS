"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Grid, Card, CardContent, LinearProgress, Chip, Button, CircularProgress,
} from "@mui/material";
import TimerOffIcon from "@mui/icons-material/TimerOff";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import { motion } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";
import ServicePremiumSubView from "../service-shell/ServicePremiumSubView";
import TicketsListView from "./TicketsListView";
import { ticketKpiHover } from "./tickets-motion";

interface SlaStats {
  slaBreached: number;
  slaAtRisk: number;
  open: number;
  resolutionRate: number;
}

interface Props {
  serviceColor: string;
  viewId?: string;
  onOpenTicket: (id: string) => void;
  onNavigate: (viewId: string) => void;
  onNew: () => void;
}

export default function TicketsSlaView({ serviceColor, viewId = "sla", onOpenTicket, onNavigate, onNew }: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const [stats, setStats] = useState<SlaStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/platform/tickets/stats");
    setStats(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const listViewId = viewId === "sla_scaduti" ? "sla_scaduti" : viewId === "sla_rischio" ? "sla_rischio" : "sla";

  const kpis = [
    { label: "SLA scaduti", value: stats?.slaBreached ?? 0, color: "#ef4444", icon: TimerOffIcon },
    { label: "A rischio (4h)", value: stats?.slaAtRisk ?? 0, color: "#f59e0b", icon: WarningAmberIcon },
    { label: "Tasso chiusura", value: stats?.resolutionRate ?? 0, color: "#10b981", icon: CheckCircleOutlinedIcon, suffix: "%" },
  ];

  return (
    <ServicePremiumSubView
      moduleKey="tickets"
      viewId="sla"
      serviceName="Ticket & Assistenza"
      serviceColor={serviceColor}
      showKpiStrip={false}
    >
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid key={k.label} size={{ xs: 12, sm: 4 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={ticketKpiHover}>
              <Card sx={shellPanelSx}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <k.icon sx={{ color: k.color }} />
                    <Typography variant="caption" color="text.secondary">{k.label}</Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.75rem", color: k.color }}>
                    {loading ? "—" : `${k.value}${k.suffix ?? ""}`}
                  </Typography>
                  {k.label.includes("chiusura") && stats && (
                    <LinearProgress
                      variant="determinate"
                      value={stats.resolutionRate}
                      sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: shell.progressTrack, "& .MuiLinearProgress-bar": { bgcolor: k.color, borderRadius: 3 } }}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        {(["sla", "sla_scaduti", "sla_rischio"] as const).map((v) => (
          <Chip
            key={v}
            clickable
            label={v === "sla" ? "Tutti con SLA" : v === "sla_scaduti" ? "Scaduti" : "A rischio"}
            color={listViewId === v ? "primary" : "default"}
            onClick={() => onNavigate(v)}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Box>

      <TicketsListView
        viewId={listViewId}
        serviceColor={serviceColor}
        onOpenTicket={onOpenTicket}
        onNew={onNew}
        onRefresh={load}
      />
    </ServicePremiumSubView>
  );
}
