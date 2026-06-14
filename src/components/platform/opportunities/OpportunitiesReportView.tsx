"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box, Typography, Button, Card, CardContent, Grid, Stack, CircularProgress, Chip,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { shellPanelSx } from "@/theme/shell-tokens";
import { customerLabel, money, statusColor, type OpportunityRow } from "./opportunities-utils";

interface Report {
  monthKey?: string;
  wonTotal: number;
  pendingTotal: number;
  won: OpportunityRow[];
  pending: OpportunityRow[];
}

interface Props {
  serviceColor: string;
}

export default function OpportunitiesReportView({ serviceColor }: Props) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/platform/opportunities/report");
    setReport(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.5rem" }}>Report commissioni</Typography>
          <Typography color="text.secondary">
            Commissioni attivate e pipeline in corso{report?.monthKey ? ` · ${report.monthKey}` : ""}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          href="/api/platform/opportunities/export"
          component="a"
          sx={{ borderColor: `${serviceColor}55`, color: serviceColor }}
        >
          Esporta CSV
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={shellPanelSx}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Commissioni attivate</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.75rem", color: "#10b981" }}>{money(report?.wonTotal ?? 0)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={shellPanelSx}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Commissioni in pipeline</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.75rem", color: serviceColor }}>{money(report?.pendingTotal ?? 0)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={shellPanelSx}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Attivati ({report?.won.length ?? 0})</Typography>
              <Stack spacing={1}>
                {(report?.won || []).slice(0, 12).map((r) => (
                  <Box key={r.id} sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "center" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: "0.75rem", fontFamily: "monospace", fontWeight: 600 }} noWrap>{r.code}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>{customerLabel(r)}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.825rem", fontWeight: 700, color: "#10b981", flexShrink: 0 }}>{money(r.commission)}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={shellPanelSx}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>In pipeline ({report?.pending.length ?? 0})</Typography>
              <Stack spacing={1}>
                {(report?.pending || []).slice(0, 12).map((r) => (
                  <Box key={r.id} sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "center" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: "0.75rem", fontFamily: "monospace", fontWeight: 600 }} noWrap>{r.code}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>{customerLabel(r)}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
                      <Chip
                        label={r.statusLabel || r.statusCode}
                        size="small"
                        sx={{ height: 20, fontSize: "0.6rem", background: `${statusColor(r.statusCode)}18`, color: statusColor(r.statusCode) }}
                      />
                      <Typography sx={{ fontSize: "0.825rem", fontWeight: 600 }}>{money(r.commission)}</Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
