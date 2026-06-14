"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Alert,
  Stack,
  alpha,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import TimelineIcon from "@mui/icons-material/Timeline";
import { money } from "./express-utils";

interface ClientInsight {
  id: string;
  name: string;
  morosityScore: string;
  morosityFlag: boolean;
  phone?: string | null;
  portalActive?: boolean;
  simHistory: { number?: string | null; iccid?: string }[];
  stats: { totalSales: number; lifetimeSpend: number };
}

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  amount?: number;
  status: string;
  at: string;
  actor?: string | null;
}

interface Props {
  clientId: string;
  serviceColor: string;
}

export default function ExpressClientInsightPanel({ clientId, serviceColor }: Props) {
  const [insight, setInsight] = useState<ClientInsight | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (!clientId) {
      setInsight(null);
      setTimeline([]);
      return;
    }

    async function load() {
      const [profileRes, tRes] = await Promise.all([
        fetch(`/api/platform/express?view=client-profile&clientId=${clientId}`, {
          credentials: "include",
        }),
        fetch(`/api/platform/express?view=client-timeline&clientId=${clientId}`, {
          credentials: "include",
        }),
      ]);
      const profileData = await profileRes.json();
      const tData = await tRes.json();
      if (profileData.client) setInsight(profileData.client);
      setTimeline(tData.items || []);
    }
    load();
  }, [clientId]);

  if (!clientId) return null;

  const morosityColor =
    insight?.morosityScore === "BLOCCATO"
      ? "error"
      : insight?.morosityScore === "ATTENZIONE"
        ? "warning"
        : "success";

  return (
    <Card variant="outlined" sx={{ mb: 2, borderColor: alpha(serviceColor, 0.35) }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <PersonIcon sx={{ color: serviceColor }} />
          <Typography sx={{ fontWeight: 700 }}>Profilo cliente</Typography>
        </Box>

        {insight?.morosityScore === "BLOCCATO" && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            Cliente bloccato per morosità — vendita non consentita
          </Alert>
        )}

        {insight && (
          <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap" }}>
            <Chip label={`Morosità: ${insight.morosityScore}`} size="small" color={morosityColor} />
            {insight.phone && <Chip label={insight.phone} size="small" variant="outlined" />}
            {insight.portalActive && <Chip label="Portale attivo" size="small" color="info" />}
            <Chip label={`${insight.stats.totalSales} vendite`} size="small" />
            <Chip label={money(insight.stats.lifetimeSpend)} size="small" />
          </Stack>
        )}

        {timeline.length > 0 && (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
              <TimelineIcon fontSize="small" color="action" />
              <Typography variant="subtitle2">Timeline unificata</Typography>
            </Box>
            {timeline.slice(0, 5).map((ev) => (
              <Box key={`${ev.type}-${ev.id}`} sx={{ py: 0.5, borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {ev.type === "sale" ? "Vendita" : "Richiesta"} · {ev.title.slice(0, 60)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(ev.at).toLocaleString("it-IT")}
                  {ev.amount != null ? ` · ${money(ev.amount)}` : ""}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
