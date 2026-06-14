"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DownloadIcon from "@mui/icons-material/Download";
import { AppDateField } from "@/components/layout/app-shell";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "./express-utils";
import { chartAxisTick, chartTooltipStyle, getShellTokens } from "@/theme/shell-tokens";

interface ReportData {
  granularity: string;
  periodLabel?: string;
  period: { label: string; mode: string };
  totals: { sales: number; revenue: number; iccidAvailable: number };
  payments: { method: string; count: number; total: number }[];
  operators: { name: string; count: number; total: number }[];
  trend: { label: string; count: number; revenue: number }[];
}

interface Props {
  serviceColor: string;
}

export default function ExpressReportsView({ serviceColor }: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const axisTick = chartAxisTick(theme);
  const chartTooltip = chartTooltipStyle(theme);
  const [granularity, setGranularity] = useState<"daily" | "monthly" | "yearly">("daily");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ view: "report", granularity });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/platform/express?${params}`, { credentials: "include" });
    const data = await res.json();
    if (res.ok) setReport(data);
  }, [granularity, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const params = new URLSearchParams({ view: "sales", export: "csv" });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/platform/express?${params}`, "_blank");
  }

  if (!report) return null;

  const trendTitle =
    from || to
      ? `Incasso · ${report.period.label}`
      : `Incasso · trend 7 giorni (contesto ${report.periodLabel ?? granularity})`;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.25rem" }}>Report vendite</Typography>
          <Typography variant="body2" color="text.secondary">
            Periodo: {report.period.label}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <AppDateField label="Da" value={from} onChange={setFrom} />
          <AppDateField label="A" value={to} onChange={setTo} />
          <Button size="small" startIcon={<DownloadIcon />} variant="outlined" onClick={exportCsv}>
            Export CSV
          </Button>
          <ToggleButtonGroup
            size="small"
            value={granularity}
            exclusive
            onChange={(_, v) => v && setGranularity(v)}
          >
            <ToggleButton value="daily">Giorno</ToggleButton>
            <ToggleButton value="monthly">Mese</ToggleButton>
            <ToggleButton value="yearly">Anno</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Vendite", value: report.totals.sales },
          { label: "Incasso", value: money(report.totals.revenue) },
          { label: "SIM disponibili", value: report.totals.iccidAvailable },
        ].map((k) => (
          <Grid key={k.label} size={{ xs: 12, sm: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  {k.label}
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: "1.5rem" }}>{k.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>{trendTitle}</Typography>
          <Box sx={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.trend}>
                <CartesianGrid stroke={shell.gridLine} />
                <XAxis dataKey="label" tick={axisTick} />
                <YAxis tick={axisTick} width={48} />
                <Tooltip contentStyle={chartTooltip} formatter={(v) => money(Number(v ?? 0))} />
                <Bar dataKey="revenue" fill={serviceColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Per metodo pagamento</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Metodo</TableCell>
                    <TableCell align="right">N.</TableCell>
                    <TableCell align="right">Totale</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.payments.map((p) => (
                    <TableRow key={p.method}>
                      <TableCell>{p.method}</TableCell>
                      <TableCell align="right">{p.count}</TableCell>
                      <TableCell align="right">{money(p.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Per operatore</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Operatore</TableCell>
                    <TableCell align="right">Righe</TableCell>
                    <TableCell align="right">Totale</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.operators.map((op) => (
                    <TableRow key={op.name}>
                      <TableCell>{op.name}</TableCell>
                      <TableCell align="right">{op.count}</TableCell>
                      <TableCell align="right">{money(op.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
