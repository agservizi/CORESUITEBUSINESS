"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Grid, Paper, CircularProgress, Button, Chip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { chartTooltipStyle, chartAxisTick, getShellTokens, shellPaperSx } from "@/theme/shell-tokens";

interface ReportData {
  leadsByStatus: { status: string; count: number }[];
  clientsByStatus: { status: string; count: number }[];
  dealsByMonth: { month: string; deals: number; revenue: number }[];
  pipelineStages: { name: string; color: string; count: number }[];
  funnel?: { name: string; color: string; count: number; conversionRate: number }[];
  forecast90?: number;
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nuovi",
  CONTACTED: "Contattati",
  QUALIFIED: "Qualificati",
  PROPOSAL: "Proposta",
  NEGOTIATION: "Negoziazione",
  WON: "Vinti",
  LOST: "Persi",
  ACTIVE: "Attivi",
  INACTIVE: "Inattivi",
  PROSPECT: "Prospect",
  CHURNED: "Persi",
};

export default function ReportView() {
  const theme = useTheme();
  const t = getShellTokens(theme);
  const tooltip = chartTooltipStyle(theme);
  const axisTick = chartAxisTick(theme);
  const axisTickSm = chartAxisTick(theme, 11);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/business/report")
      .then(async (r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return <Typography color="error">Impossibile caricare i report</Typography>;
  }

  const leadsChart = data.leadsByStatus.map((r) => ({
    name: STATUS_LABELS[r.status] || r.status,
    value: r.count,
  }));

  const clientsChart = data.clientsByStatus.map((r) => ({
    name: STATUS_LABELS[r.status] || r.status,
    value: r.count,
    color: r.status === "ACTIVE" ? "#10b981" : r.status === "PROSPECT" ? "#f59e0b" : "#64748b",
  }));

  return (
    <Box>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3, flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.02em", mb: 0.5 }}>
              Report
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
              Analisi commerciale e pipeline
              {data.forecast90 != null && ` · Forecast 90gg: €${data.forecast90.toLocaleString("it-IT")}`}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `business-report-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export dati
          </Button>
        </Box>
      </motion.div>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={[shellPaperSx, { p: 2.5 }]}>
            <Typography sx={{ fontWeight: 600, mb: 2 }}>Lead per stato</Typography>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={leadsChart}>
                <CartesianGrid stroke={t.gridLine} />
                <XAxis dataKey="name" tick={axisTickSm} />
                <YAxis tick={axisTick} />
                <Tooltip contentStyle={tooltip} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Lead" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={[shellPaperSx, { p: 2.5 }]}>
            <Typography sx={{ fontWeight: 600, mb: 2 }}>Clienti per stato</Typography>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={clientsChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {clientsChart.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color || `hsl(${i * 60}, 60%, 55%)`} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltip} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper sx={[shellPaperSx, { p: 2.5 }]}>
            <Typography sx={{ fontWeight: 600, mb: 2 }}>Deal e revenue (6 mesi)</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.dealsByMonth}>
                <CartesianGrid stroke={t.gridLine} />
                <XAxis dataKey="month" tick={axisTick} />
                <YAxis yAxisId="left" tick={axisTick} />
                <YAxis yAxisId="right" orientation="right" tick={axisTick} />
                <Tooltip contentStyle={tooltip} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="deals"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  name="Deal creati"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Revenue vinta €"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={[shellPaperSx, { p: 2.5 }]}>
            <Typography sx={{ fontWeight: 600, mb: 2 }}>Funnel conversion per stage</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.funnel || data.pipelineStages}>
                <CartesianGrid stroke={t.gridLine} />
                <XAxis dataKey="name" tick={axisTickSm} />
                <YAxis tick={axisTick} />
                <Tooltip contentStyle={tooltip} />
                <Bar dataKey="count" name="Lead" radius={[4, 4, 0, 0]}>
                  {(data.funnel || data.pipelineStages).map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {(data.funnel || []).length > 0 && (
              <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                {data.funnel!.map((s) => (
                  <Chip key={s.name} size="small" label={`${s.name}: ${s.conversionRate}% conv.`} sx={{ fontSize: "0.65rem" }} />
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
