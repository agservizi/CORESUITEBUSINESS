"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Grid, Paper, CircularProgress, Alert, Button, Stack } from "@mui/material";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { chartTooltipStyle, chartAxisTick, getShellTokens, shellPaperSx } from "@/theme/shell-tokens";
import AiSparkButton from "@/components/ai/AiSparkButton";
import { getPlatformService } from "@/config/platform-services";
import ServiceViewHero from "./service-shell/ServiceViewHero";
import ServiceStatCard, { kpiIconForIndex } from "./service-shell/ServiceStatCard";
import ServicePremiumSubView from "./service-shell/ServicePremiumSubView";
import { getServiceViewTheme } from "./service-shell/service-view-themes";
import { hubStaggerContainer, hubFadeUpSoft } from "@/lib/hub-motion";

interface KpiData {
  openTickets: number;
  todayAppointments: number;
  pendingPractices: number;
  openShipments: number;
  pendingPackages: number;
  activeClients: number;
  openDeals: number;
  pendingMovements: number;
}

interface ChartData {
  revenueTrend: { month: string; revenue: number }[];
  moduleStats: { module: string; count: number; color: string }[];
}

const KPI_CARDS: { key: keyof KpiData; label: string; color: string }[] = [
  { key: "openTickets", label: "Ticket aperti", color: "#0ea5e9" },
  { key: "todayAppointments", label: "Appuntamenti oggi", color: "#10b981" },
  { key: "pendingPractices", label: "Pratiche in corso", color: "#f59e0b" },
  { key: "openShipments", label: "Spedizioni attive", color: "#ef4444" },
  { key: "pendingPackages", label: "Pacchi in attesa", color: "#f97316" },
  { key: "activeClients", label: "Clienti attivi", color: "#6366f1" },
  { key: "openDeals", label: "Deal aperti", color: "#8b5cf6" },
  { key: "pendingMovements", label: "Movimenti pendenti", color: "#22c55e" },
];

const OPERATIONS_COLOR = "#6366f1";

export default function OperationsDashboardView({ viewId }: { viewId: string }) {
  const theme = useTheme();
  const t = getShellTokens(theme);
  const tooltip = chartTooltipStyle(theme);
  const axisTick = chartAxisTick(theme);
  const axisTickSm = chartAxisTick(theme, 11);
  const service = getPlatformService("operations");
  const viewTheme = getServiceViewTheme(
    "operations",
    viewId,
    service?.name ?? "Centrale Operativa",
    service?.color ?? OPERATIONS_COLOR,
    service?.gradient
  );
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashAlert, setCashAlert] = useState<"none" | "open" | "close">("none");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/platform/operations")
      .then((r) => r.json())
      .then((data) => {
        setKpi(data.kpi);
        setCharts({
          revenueTrend: data.revenueTrend || [],
          moduleStats: data.moduleStats || [],
        });
      })
      .catch(() => {
        setKpi(null);
        setCharts(null);
      })
      .finally(() => setLoading(false));

    fetch("/api/platform/entrate-uscite/cash-session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.session) setCashAlert("open");
        else if (data.session.status === "OPEN") setCashAlert("close");
        else setCashAlert("none");
      })
      .catch(() => setCashAlert("none"));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (viewId === "alert") {
    const alerts = [
      kpi && kpi.openTickets > 0 && `${kpi.openTickets} ticket richiedono attenzione`,
      kpi && kpi.pendingPackages > 0 && `${kpi.pendingPackages} pacchi in attesa di ritiro`,
      kpi && kpi.pendingMovements > 0 && `${kpi.pendingMovements} movimenti di cassa pendenti`,
      kpi && kpi.pendingPractices > 5 && `${kpi.pendingPractices} pratiche in lavorazione`,
    ].filter(Boolean);

    return (
      <ServicePremiumSubView
        moduleKey="operations"
        viewId="alert"
        serviceName={service?.name ?? "Centrale Operativa"}
        serviceColor={OPERATIONS_COLOR}
        serviceGradient={service?.gradient}
        badge={`${alerts.length} alert`}
        showKpiStrip={false}
      >
        {alerts.length === 0 ? (
          <Paper sx={[shellPaperSx, { p: 3, textAlign: "center" }]}>
            <Typography color="text.secondary">Nessun alert al momento. Tutto sotto controllo.</Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {alerts.map((a) => (
              <Paper
                key={String(a)}
                component={motion.div}
                variants={hubFadeUpSoft}
                sx={[shellPaperSx, { p: 2.5, borderLeft: "4px solid #ef4444" }]}
              >
                <Typography sx={{ fontWeight: 600 }}>{a}</Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </ServicePremiumSubView>
    );
  }

  const showCharts = viewId === "dashboard" || viewId === "kpi";

  return (
    <Box>
      <ServiceViewHero theme={viewTheme} badge={kpi ? `${kpi.openTickets + kpi.pendingPractices} attivi` : undefined}>
        <AiSparkButton scope="operations" action="briefing" label="Briefing AI" inline={false} />
      </ServiceViewHero>

      {cashAlert === "open" && (
        <Alert
          severity="warning"
          sx={{ mb: 2, mt: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => router.push("/services/entrate-uscite?v=giornata&open=1")}>
              Apri cassa
            </Button>
          }
        >
          Giornata non ancora aperta — inserisci il fondo cassa per iniziare.
        </Alert>
      )}
      {cashAlert === "close" && (
        <Alert
          severity="info"
          sx={{ mb: 2, mt: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => router.push("/services/entrate-uscite?v=giornata")}>
              Chiudi e giornale
            </Button>
          }
        >
          Cassa aperta — ricorda la chiusura serale per generare il giornale di cassa.
        </Alert>
      )}

      <Grid
        container
        spacing={2}
        component={motion.div}
        variants={hubStaggerContainer}
        initial="hidden"
        animate="visible"
        sx={{ mb: showCharts ? 4 : 0, mt: 2 }}
      >
        {KPI_CARDS.map((card, i) => (
          <Grid key={card.key} size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={hubFadeUpSoft}>
            <ServiceStatCard
              label={card.label}
              value={kpi?.[card.key] ?? 0}
              color={card.color}
              icon={kpiIconForIndex(i)}
              delay={i * 0.04}
            />
          </Grid>
        ))}
      </Grid>

      {showCharts && charts && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Paper sx={[shellPaperSx, { p: 2.5 }]}>
              <Typography sx={{ fontWeight: 600, mb: 2 }}>Trend entrate (6 mesi)</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={charts.revenueTrend}>
                  <CartesianGrid stroke={t.gridLine} />
                  <XAxis dataKey="month" tick={axisTick} />
                  <YAxis tick={axisTick} />
                  <Tooltip contentStyle={tooltip} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: "#6366f1", r: 4 }}
                    name="Entrate €"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Paper sx={[shellPaperSx, { p: 2.5 }]}>
              <Typography sx={{ fontWeight: 600, mb: 2 }}>Record per modulo</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.moduleStats} layout="vertical">
                  <CartesianGrid stroke={t.gridLine} />
                  <XAxis type="number" tick={axisTick} />
                  <YAxis type="category" dataKey="module" width={90} tick={axisTickSm} />
                  <Tooltip contentStyle={tooltip} />
                  <Bar dataKey="count" name="Record" radius={[0, 4, 4, 0]}>
                    {charts.moduleStats.map((entry) => (
                      <Cell key={entry.module} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
