"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Button, CircularProgress, Paper, Table, TableBody,
  TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Grid, alpha,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import SavingsIcon from "@mui/icons-material/Savings";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { shellPanelSx } from "@/theme/shell-tokens";
import FinanceViewHero from "../finance/FinanceViewHero";
import FinanceStatCard from "../finance/FinanceStatCard";
import { FINANCE_COLORS, money } from "../finance/finance-utils";

interface Props {
  serviceColor: string;
}

type Period = "day" | "week" | "month" | "year";

export default function CashRegisterReportView({ serviceColor }: Props) {
  const [period, setPeriod] = useState<Period>("month");
  const [report, setReport] = useState<{
    from: string;
    to: string;
    totals: {
      giornateChiuse: number;
      saldoNetto: number;
      totalEntrate: number;
      totalUscite: number;
      expressSalesTotal: number;
      expressSalesCount: number;
      margineTotale: number;
      scostamentoCassa: number;
    };
    sessions: Array<{
      id: string;
      businessDate: string;
      openingAmount: number;
      closingAmount: number;
      variance: number;
      saldoNetto: number | null;
      expressSalesTotal: number | null;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/platform/entrate-uscite/cash-session/report?period=${period}`);
    const data = await res.json();
    setReport(data.report);
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const periodToggle = (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={period}
      onChange={(_, v) => v && setPeriod(v)}
      sx={{
        bgcolor: "rgba(255,255,255,0.15)",
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

  return (
    <Box>
      <FinanceViewHero
        viewId="report"
        badge={report ? `${report.from} → ${report.to}` : undefined}
      >
        {periodToggle}
      </FinanceViewHero>

      {loading ? (
        <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
          <CircularProgress sx={{ color: serviceColor }} />
        </Box>
      ) : report && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: "Entrate", value: money(report.totals.totalEntrate), icon: TrendingUpIcon, color: FINANCE_COLORS.entrate },
              { label: "Uscite", value: money(report.totals.totalUscite), icon: TrendingDownIcon, color: FINANCE_COLORS.uscite },
              { label: "Guadagno netto", value: money(report.totals.saldoNetto), icon: SavingsIcon, color: serviceColor },
              { label: "Express", value: money(report.totals.expressSalesTotal), sub: `${report.totals.expressSalesCount} vendite`, icon: PointOfSaleIcon, color: FINANCE_COLORS.express },
              { label: "Giornate chiuse", value: String(report.totals.giornateChiuse), icon: EventAvailableIcon, color: FINANCE_COLORS.card },
              { label: "Scostamento", value: money(report.totals.scostamentoCassa), icon: CompareArrowsIcon, color: FINANCE_COLORS.overdue },
            ].map((k, i) => (
              <Grid key={k.label} size={{ xs: 6, md: 4, lg: 2 }}>
                <FinanceStatCard {...k} delay={i * 0.05} />
              </Grid>
            ))}
          </Grid>

          <Paper sx={[shellPanelSx, { p: 2.5, border: `1px solid ${alpha(serviceColor, 0.12)}` }]}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>
              Giornali chiusi
            </Typography>
            {report.sessions.length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography color="text.secondary">Nessuna giornata chiusa nel periodo.</Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell align="right">Apertura</TableCell>
                    <TableCell align="right">Chiusura</TableCell>
                    <TableCell align="right">Saldo netto</TableCell>
                    <TableCell align="right">Express</TableCell>
                    <TableCell align="right">Scostamento</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.sessions.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{new Date(s.businessDate).toLocaleDateString("it-IT")}</TableCell>
                      <TableCell align="right">{money(s.openingAmount)}</TableCell>
                      <TableCell align="right">{money(s.closingAmount)}</TableCell>
                      <TableCell align="right" sx={{ color: FINANCE_COLORS.entrate, fontWeight: 600 }}>
                        {s.saldoNetto != null ? money(s.saldoNetto) : "—"}
                      </TableCell>
                      <TableCell align="right">{s.expressSalesTotal != null ? money(s.expressSalesTotal) : "—"}</TableCell>
                      <TableCell align="right" sx={{ color: s.variance !== 0 ? FINANCE_COLORS.overdue : "inherit", fontWeight: s.variance !== 0 ? 700 : 400 }}>
                        {money(s.variance)}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          href={`/api/platform/entrate-uscite/cash-session/${s.id}/pdf`}
                          target="_blank"
                          sx={{ borderColor: alpha(serviceColor, 0.4), color: serviceColor }}
                        >
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}
