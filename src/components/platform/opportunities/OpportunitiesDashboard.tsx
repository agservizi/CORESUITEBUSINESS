"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Typography, Grid, Card, CardContent, Chip, LinearProgress, Stack,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { motion } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";
import AnimatedCounter from "@/components/hub/AnimatedCounter";
import {
  CATEGORY_LABELS, CATEGORY_COLORS, customerLabel, money, statusColor,
  type OpportunityRow,
} from "./opportunities-utils";
import { oppKpiHover } from "./opportunities-motion";
import OpportunitiesHero from "./OpportunitiesHero";
import OpportunitiesLiveFeed from "./OpportunitiesLiveFeed";
import OpportunitiesInsights from "./OpportunitiesInsights";
import OpportunitiesPulseBanner from "./OpportunitiesPulseBanner";

interface StatusDef {
  code: string;
  label: string;
  color: string;
}

interface Stats {
  total: number;
  active: number;
  activated: number;
  cancelled: number;
  winRate: number;
  pipelineCommission: number;
  wonCommission: number;
  totalCommission: number;
  byStatus: Record<string, { count: number; commission: number }>;
  byCategory: Record<string, number>;
  statuses: StatusDef[];
  recent: OpportunityRow[];
}

interface Props {
  serviceColor: string;
  onNavigate: (viewId: string) => void;
  onOpenDetail: (row: OpportunityRow) => void;
  onNew: () => void;
}

export default function OpportunitiesDashboard({ serviceColor, onNavigate, onOpenDetail, onNew }: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthlyPct, setMonthlyPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [statsRes, insightsRes] = await Promise.all([
      fetch("/api/platform/opportunities/stats"),
      fetch("/api/platform/opportunities/insights"),
    ]);
    setStats(await statsRes.json());
    const insights = await insightsRes.json();
    setMonthlyPct(insights.monthlyGoal?.pct ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const es = new EventSource("/api/platform/opportunities/stream");
    esRef.current = es;
    es.addEventListener("pulse", (e) => {
      try {
        const data = JSON.parse(e.data);
        setLiveCount(data.openCount);
      } catch { /* ignore */ }
    });
    es.addEventListener("opportunities", () => load());
    return () => es.close();
  }, [load]);

  const kpis = [
    { label: "Contratti totali", value: stats?.total ?? 0, format: "number" as const, icon: TrendingUpIcon, color: serviceColor, gradient: `linear-gradient(135deg, ${serviceColor} 0%, #7c3aed 100%)` },
    { label: "In pipeline", value: stats?.active ?? 0, format: "number" as const, icon: NotificationsActiveIcon, color: "#6366f1", gradient: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)" },
    { label: "Commissioni attivate", value: stats?.wonCommission ?? 0, format: "currency" as const, icon: EmojiEventsIcon, color: "#10b981", gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)" },
    { label: "Tasso attivazione", value: stats?.winRate ?? 0, format: "number" as const, suffix: "%", icon: AccountBalanceWalletIcon, color: "#f59e0b", gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" },
  ];

  const statusRows = stats?.statuses?.length
    ? stats.statuses
    : Object.keys(stats?.byStatus || {}).map((code) => ({
        code,
        label: code,
        color: statusColor(code),
      }));

  return (
    <Box>
      <OpportunitiesPulseBanner onNavigate={onNavigate} />

      <OpportunitiesHero
        serviceColor={serviceColor}
        liveCount={liveCount}
        winRate={stats?.winRate ?? 0}
        monthlyPct={monthlyPct}
        onNew={onNew}
      />

      <OpportunitiesLiveFeed onRefresh={load} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              whileHover={oppKpiHover}
            >
              <Card sx={[shellPanelSx, { height: "100%", position: "relative", overflow: "hidden" }]}>
                <Box sx={{ position: "absolute", top: -24, right: -24, width: 90, height: 90, borderRadius: "50%", background: `radial-gradient(circle, ${k.color}18 0%, transparent 70%)` }} />
                <CardContent>
                  <Box sx={{ width: 40, height: 40, borderRadius: "10px", background: k.gradient, display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5, boxShadow: `0 4px 14px ${k.color}44` }}>
                    <k.icon sx={{ fontSize: 20, color: "#fff" }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">{k.label}</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", mt: 0.5, lineHeight: 1 }}>
                    {loading ? "—" : (
                      <>
                        <AnimatedCounter value={k.value} format={k.format === "currency" ? "currency" : "number"} />
                        {k.suffix ?? ""}
                      </>
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mb: 3 }}>
        <OpportunitiesInsights serviceColor={serviceColor} onNavigate={onNavigate} onOpenDetail={onOpenDetail} />
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={shellPanelSx}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Typography sx={{ fontWeight: 700 }}>Distribuzione per stato</Typography>
                {liveCount != null && (
                  <Chip size="small" icon={<NotificationsActiveIcon sx={{ fontSize: 14 }} />} label={`${liveCount} attivi`} sx={{ height: 24, fontSize: "0.7rem" }} />
                )}
              </Box>
              <Stack spacing={1.25}>
                {statusRows.map((s) => {
                  const row = stats?.byStatus?.[s.code];
                  const count = row?.count ?? 0;
                  const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0;
                  const col = s.color || statusColor(s.code);
                  return (
                    <Box key={s.code}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography sx={{ fontSize: "0.825rem", fontWeight: 600, color: col }}>{s.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{count} · {money(row?.commission ?? 0)}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, bgcolor: shell.progressTrack, "& .MuiLinearProgress-bar": { bgcolor: col, borderRadius: 3 } }} />
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={[shellPanelSx, { mb: 2 }]}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Attività recente</Typography>
              <Stack spacing={1}>
                {(stats?.recent || []).slice(0, 6).map((r, i) => (
                  <Box
                    key={r.id}
                    component={motion.div}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => onOpenDetail(r)}
                    sx={{ p: 1.25, borderRadius: 2, cursor: "pointer", border: shell.border, "&:hover": { bgcolor: shell.rowHover } }}
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: "0.825rem", fontFamily: "monospace" }} noWrap>{r.code}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {customerLabel(r)} · {r.statusLabel || r.statusCode}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {Object.keys(stats?.byCategory || {}).length > 0 && (
            <Card sx={shellPanelSx}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Per categoria</Typography>
                {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((cat) => {
                  const count = stats?.byCategory?.[cat] ?? 0;
                  if (!count) return null;
                  return (
                    <Box key={cat} sx={{ display: "flex", justifyContent: "space-between", py: 0.75 }}>
                      <Typography sx={{ fontSize: "0.825rem", color: CATEGORY_COLORS[cat], fontWeight: 600 }}>{CATEGORY_LABELS[cat]}</Typography>
                      <Typography sx={{ fontSize: "0.825rem", fontWeight: 700 }}>{count}</Typography>
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
