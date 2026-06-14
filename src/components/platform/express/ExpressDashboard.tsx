"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  Stack,
  Button,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import SimCardIcon from "@mui/icons-material/SimCard";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type DashboardData,
  EXPRESS_GRADIENT,
  formatRecentSaleLabel,
  money,
  statusColor,
} from "./express-utils";
import { readJsonResponse } from "@/lib/fetch-client";
import { chartAxisTick, chartTooltipStyle, getShellTokens } from "@/theme/shell-tokens";

interface Props {
  serviceColor: string;
  onOpenSale: (id: string) => void;
  onNavigatePos: () => void;
  onNavigateView?: (viewId: string) => void;
}

const MotionCard = motion.create(Card);

interface LeaderboardRow {
  userId: string;
  name: string;
  count: number;
  revenue: number;
}

interface PredictiveData {
  operators: {
    id: string;
    name: string;
    currentStock: number;
    threshold: number;
    suggestedReorder: number;
    daysCover: number | null;
    riskLevel: string;
  }[];
  products: {
    id: string;
    name: string;
    stockQty: number;
    threshold: number;
    suggestedReorder: number;
  }[];
}

interface LiveEvent {
  id: string;
  kind: "sale" | "request";
  label: string;
  at: string;
}

export default function ExpressDashboard({ serviceColor, onOpenSale, onNavigatePos, onNavigateView }: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const axisTick = chartAxisTick(theme);
  const chartTooltip = chartTooltipStyle(theme);
  const [period, setPeriod] = useState<"day" | "month" | "year">("day");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [predictive, setPredictive] = useState<PredictiveData | null>(null);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [liveStock, setLiveStock] = useState<number | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`/api/platform/express?view=dashboard&period=${period}`, {
        credentials: "include",
      });
      const json = await readJsonResponse<DashboardData & { error?: string }>(res);
      if (!json) {
        throw new Error(res.ok ? "Risposta vuota dal server" : `Errore ${res.status}`);
      }
      if (!res.ok) {
        throw new Error(json.error || `Errore ${res.status}`);
      }
      setData(json);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Errore caricamento dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const lbPeriod = period === "year" ? "month" : period === "month" ? "month" : "day";
    Promise.all([
      fetch(`/api/platform/express?view=staff-leaderboard&period=${lbPeriod}`, { credentials: "include" }).then(
        (r) => r.json()
      ),
      fetch("/api/platform/express?view=predictive-reorder", { credentials: "include" }).then((r) => r.json()),
    ]).then(([lb, pred]) => {
      setLeaderboard(lb.items || []);
      setPredictive(pred);
    });
  }, [period, data?.kpis.periodSales]);

  useEffect(() => {
    const es = new EventSource("/api/platform/express/stream");
    es.addEventListener("sales", (ev) => {
      const payload = JSON.parse((ev as MessageEvent).data) as {
        items: { id: string; total: number; client?: string; soldAt: string }[];
      };
      setLiveEvents((prev) => [
        ...payload.items.map((s) => ({
          id: s.id,
          kind: "sale" as const,
          label: `Vendita ${money(s.total)}${s.client ? ` · ${s.client}` : ""}`,
          at: s.soldAt,
        })),
        ...prev,
      ].slice(0, 8));
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => load(), 1200);
    });
    es.addEventListener("requests", (ev) => {
      const payload = JSON.parse((ev as MessageEvent).data) as {
        items: { id: string; title: string; client?: string; createdAt: string }[];
      };
      setLiveEvents((prev) => [
        ...payload.items.map((r) => ({
          id: r.id,
          kind: "request" as const,
          label: `Richiesta: ${r.title}${r.client ? ` · ${r.client}` : ""}`,
          at: r.createdAt,
        })),
        ...prev,
      ].slice(0, 8));
    });
    es.addEventListener("pulse", (ev) => {
      const payload = JSON.parse((ev as MessageEvent).data) as { iccidInStock: number };
      setLiveStock(payload.iccidInStock);
    });
    es.onerror = () => es.close();
    return () => {
      es.close();
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, [load]);

  if (!data && loading) {
    return <LinearProgress sx={{ borderRadius: 1 }} />;
  }

  if (loadError && !data) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {loadError}
      </Alert>
    );
  }

  if (!data) return null;

  const hasPayments = Boolean(data.paymentBreakdown?.length);
  const hasOperatorSales = Boolean(data.operatorBreakdown?.length);
  const hasRecentSales = Boolean(data.recentSales?.length);
  const breakdownCount = [hasPayments, hasOperatorSales, hasRecentSales].filter(Boolean).length;
  const middleWidgetCount = breakdownCount + 2; // + classifica + riordino predittivo

  const breakdownGridSize =
    middleWidgetCount === 3
      ? { xs: 12, md: 4 }
      : middleWidgetCount === 4
        ? { xs: 12, sm: 6, lg: 3 }
        : { xs: 12, md: 4 };

  /** Classifica e riordino: metà riga se sopra ci sono già 3 card breakdown. */
  const sideGridSize =
    breakdownCount === 0
      ? { xs: 12, md: 6 }
      : middleWidgetCount === 3
        ? { xs: 12, md: 4 }
        : { xs: 12, md: 6 };

  const kpis = [
    {
      icon: PointOfSaleIcon,
      label: period === "day" ? "Vendite oggi" : period === "month" ? "Vendite mese" : "Vendite anno",
      value: data.kpis.periodSales ?? data.kpis.salesToday,
      sub: money(data.kpis.periodRevenue ?? 0),
    },
    {
      icon: TrendingUpIcon,
      label: "Incasso mese",
      value: money(data.kpis.revenueMonth),
      sub: `${data.kpis.salesMonthCount} vendite`,
    },
    {
      icon: SimCardIcon,
      label: "SIM disponibili",
      value: data.kpis.iccidInStock,
      sub: `${data.kpis.iccidSold ?? 0} vendute · ${data.kpis.iccidTotal ?? 0} totali`,
    },
    {
      icon: LocalOfferIcon,
      label: "Offerte attive",
      value: data.kpis.offersActive,
      sub: `${data.kpis.operatorsCount} operatori`,
    },
  ];

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 3,
          background: EXPRESS_GRADIENT,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.25) 0%, transparent 50%)",
          }}
        />
        <Box sx={{ position: "relative", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.9, letterSpacing: 2 }}>
              Command center
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "1.75rem", mb: 0.5 }}>
              Express Telefonia
            </Typography>
            <Typography sx={{ opacity: 0.9, maxWidth: 480 }}>
              Vendite, stock SIM e performance operatori in tempo reale — collegato al database operativo.
            </Typography>
          </Box>
          <ToggleButtonGroup
            size="small"
            value={period}
            exclusive
            onChange={(_, v) => v && setPeriod(v)}
            sx={{
              bgcolor: "rgba(255,255,255,0.15)",
              "& .MuiToggleButton-root": { color: "#fff", border: 0, px: 2 },
              "& .Mui-selected": { bgcolor: "rgba(255,255,255,0.3) !important" },
            }}
          >
            <ToggleButton value="day">Giorno</ToggleButton>
            <ToggleButton value="month">Mese</ToggleButton>
            <ToggleButton value="year">Anno</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {liveEvents.length > 0 && (
        <Alert
          icon={<NotificationsActiveIcon />}
          severity="info"
          sx={{ mb: 2 }}
          action={
            liveStock != null ? (
              <Chip size="small" label={`SIM live: ${liveStock}`} sx={{ fontWeight: 600 }} />
            ) : undefined
          }
        >
          <Stack spacing={0.5}>
            {liveEvents.slice(0, 3).map((ev) => (
              <Typography key={`${ev.kind}-${ev.id}`} variant="body2">
                {ev.label} · {new Date(ev.at).toLocaleTimeString("it-IT")}
              </Typography>
            ))}
          </Stack>
        </Alert>
      )}

      {data.operatorAlerts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Stock SIM sotto soglia:{" "}
          {data.operatorAlerts
            .map((a) => `${a.name} (${a.inStock}/${a.threshold}${a.suggestedReorder ? ` · riordina ${a.suggestedReorder}` : ""})`)
            .join(" · ")}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((kpi, i) => (
          <Grid key={kpi.label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <MotionCard
              variant="outlined"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              sx={{
                height: "100%",
                borderColor: alpha(serviceColor, 0.25),
                background: `linear-gradient(145deg, ${alpha(serviceColor, 0.06)} 0%, transparent 70%)`,
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <kpi.icon sx={{ color: serviceColor, fontSize: 22 }} />
                  <Typography variant="caption" color="text.secondary">
                    {kpi.label}
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: "1.6rem", lineHeight: 1.1 }}>
                  {kpi.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {kpi.sub}
                </Typography>
              </CardContent>
            </MotionCard>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Trend vendite · 7 giorni</Typography>
              <Box sx={{ height: 220, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={220} minWidth={0}>
                  <AreaChart data={data.salesTrend || []}>
                    <defs>
                      <linearGradient id="expressRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={serviceColor} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={serviceColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={shell.gridLine} />
                    <XAxis dataKey="label" tick={axisTick} />
                    <YAxis tick={axisTick} width={40} />
                    <Tooltip
                      contentStyle={chartTooltip}
                      formatter={(v, name) =>
                        name === "revenue" ? money(Number(v ?? 0)) : Number(v ?? 0)
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={serviceColor}
                      fill="url(#expressRev)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Azioni consigliate</Typography>
              <Stack spacing={1}>
                {(data.nextSteps || []).map((step, i) => (
                  <Box
                    key={i}
                    onClick={() => step.action && onNavigateView?.(step.action)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor:
                        step.severity === "critical"
                          ? "error.light"
                          : step.severity === "warning"
                            ? "warning.light"
                            : "divider",
                      bgcolor:
                        step.severity === "critical"
                          ? alpha("#ef4444", 0.06)
                          : step.severity === "warning"
                            ? alpha("#f59e0b", 0.06)
                            : "action.hover",
                      cursor: step.action ? "pointer" : "default",
                      "&:hover": step.action ? { opacity: 0.85 } : undefined,
                    }}
                  >
                    <Typography variant="body2">{step.label}</Typography>
                  </Box>
                ))}
                <Chip
                  label="Apri cassa POS"
                  clickable
                  onClick={onNavigatePos}
                  sx={{ mt: 1, bgcolor: serviceColor, color: "#fff", fontWeight: 600 }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {hasPayments && (
          <Grid size={breakdownGridSize}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, mb: 2 }}>Pagamenti</Typography>
                <Stack spacing={1}>
                  {data.paymentBreakdown!.map((p) => (
                    <Box key={p.method} sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2">{p.method}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {p.count} · {money(p.total)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
        {hasOperatorSales && (
          <Grid size={breakdownGridSize}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, mb: 2 }}>Vendite per operatore</Typography>
                <Stack spacing={1}>
                  {data.operatorBreakdown!.slice(0, 6).map((op) => (
                    <Box key={op.name} sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2">{op.name}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {op.count} · {money(op.total)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
        {hasRecentSales && (
          <Grid size={breakdownGridSize}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, mb: 2 }}>Ultime vendite</Typography>
                <Stack spacing={1}>
                  {data.recentSales!.slice(0, 6).map((s) => (
                    <Box
                      key={s.id}
                      onClick={() => onOpenSale(s.id)}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 1,
                        cursor: "pointer",
                        py: 0.5,
                        "&:hover": { opacity: 0.8 },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {s.summary ?? formatRecentSaleLabel(s)}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                        {money(s.total)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid size={sideGridSize}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <EmojiEventsIcon sx={{ color: serviceColor }} />
                <Typography sx={{ fontWeight: 700 }}>Classifica operatori</Typography>
              </Box>
              {leaderboard.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nessuna vendita nel periodo selezionato.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {leaderboard.slice(0, 6).map((row, i) => (
                    <Box
                      key={row.userId}
                      sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <Chip
                          size="small"
                          label={`#${i + 1}`}
                          sx={{
                            minWidth: 36,
                            fontWeight: 700,
                            bgcolor: i === 0 ? alpha(serviceColor, 0.2) : undefined,
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                          {row.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
                        {row.count} · {money(row.revenue)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={sideGridSize}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Riordino predittivo</Typography>
              {!predictive?.operators?.length && !predictive?.products?.length ? (
                <Typography variant="body2" color="text.secondary">
                  Stock e prodotti entro le soglie — nessuna azione urgente.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {(predictive?.operators || []).slice(0, 4).map((op) => (
                    <Box
                      key={op.id}
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: op.riskLevel === "critical" ? "error.light" : "warning.light",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {op.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {op.currentStock} SIM · copertura {op.daysCover ?? "—"} gg · riordina {op.suggestedReorder}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => onNavigateView?.("magazzino")}
                        sx={{ flexShrink: 0 }}
                      >
                        Magazzino
                      </Button>
                    </Box>
                  ))}
                  {(predictive?.products || []).slice(0, 3).map((p) => (
                    <Box
                      key={p.id}
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {p.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Stock {p.stockQty}/{p.threshold} · suggerito +{p.suggestedReorder}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => onNavigateView?.("prodotti")}
                        sx={{ flexShrink: 0 }}
                      >
                        Prodotti
                      </Button>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Intelligence operatori</Typography>
              <Stack spacing={1.5}>
                {(data.providerInsights || []).slice(0, 6).map((op) => (
                  <Box key={op.id}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {op.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${op.currentStock} SIM`}
                        color={
                          op.riskLevel === "critical"
                            ? "error"
                            : op.riskLevel === "warning"
                              ? "warning"
                              : "default"
                        }
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (op.currentStock / Math.max(op.threshold, 1)) * 100)}
                      color={op.belowThreshold ? "warning" : "primary"}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Copertura {op.daysCover ?? "—"} gg · media {op.averageDailySales}/gg
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Timeline operativa</Typography>
              <Stack spacing={1}>
                {(data.operatorActivity || []).slice(0, 8).map((ev) => (
                  <Box
                    key={ev.id}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 0.75,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      cursor: "pointer",
                    }}
                    onClick={() => onOpenSale(ev.id)}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Vendita #{ev.saleId} · {money(ev.total)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ev.user || "Operatore"} · {ev.paymentMethod} ·{" "}
                        {new Date(ev.createdAt).toLocaleString("it-IT")}
                      </Typography>
                    </Box>
                    <Chip label={ev.status} size="small" color={statusColor(ev.status)} />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {(data.campaignPerformance?.length || data.stockAlerts?.length || data.productInsights?.length) ? (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {data.campaignPerformance && data.campaignPerformance.length > 0 && (
            <Grid
              size={
                data.stockAlerts?.length
                  ? { xs: 12, lg: 6 }
                  : { xs: 12 }
              }
            >
              <Card variant="outlined">
                <CardContent>
                  <Typography sx={{ fontWeight: 700, mb: 2 }}>Performance campagne</Typography>
                  <Box component="table" sx={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
                    <Box component="thead">
                      <Box component="tr" sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                        <Box component="th" sx={{ textAlign: "left", py: 0.75 }}>Campagna</Box>
                        <Box component="th" sx={{ textAlign: "right", py: 0.75 }}>Vendite</Box>
                        <Box component="th" sx={{ textAlign: "right", py: 0.75 }}>Sconto</Box>
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {data.campaignPerformance.map((c) => (
                        <Box component="tr" key={c.id} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                          <Box component="td" sx={{ py: 0.75 }}>
                            {c.name}
                            <Chip
                              label={c.active ? "Attiva" : "Off"}
                              size="small"
                              sx={{ ml: 1 }}
                              color={c.active ? "success" : "default"}
                            />
                          </Box>
                          <Box component="td" sx={{ textAlign: "right", py: 0.75 }}>{c.salesCount}</Box>
                          <Box component="td" sx={{ textAlign: "right", py: 0.75 }}>{money(c.discountGiven)}</Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {data.stockAlerts && data.stockAlerts.length > 0 && (
            <Grid
              size={
                data.campaignPerformance?.length
                  ? { xs: 12, lg: 6 }
                  : { xs: 12 }
              }
            >
              <Card variant="outlined">
                <CardContent>
                  <Typography sx={{ fontWeight: 700, mb: 2 }}>Alert stock aperti</Typography>
                  <Stack spacing={1}>
                    {data.stockAlerts.map((alert) => (
                      <Alert key={alert.id} severity="warning" sx={{ py: 0.5 }}>
                        {alert.message}
                      </Alert>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          {data.productInsights && data.productInsights.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Typography sx={{ fontWeight: 700, mb: 1.5, px: 0.5 }}>Insight prodotti</Typography>
              <Grid container spacing={2}>
                {data.productInsights.slice(0, 6).map((p) => (
                  <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderColor: p.belowThreshold ? "warning.main" : alpha(serviceColor, 0.25),
                      }}
                    >
                      <CardContent>
                        <Typography sx={{ fontWeight: 700 }}>{p.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Stock {p.currentStock}
                          {p.threshold > 0 && ` · soglia ${p.threshold}`}
                        </Typography>
                        <Typography sx={{ fontWeight: 700, color: serviceColor, mt: 0.5 }}>
                          {money(p.price)}
                        </Typography>
                        {p.belowThreshold && (
                          <Chip label="Sotto soglia" size="small" color="warning" sx={{ mt: 1 }} />
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          )}
        </Grid>
      ) : null}
    </Box>
  );
}
