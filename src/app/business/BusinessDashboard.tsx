"use client";

import { useEffect, useState } from "react";
import { Box, Grid, Typography, Skeleton, Chip } from "@mui/material";
import { motion } from "framer-motion";
import { useBusinessNavigation } from "@/context/BusinessNavigationProvider";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";
import BusinessLiveFeed from "@/components/business/BusinessLiveFeed";
import BusinessNextActions from "@/components/business/BusinessNextActions";
import BusinessPipelineAlerts from "@/components/business/BusinessPipelineAlerts";
import BusinessLeaderboard from "@/components/business/BusinessLeaderboard";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EuroIcon from "@mui/icons-material/Euro";
import FiberNewIcon from "@mui/icons-material/FiberNew";

interface Stats {
  totalClients: number;
  activeClients: number;
  totalLeads: number;
  newLeads: number;
  totalDeals: number;
  revenueWon: number;
  pipelineValue: number;
  conversionRate: number;
  activeClientRate: number;
  avgLeadValue: number;
  recentActivities: {
    id: string;
    type: string;
    title: string;
    isDone: boolean;
    createdAt: string;
    author: { name: string | null };
    client?: { name: string } | null;
    lead?: { title: string } | null;
  }[];
}

const KPI_CARDS = [
  {
    key: "totalClients",
    label: "Clienti totali",
    sub: (s: Stats) => `${s.activeClients} attivi`,
    icon: PeopleAltIcon,
    color: "#0ea5e9",
    gradient: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
  },
  {
    key: "totalLeads",
    label: "Lead totali",
    sub: (s: Stats) => `${s.newLeads} nuovi`,
    icon: TrendingUpIcon,
    color: "#6366f1",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  },
  {
    key: "pipelineValue",
    label: "Valore pipeline",
    sub: () => "Lead attivi",
    icon: EuroIcon,
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    format: (v: number) => `€${v.toLocaleString("it-IT")}`,
  },
  {
    key: "revenueWon",
    label: "Fatturato chiuso",
    sub: () => "Deal vinti",
    icon: FiberNewIcon,
    color: "#10b981",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    format: (v: number) => `€${v.toLocaleString("it-IT")}`,
  },
];

export default function BusinessDashboard() {
  const { navigate } = useBusinessNavigation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/business/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.02em", mb: 0.5 }}>
            Dashboard
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
            Panoramica delle attività commerciali
          </Typography>
        </motion.div>
      </Box>

      {/* KPI cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {KPI_CARDS.map(({ key, label, sub, icon: Icon, color, gradient, format }, i) => {
          const value = stats ? (stats as unknown as Record<string, number>)[key] : 0;
          return (
            <Grid key={key} size={{ xs: 12, sm: 6, lg: 3 }}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                <Box sx={[shellPanelSx, { p: 2.5, position: "relative", overflow: "hidden" }]}>
                  <Box
                    sx={{
                      position: "absolute",
                      top: -20,
                      right: -20,
                      width: 100,
                      height: 100,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
                    }}
                  />
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "10px",
                        background: gradient,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 4px 12px ${color}44`,
                      }}
                    >
                      <Icon sx={{ fontSize: 20, color: "#fff" }} />
                    </Box>
                  </Box>
                  {loading ? (
                    <Skeleton width={80} height={36} sx={(theme) => ({ bgcolor: getShellTokens(theme).skeleton })} />
                  ) : (
                    <Typography sx={{ fontWeight: 700, fontSize: "1.75rem", lineHeight: 1, mb: 0.5 }}>
                      {format ? format(value) : value}
                    </Typography>
                  )}
                  <Typography sx={{ fontSize: "0.825rem", color: "text.secondary" }}>{label}</Typography>
                  {stats && (
                    <Typography variant="caption" sx={{ color: color, opacity: 0.8 }}>
                      {sub(stats)}
                    </Typography>
                  )}
                </Box>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* WOW command center */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <BusinessLiveFeed />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <BusinessNextActions />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <BusinessPipelineAlerts />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <BusinessLeaderboard />
        </Grid>
      </Grid>

      {/* Quick actions + recent */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <RecentLeads />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <QuickStats stats={stats} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <RecentActivities stats={stats} loading={loading} onNavigate={navigate} />
        </Grid>
      </Grid>
    </Box>
  );
}

function RecentLeads() {
  const { navigate } = useBusinessNavigation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/business/lead?limit=6")
      .then((r) => r.json())
      .then((d) => setLeads(d.leads || []))
      .finally(() => setLoading(false));
  }, []);

  const PRIORITY_COLOR: Record<string, string> = {
    LOW: "#64748b", MEDIUM: "#0ea5e9", HIGH: "#f59e0b", URGENT: "#ef4444",
  };
  const STATUS_LABEL: Record<string, string> = {
    NEW: "Nuovo", CONTACTED: "Contattato", QUALIFIED: "Qualificato",
    PROPOSAL: "Proposta", NEGOTIATION: "Negoziazione", WON: "Vinto", LOST: "Perso",
  };

  return (
    <Box sx={[shellPanelSx, { p: 2.5 }]}>
      <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", mb: 2 }}>Lead recenti</Typography>
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={56} sx={(theme) => ({ bgcolor: getShellTokens(theme).skeletonTrack, borderRadius: 2, mb: 1 })} />
        ))
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {leads.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 3, fontSize: "0.875rem" }}>
              Nessun lead. Crea il primo dalla sezione Lead o Pipeline.
            </Typography>
          ) : leads.map((lead: Lead) => (
            <Box
              key={lead.id}
              onClick={() => navigate("lead", lead.id)}
              sx={(theme) => {
                const t = getShellTokens(theme);
                return {
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 1.5,
                  borderRadius: 2,
                  background: t.rowHover,
                  border: t.border,
                  "&:hover": { background: t.hoverStrong },
                  cursor: "pointer",
                };
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: PRIORITY_COLOR[lead.priority] || "#64748b",
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 500, fontSize: "0.825rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {lead.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {lead.client?.companyName || lead.client?.name || lead.contactName || "—"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                {lead.value && (
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#10b981" }}>
                    €{lead.value.toLocaleString("it-IT")}
                  </Typography>
                )}
                <Chip
                  label={STATUS_LABEL[lead.status] || lead.status}
                  size="small"
                  sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600, background: "rgba(99,102,241,0.1)", color: "primary.light", border: "none" }}
                />
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

interface Lead {
  id: string;
  title: string;
  status: string;
  priority: string;
  value?: number;
  client?: { name: string; companyName?: string };
  contactName?: string;
}

function QuickStats({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  const maxLeadValue = Math.max(stats?.avgLeadValue ?? 0, 1);
  const items = [
    { label: "Conversione lead vinti", value: stats ? `${stats.conversionRate}%` : "—", pct: stats?.conversionRate ?? 0, color: "#6366f1" },
    { label: "Clienti attivi", value: stats ? `${stats.activeClients}/${stats.totalClients}` : "—", pct: stats?.activeClientRate ?? 0, color: "#10b981" },
    { label: "Valore medio lead", value: stats ? `€${stats.avgLeadValue.toLocaleString("it-IT")}` : "—", pct: Math.min(100, Math.round(((stats?.avgLeadValue ?? 0) / maxLeadValue) * 100)), color: "#f59e0b" },
  ];

  return (
    <Box sx={[shellPanelSx, { p: 2.5 }]}>
      <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", mb: 2 }}>Statistiche rapide</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map(({ label, value, pct, color }) => (
          <Box key={label}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              {loading ? (
                <Skeleton width={40} height={16} sx={(theme) => ({ bgcolor: getShellTokens(theme).skeleton })} />
              ) : (
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color }}>{value}</Typography>
              )}
            </Box>
            <Box sx={(theme) => ({ height: 4, background: getShellTokens(theme).progressTrack, borderRadius: 2 })}>
              <Box sx={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, opacity: 0.6 }} />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function RecentActivities({
  stats,
  loading,
  onNavigate,
}: {
  stats: Stats | null;
  loading: boolean;
  onNavigate: (section: "attivita") => void;
}) {
  const activities = stats?.recentActivities ?? [];

  return (
    <Box sx={[shellPanelSx, { p: 2.5, height: "100%" }]}>
      <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", mb: 2 }}>Attività recenti</Typography>
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={40} sx={(theme) => ({ bgcolor: getShellTokens(theme).skeletonTrack, borderRadius: 2, mb: 1 })} />
        ))
      ) : activities.length === 0 ? (
        <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>Nessuna attività registrata</Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {activities.map((act) => (
            <Box key={act.id} sx={(theme) => {
              const t = getShellTokens(theme);
              return { p: 1.25, borderRadius: 2, background: t.rowHover, border: t.border };
            }}>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, textDecoration: act.isDone ? "line-through" : "none" }}>{act.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {act.client?.name || act.lead?.title || act.author.name} · {new Date(act.createdAt).toLocaleDateString("it-IT")}
              </Typography>
            </Box>
          ))}
          <Typography
            variant="caption"
            color="primary.light"
            sx={{ cursor: "pointer", mt: 0.5 }}
            onClick={() => onNavigate("attivita")}
          >
            Vedi tutte →
          </Typography>
        </Box>
      )}
    </Box>
  );
}
