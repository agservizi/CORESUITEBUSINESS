"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  Stack,
  Button,
  alpha,
  IconButton,
  Tooltip,
  Card,
  CardActionArea,
  CardContent,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ListAltIcon from "@mui/icons-material/ListAlt";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { shellPanelSx } from "@/theme/shell-tokens";
import AiSparkButton from "@/components/ai/AiSparkButton";
import { getModuleMeta } from "@/config/module-meta";
import { getPlatformService } from "@/config/platform-services";
import type { ModuleDashboardData } from "@/lib/platform/module-dashboard-service";
import { hubStaggerContainer, hubFadeUpSoft } from "@/lib/hub-motion";
import ServiceViewHero from "./ServiceViewHero";
import ServiceStatCard, { kpiIconForIndex } from "./ServiceStatCard";
import { getServiceViewTheme } from "./service-view-themes";

interface Props {
  moduleKey: string;
  serviceColor: string;
  serviceName: string;
  onNavigate: (viewId: string) => void;
  onOpenRecord?: (id: string) => void;
  listViewId?: string;
  serviceSlug?: string;
}

export default function ModuleDashboard({
  moduleKey,
  serviceColor,
  serviceName,
  onNavigate,
  onOpenRecord,
  listViewId = "elenco",
  serviceSlug,
}: Props) {
  const meta = getModuleMeta(moduleKey);
  const service = serviceSlug ? getPlatformService(serviceSlug) : undefined;
  const viewTheme = getServiceViewTheme(
    moduleKey,
    "dashboard",
    serviceName,
    serviceColor,
    service?.gradient
  );
  const [data, setData] = useState<ModuleDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/platform/${moduleKey}/dashboard`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, [moduleKey]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />;
  }

  const quickActions = [
    { id: listViewId, label: meta.listViewLabel ?? "Vai all'elenco", icon: ListAltIcon },
    ...(service?.nav.filter((n) => n.id !== "dashboard" && n.id !== listViewId).slice(0, 2).map((n) => ({
      id: n.id,
      label: n.label,
      icon: DashboardIcon,
    })) ?? []),
  ];

  return (
    <Box component={motion.div} variants={hubStaggerContainer} initial="hidden" animate="show">
      <ServiceViewHero
        theme={viewTheme}
        badge={data ? `${data.kpis?.[0]?.value ?? 0} totali` : undefined}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <AiSparkButton scope={meta.aiScope} action="briefing" moduleKey={moduleKey} inline={false} label="Briefing AI" />
          <Tooltip title="Aggiorna">
            <IconButton onClick={load} size="small" sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.15)" }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<FileDownloadIcon />}
            href={`/api/platform/${moduleKey}/export?view=${listViewId}`}
            target="_blank"
            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => onNavigate(listViewId)}
            sx={{ bgcolor: "#fff", color: serviceColor, fontWeight: 700, "&:hover": { bgcolor: alpha("#fff", 0.9) } }}
          >
            Nuovo
          </Button>
        </Stack>
      </ServiceViewHero>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(data?.kpis ?? []).map((kpi, i) => (
          <Grid key={kpi.key} size={{ xs: 6, sm: 4, md: 3 }}>
            <Box component={motion.div} variants={hubFadeUpSoft}>
              <ServiceStatCard
                label={kpi.label}
                value={kpi.value}
                sub={kpi.hint}
                icon={kpiIconForIndex(i)}
                color={serviceColor}
                delay={i * 0.04}
              />
            </Box>
          </Grid>
        ))}
      </Grid>

      {quickActions.length > 0 && (
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {quickActions.map((action) => (
            <Grid key={action.id} size={{ xs: 12, sm: 4 }}>
              <Card variant="outlined" sx={{ borderColor: alpha(serviceColor, 0.2) }}>
                <CardActionArea onClick={() => onNavigate(action.id)}>
                  <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5 }}>
                    <action.icon sx={{ color: serviceColor }} />
                    <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{action.label}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={[shellPanelSx, { p: 2.5, height: "100%" }]}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>Distribuzione stati</Typography>
            {(data?.statusBreakdown.length ?? 0) === 0 ? (
              <Typography color="text.secondary" variant="body2">Nessun dato disponibile.</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.statusBreakdown.map((s) => ({ name: s.status.replace(/_/g, " "), count: s.count }))}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <RTooltip />
                  <Bar dataKey="count" fill={serviceColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={[shellPanelSx, { p: 2.5, height: "100%" }]}>
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Insight operativi</Typography>
            <Stack spacing={1}>
              {(data?.insights ?? []).slice(0, 4).map((ins) => (
                <Alert
                  key={ins.id}
                  severity={ins.severity}
                  sx={{ borderRadius: 2, py: 0.5 }}
                  action={
                    ins.id === "pending" ? (
                      <Button size="small" onClick={() => onNavigate(listViewId)}>Apri</Button>
                    ) : undefined
                  }
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{ins.title}</Typography>
                  <Typography variant="caption">{ins.body}</Typography>
                </Alert>
              ))}
              {!data?.insights?.length && (
                <Typography color="text.secondary" variant="body2">Tutto sotto controllo.</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper sx={[shellPanelSx, { p: 2.5 }]}>
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Attività recenti</Typography>
            <Stack spacing={1}>
              {(data?.recent ?? []).map((row) => {
                const id = String(row.id ?? "");
                const label = String(
                  row.code ?? row.subject ?? row.title ?? row.name ?? row.trackingCode ??
                    row.recipient ?? row.serviceName ?? row.practiceType ?? id
                );
                return (
                  <Box
                    key={id}
                    onClick={() => onOpenRecord?.(id)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      p: 1.25,
                      borderRadius: 2,
                      border: 1,
                      borderColor: "divider",
                      cursor: onOpenRecord ? "pointer" : "default",
                      transition: "background 0.2s",
                      "&:hover": onOpenRecord ? { bgcolor: alpha(serviceColor, 0.06) } : undefined,
                    }}
                  >
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }} noWrap>{label}</Typography>
                    {row.status != null && (
                      <Chip size="small" label={String(row.status).replace(/_/g, " ")} />
                    )}
                  </Box>
                );
              })}
              {!data?.recent?.length && (
                <Typography color="text.secondary" variant="body2">Nessuna attività recente.</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
