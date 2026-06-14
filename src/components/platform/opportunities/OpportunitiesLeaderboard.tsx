"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Card, CardContent, Grid, CircularProgress, Avatar, LinearProgress,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { motion } from "framer-motion";
import { shellPanelSx } from "@/theme/shell-tokens";
import AnimatedCounter from "@/components/hub/AnimatedCounter";
import { money } from "./opportunities-utils";

interface LeaderRow {
  collaboratorId: string;
  name: string;
  email?: string;
  opportunities: number;
  totalCommission: number;
}

interface Props {
  serviceColor: string;
}

const MEDALS = ["#eab308", "#94a3b8", "#cd7f32"];

export default function OpportunitiesLeaderboard({ serviceColor }: Props) {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [monthKey, setMonthKey] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/platform/opportunities/report?mode=collaborators");
    const data = await res.json();
    setRows(data.rows || []);
    setMonthKey(data.month || "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const maxCommission = Math.max(...rows.map((r) => r.totalCommission), 1);
  const top3 = rows.slice(0, 3);

  if (loading) {
    return <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}><CircularProgress sx={{ color: serviceColor }} /></Box>;
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.5rem" }}>Classifica collaboratori</Typography>
        <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
          Commissioni del mese {monthKey || "corrente"} · contratti attivi e attivati
        </Typography>
      </Box>

      {top3.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {top3.map((row, i) => (
            <Grid key={row.collaboratorId} size={{ xs: 12, md: 4 }}>
              <Box component={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card sx={[shellPanelSx, {
                  height: "100%",
                  borderTop: `3px solid ${MEDALS[i] || serviceColor}`,
                  background: i === 0 ? `linear-gradient(180deg, ${serviceColor}12 0%, transparent 100%)` : undefined,
                }]}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                      <Avatar sx={{ bgcolor: MEDALS[i] || serviceColor, width: 40, height: 40 }}>
                        {i === 0 ? <EmojiEventsIcon /> : `#${i + 1}`}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700 }} noWrap>{row.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.opportunities} contratti</Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", color: "#10b981" }}>
                      <AnimatedCounter value={row.totalCommission} format="currency" />
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      <Card sx={shellPanelSx}>
        <CardContent>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>Tutti i collaboratori</Typography>
          {rows.length === 0 ? (
            <Typography color="text.secondary">Nessun dato per questo mese</Typography>
          ) : (
            rows.map((row, i) => (
              <Box key={row.collaboratorId} sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    #{i + 1} {row.name}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: "#10b981", fontSize: "0.875rem" }}>
                    {money(row.totalCommission)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.round((row.totalCommission / maxCommission) * 100)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: "action.hover",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 4,
                      background: `linear-gradient(90deg, ${serviceColor}, #10b981)`,
                    },
                  }}
                />
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
