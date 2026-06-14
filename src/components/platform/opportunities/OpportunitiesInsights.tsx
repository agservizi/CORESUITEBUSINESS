"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip, CircularProgress,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import SpeedIcon from "@mui/icons-material/Speed";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "@mui/material/styles";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";
import AnimatedCounter from "@/components/hub/AnimatedCounter";
import { customerLabel, money, type OpportunityRow } from "./opportunities-utils";
import { hubStaggerContainer, hubFadeUp, oppKpiHover } from "./opportunities-motion";
import OpportunitiesFunnel from "./OpportunitiesFunnel";

interface HotRow extends OpportunityRow {
  score: number;
  daysIdle: number;
}

interface Suggestion {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  body: string;
  action: string;
  viewId: string;
  opportunityId?: string;
}

interface Insights {
  hot: HotRow[];
  stale: OpportunityRow[];
  velocity: number;
  trend: { week: string; commission: number }[];
  funnel: { status: string; label: string; color: string; count: number; commission?: number; pct: number }[];
  monthlyGoal: { target: number; current: number; pct: number };
  suggestions: Suggestion[];
  conversionRate: number;
}

interface Props {
  serviceColor: string;
  onNavigate: (viewId: string) => void;
  onOpenDetail: (row: OpportunityRow) => void;
}

const PRIORITY_COLOR = { high: "#ef4444", medium: "#f59e0b", low: "#6366f1" };

export default function OpportunitiesInsights({ serviceColor, onNavigate, onOpenDetail }: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/platform/opportunities/insights");
    setData(await res.json());
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

  if (!data) return null;

  return (
    <Box component={motion.div} variants={hubStaggerContainer} initial="hidden" animate="show">
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Box component={motion.div} variants={hubFadeUp}>
            <Card sx={[shellPanelSx, { height: "100%", position: "relative", overflow: "hidden" }]}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <SpeedIcon sx={{ color: serviceColor }} />
                  <Typography sx={{ fontWeight: 700 }}>Obiettivo commissioni</Typography>
                </Box>
                <Box sx={{ position: "relative", width: 140, height: 140, mx: "auto", mb: 2 }}>
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={140}
                    thickness={3}
                    sx={{ color: shell.progressTrack, position: "absolute" }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={data.monthlyGoal.pct}
                    size={140}
                    thickness={3}
                    sx={{
                      color: data.monthlyGoal.pct >= 70 ? "#10b981" : serviceColor,
                      position: "absolute",
                      "& .MuiCircularProgress-circle": { strokeLinecap: "round" },
                    }}
                  />
                  <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.5rem" }}>{data.monthlyGoal.pct}%</Typography>
                    <Typography variant="caption" color="text.secondary">del mese</Typography>
                  </Box>
                </Box>
                <Typography sx={{ textAlign: "center", fontSize: "0.85rem" }}>
                  <AnimatedCounter value={data.monthlyGoal.current} format="currency" style={{ fontWeight: 700, color: "#10b981" }} />
                  {" / "}
                  {money(data.monthlyGoal.target)}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Box component={motion.div} variants={hubFadeUp}>
            <Card sx={shellPanelSx}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, mb: 2 }}>Trend commissioni (8 settimane)</Typography>
                <Box sx={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.trend}>
                      <defs>
                        <linearGradient id="oppCommissionGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={serviceColor} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={serviceColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} width={48} />
                      <Tooltip
                        formatter={(v) => [`€${Number(v ?? 0)}`, "Commissioni"]}
                        contentStyle={{ borderRadius: 8, border: shell.border, background: theme.palette.background.paper }}
                      />
                      <Area type="monotone" dataKey="commission" stroke={serviceColor} fill="url(#oppCommissionGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  Velocità media attivazione: {data.velocity > 0 ? `${data.velocity} giorni` : "—"}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {data.funnel.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <OpportunitiesFunnel steps={data.funnel} serviceColor={serviceColor} />
        </Box>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box component={motion.div} variants={hubFadeUp}>
            <Card sx={shellPanelSx}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <LocalFireDepartmentIcon sx={{ color: "#f97316" }} />
                  <Typography sx={{ fontWeight: 700 }}>Contratti caldi</Typography>
                </Box>
                {data.hot.length === 0 ? (
                  <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>Nessun contratto in pipeline</Typography>
                ) : (
                  data.hot.map((h) => (
                    <Box
                      key={h.id}
                      component={motion.div}
                      whileHover={oppKpiHover}
                      onClick={() => onOpenDetail(h)}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        borderRadius: 2,
                        cursor: "pointer",
                        border: `1px solid ${serviceColor}33`,
                        background: `linear-gradient(135deg, ${serviceColor}08 0%, transparent 100%)`,
                        "&:hover": { borderColor: `${serviceColor}66` },
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", fontFamily: "monospace" }} noWrap>{h.code}</Typography>
                        <Chip label={`Score ${h.score}`} size="small" sx={{ height: 22, fontSize: "0.65rem", bgcolor: `${serviceColor}18`, color: serviceColor }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {customerLabel(h)} · {money(h.commission)} · {h.daysIdle}g inattivo
                      </Typography>
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box component={motion.div} variants={hubFadeUp}>
            <Card sx={shellPanelSx}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <AutoAwesomeIcon sx={{ color: "#eab308" }} />
                  <Typography sx={{ fontWeight: 700 }}>Prossime azioni consigliate</Typography>
                </Box>
                {data.suggestions.length === 0 ? (
                  <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>Tutto sotto controllo</Typography>
                ) : (
                  data.suggestions.map((s) => (
                    <Box
                      key={s.id}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        borderRadius: 2,
                        border: shell.border,
                        borderLeft: `3px solid ${PRIORITY_COLOR[s.priority]}`,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{s.title}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>{s.body}</Typography>
                      <Button
                        size="small"
                        onClick={() => onNavigate(s.viewId)}
                        sx={{ color: serviceColor, fontWeight: 600, p: 0, minWidth: 0 }}
                      >
                        {s.action} →
                      </Button>
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
