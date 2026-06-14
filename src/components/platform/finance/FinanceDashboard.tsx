"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Grid, Paper, Chip, Alert, ToggleButton, ToggleButtonGroup,
  LinearProgress, Stack, Button, alpha, Card, CardActionArea, CardContent,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import SavingsIcon from "@mui/icons-material/Savings";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AddIcon from "@mui/icons-material/Add";
import AssessmentIcon from "@mui/icons-material/Assessment";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Legend,
} from "recharts";
import { chartAxisTick, chartTooltipStyle, getShellTokens, shellPanelSx } from "@/theme/shell-tokens";
import FinanceHero from "./FinanceHero";
import FinanceLiveFeed from "./FinanceLiveFeed";
import FinanceInsights from "./FinanceInsights";
import FinanceStatCard from "./FinanceStatCard";
import AiSparkButton from "@/components/ai/AiSparkButton";
import { FINANCE_COLORS, money } from "./finance-utils";

interface DashboardData {
  period: string;
  kpis: {
    totalEntrate: number;
    totalUscite: number;
    saldoNetto: number;
    margineTotale: number;
    expressShare: number;
    pendingCount: number;
    pendingAmount: number;
    overdueCount: number;
    todayNetto: number;
    todayEntrate: number;
    expressSalesTotal: number;
  };
  byMethod: { method: string; entrate: number; uscite: number; netto: number }[];
  trend: { label: string; entrate: number; uscite: number; netto: number }[];
  session: { status: string } | null;
  recentMovements: {
    id: string;
    type: string;
    description: string;
    amount: number;
    method: string;
    createdAt: string;
    expressSaleId?: string | null;
  }[];
}

interface InsightData {
  suggestions: { id: string; severity: "info" | "warning" | "success"; title: string; body: string; link?: string }[];
}

interface Props {
  serviceColor: string;
  onNavigate: (viewId: string) => void;
  onOpenMovement?: (id: string) => void;
}

const QUICK_ACTIONS = [
  { id: "giornata", label: "Giornata cassa", icon: AccountBalanceWalletIcon, color: FINANCE_COLORS.cash },
  { id: "nuovo", label: "Nuovo movimento", icon: AddIcon, color: FINANCE_COLORS.entrate },
  { id: "scadenze", label: "Scadenze", icon: EventBusyIcon, color: FINANCE_COLORS.pending },
  { id: "report", label: "Report periodo", icon: AssessmentIcon, color: FINANCE_COLORS.card },
];

export default function FinanceDashboard({ serviceColor, onNavigate, onOpenMovement }: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const axisTick = chartAxisTick(theme);
  const chartTooltip = chartTooltipStyle(theme);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("month");
  const [data, setData] = useState<DashboardData | null>(null);
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashRes, insRes] = await Promise.all([
        fetch(`/api/platform/entrate-uscite/dashboard?period=${period}`),
        fetch("/api/platform/entrate-uscite/insights"),
      ]);
      const dash = await dashRes.json();
      const ins = await insRes.json();
      if (!dashRes.ok) throw new Error(dash.error || "Errore dashboard");
      setData(dash);
      setInsights(ins);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const [liveEvents, setLiveEvents] = useState<DashboardData["recentMovements"]>([]);

  useEffect(() => {
    if (!data?.recentMovements) return;
    setLiveEvents(data.recentMovements);
  }, [data?.recentMovements]);

  useEffect(() => {
    const es = new EventSource("/api/platform/entrate-uscite/stream");
    es.addEventListener("movements", (ev) => {
      try {
        const payload = JSON.parse((ev as MessageEvent).data) as { items: DashboardData["recentMovements"] };
        if (payload.items?.length) {
          setLiveEvents((prev) => {
            const merged = [...payload.items, ...prev];
            const seen = new Set<string>();
            return merged.filter((m) => {
              if (seen.has(m.id)) return false;
              seen.add(m.id);
              return true;
            }).slice(0, 12);
          });
        }
      } catch { /* ignore */ }
    });
    return () => es.close();
  }, []);

  const sessionStatus: "OPEN" | "CLOSED" | "NONE" =
    data?.session?.status === "OPEN"
      ? "OPEN"
      : data?.session?.status === "CLOSED"
        ? "CLOSED"
        : "NONE";

  const periodToggle = (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={period}
      onChange={(_, v) => v && setPeriod(v)}
      sx={{
        bgcolor: "rgba(255,255,255,0.15)",
        backdropFilter: "blur(8px)",
        "& .MuiToggleButton-root": { color: "#fff", border: 0, px: 1.5, fontSize: "0.75rem", fontWeight: 600 },
        "& .Mui-selected": { bgcolor: "rgba(255,255,255,0.28) !important" },
      }}
    >
      <ToggleButton value="day">Oggi</ToggleButton>
      <ToggleButton value="week">Settimana</ToggleButton>
      <ToggleButton value="month">Mese</ToggleButton>
      <ToggleButton value="year">Anno</ToggleButton>
    </ToggleButtonGroup>
  );

  if (loading && !data) {
    return <LinearProgress sx={{ mb: 2, borderRadius: 1, "& .MuiLinearProgress-bar": { bgcolor: serviceColor } }} />;
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {data && (
        <>
          <FinanceHero
            serviceColor={serviceColor}
            saldoNetto={data.kpis.saldoNetto}
            todayNetto={data.kpis.todayNetto}
            sessionStatus={sessionStatus}
            pendingCount={data.kpis.pendingCount}
            onOpenDay={() => onNavigate("giornata")}
            toolbar={
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <AiSparkButton scope="finance" action="briefing" label="Briefing AI" inline={false} color="#fff" />
                {periodToggle}
              </Box>
            }
          />

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: "Entrate", value: money(data.kpis.totalEntrate), sub: `Oggi ${money(data.kpis.todayEntrate)}`, icon: TrendingUpIcon, color: FINANCE_COLORS.entrate },
              { label: "Uscite", value: money(data.kpis.totalUscite), icon: TrendingDownIcon, color: FINANCE_COLORS.uscite },
              { label: "Margine", value: money(data.kpis.margineTotale), icon: SavingsIcon, color: serviceColor },
              { label: "In sospeso", value: String(data.kpis.pendingCount), sub: money(data.kpis.pendingAmount), icon: PendingActionsIcon, color: FINANCE_COLORS.pending },
              { label: "Express", value: `${data.kpis.expressShare}%`, sub: money(data.kpis.expressSalesTotal), icon: PointOfSaleIcon, color: FINANCE_COLORS.express },
              { label: "Scaduti", value: String(data.kpis.overdueCount), icon: EventBusyIcon, color: FINANCE_COLORS.overdue },
            ].map((kpi, i) => (
              <Grid key={kpi.label} size={{ xs: 6, md: 4, lg: 2 }}>
                <FinanceStatCard {...kpi} delay={i * 0.05} />
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Paper sx={[shellPanelSx, { p: 2.5, border: `1px solid ${alpha(serviceColor, 0.12)}` }]}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography sx={{ fontWeight: 700 }}>Trend 7 giorni</Typography>
                  <Chip label="Entrate · Uscite · Netto" size="small" sx={{ height: 22, fontSize: "0.65rem" }} />
                </Box>
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.trend}>
                      <defs>
                        <linearGradient id="financeEntrate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={FINANCE_COLORS.entrate} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={FINANCE_COLORS.entrate} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="financeUscite" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={FINANCE_COLORS.uscite} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={FINANCE_COLORS.uscite} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="financeNet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={serviceColor} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={serviceColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={shell.borderColor} />
                      <XAxis dataKey="label" tick={axisTick} />
                      <YAxis tick={axisTick} tickFormatter={(v) => `€${v}`} width={48} />
                      <Tooltip contentStyle={chartTooltip} formatter={(v) => money(Number(v ?? 0))} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="entrate" stroke={FINANCE_COLORS.entrate} fill="url(#financeEntrate)" strokeWidth={2} name="Entrate" />
                      <Area type="monotone" dataKey="uscite" stroke={FINANCE_COLORS.uscite} fill="url(#financeUscite)" strokeWidth={2} name="Uscite" />
                      <Area type="monotone" dataKey="netto" stroke={serviceColor} fill="url(#financeNet)" strokeWidth={2.5} name="Netto" strokeDasharray="4 2" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Paper sx={[shellPanelSx, { p: 2.5, height: "100%", border: `1px solid ${alpha(serviceColor, 0.12)}` }]}>
                <Typography sx={{ fontWeight: 700, mb: 2 }}>Per metodo</Typography>
                <Box sx={{ height: 280 }}>
                  {data.byMethod.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: "center" }}>
                      <Typography variant="caption" color="text.secondary">Nessun dato nel periodo</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.byMethod.slice(0, 6)} layout="vertical" barGap={2}>
                        <XAxis type="number" tick={axisTick} hide />
                        <YAxis type="category" dataKey="method" tick={axisTick} width={76} />
                        <Tooltip contentStyle={chartTooltip} formatter={(v) => money(Number(v ?? 0))} />
                        <Bar dataKey="entrate" fill={FINANCE_COLORS.entrate} name="Entrate" radius={[0, 6, 6, 0]} />
                        <Bar dataKey="uscite" fill={FINANCE_COLORS.uscite} name="Uscite" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FinanceLiveFeed events={liveEvents.length ? liveEvents : data.recentMovements} serviceColor={serviceColor} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              {insights && <FinanceInsights suggestions={insights.suggestions} />}
            </Grid>
          </Grid>

          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Azioni rapide</Typography>
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {QUICK_ACTIONS.map((action) => (
              <Grid key={action.id} size={{ xs: 6, sm: 3 }}>
                <Card
                  variant="outlined"
                  sx={{
                    borderColor: alpha(action.color, 0.25),
                    background: `linear-gradient(145deg, ${alpha(action.color, 0.08)} 0%, transparent 70%)`,
                  }}
                >
                  <CardActionArea onClick={() => onNavigate(action.id)} sx={{ p: 0 }}>
                    <CardContent sx={{ py: 2, textAlign: "center" }}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          mx: "auto",
                          mb: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: alpha(action.color, 0.15),
                        }}
                      >
                        <action.icon sx={{ color: action.color }} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{action.label}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {data.recentMovements.length > 0 && (
            <Paper sx={[shellPanelSx, { p: 2, border: `1px solid ${alpha(serviceColor, 0.1)}` }]}>
              <Typography sx={{ fontWeight: 700, mb: 1.5, fontSize: "0.9rem" }}>Ultimi movimenti</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                {data.recentMovements.slice(0, 8).map((m) => (
                  <Chip
                    key={m.id}
                    label={`${m.type === "ENTRATA" ? "+" : "-"}${money(m.amount)} · ${m.description.slice(0, 22)}${m.description.length > 22 ? "…" : ""}`}
                    size="small"
                    onClick={() => onOpenMovement?.(m.id)}
                    sx={{
                      cursor: onOpenMovement ? "pointer" : "default",
                      fontWeight: 600,
                      bgcolor: alpha(m.type === "ENTRATA" ? FINANCE_COLORS.entrate : FINANCE_COLORS.uscite, 0.12),
                      border: `1px solid ${alpha(m.type === "ENTRATA" ? FINANCE_COLORS.entrate : FINANCE_COLORS.uscite, 0.25)}`,
                      "&:hover": onOpenMovement ? { bgcolor: alpha(m.type === "ENTRATA" ? FINANCE_COLORS.entrate : FINANCE_COLORS.uscite, 0.2) } : {},
                    }}
                  />
                ))}
              </Stack>
              <Button size="small" sx={{ mt: 1.5 }} onClick={() => onNavigate("elenco")}>
                Vedi tutti i movimenti →
              </Button>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
