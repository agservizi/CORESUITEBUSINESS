"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Grid, Card, CardContent, LinearProgress, Chip,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LanguageIcon from "@mui/icons-material/Language";
import BusinessIcon from "@mui/icons-material/Business";
import { motion } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";
import ServicePremiumSubView from "../service-shell/ServicePremiumSubView";
import TicketsListView from "./TicketsListView";
import { CHANNEL_COLORS, CHANNEL_LABELS } from "./tickets-utils";
import { ticketKpiHover } from "./tickets-motion";

const CHANNELS = [
  { key: "PORTAL", icon: LanguageIcon, viewId: "portale" },
  { key: "EMAIL", icon: EmailIcon, viewId: "email" },
  { key: "PHONE", icon: PhoneIcon, viewId: "telefono" },
  { key: "INTERNAL", icon: BusinessIcon, viewId: "elenco" },
] as const;

interface Props {
  serviceColor: string;
  onOpenTicket: (id: string) => void;
  onNew: () => void;
}

export default function TicketsChannelsView({ serviceColor, onOpenTicket, onNew }: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const [byChannel, setByChannel] = useState<Record<string, number>>({});
  const [activeChannel, setActiveChannel] = useState<string>("PORTAL");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/platform/tickets/stats");
    const data = await res.json();
    setByChannel(data.byChannel || {});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = Object.values(byChannel).reduce((a, b) => a + b, 0);
  const activeView = CHANNELS.find((c) => c.key === activeChannel)?.viewId || "elenco";

  return (
    <ServicePremiumSubView
      moduleKey="tickets"
      viewId="canali"
      serviceName="Ticket & Assistenza"
      serviceColor={serviceColor}
      showKpiStrip={false}
    >
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {CHANNELS.map((ch, i) => {
          const count = byChannel[ch.key] ?? 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          const color = CHANNEL_COLORS[ch.key];
          return (
            <Grid key={ch.key} size={{ xs: 12, sm: 6, md: 3 }}>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={ticketKpiHover}>
                <Card
                  sx={[
                    shellPanelSx,
                    {
                      cursor: "pointer",
                      border: activeChannel === ch.key ? `2px solid ${color}` : undefined,
                    },
                  ]}
                  onClick={() => setActiveChannel(ch.key)}
                >
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ch.icon sx={{ color, fontSize: 20 }} />
                      </Box>
                      <Typography sx={{ fontWeight: 700 }}>{CHANNEL_LABELS[ch.key]}</Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.5rem" }}>{loading ? "—" : count}</Typography>
                    <LinearProgress variant="determinate" value={pct} sx={{ mt: 1.5, height: 5, borderRadius: 3, bgcolor: shell.progressTrack, "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 } }} />
                    <Typography variant="caption" color="text.secondary">{pct}% del totale</Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        {CHANNELS.map((ch) => (
          <Chip
            key={ch.key}
            clickable
            icon={<ch.icon sx={{ fontSize: "16px !important" }} />}
            label={CHANNEL_LABELS[ch.key]}
            color={activeChannel === ch.key ? "primary" : "default"}
            onClick={() => setActiveChannel(ch.key)}
          />
        ))}
      </Box>

      <TicketsListView
        viewId={activeView}
        serviceColor={serviceColor}
        onOpenTicket={onOpenTicket}
        onNew={onNew}
        onRefresh={load}
      />
    </ServicePremiumSubView>
  );
}
