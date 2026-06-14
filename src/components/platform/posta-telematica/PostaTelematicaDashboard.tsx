"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Typography, Grid, Card, CardContent, Stack, Chip, LinearProgress, Button, Paper, Alert,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import InboxIcon from "@mui/icons-material/Inbox";
import { motion } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import AnimatedCounter from "@/components/hub/AnimatedCounter";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";
import PostaTelematicaHero from "./PostaTelematicaHero";
import PostaPulseBanner from "./PostaPulseBanner";
import PostaPecTimeline from "./PostaPecTimeline";
import {
  clientLabel,
  statusColor,
  statusLabel,
  type PostaMessageRow,
} from "./posta-utils";
import { fetchPostaJson } from "./posta-fetch";

type Stats = {
  totalSent: number;
  totalFailed: number;
  todaySent: number;
  pecPendingAccettazione: number;
  pecPendingConsegna: number;
  inboxUnread: number;
  pecCount: number;
  emailCount: number;
  fromAddress?: string | null;
  fromName?: string;
  smtpConfigured?: boolean;
  deliveryRate: number;
  recent: PostaMessageRow[];
};

const EMPTY_STATS: Stats = {
  totalSent: 0,
  totalFailed: 0,
  todaySent: 0,
  pecPendingAccettazione: 0,
  pecPendingConsegna: 0,
  inboxUnread: 0,
  pecCount: 0,
  emailCount: 0,
  deliveryRate: 0,
  recent: [],
};

interface Props {
  serviceColor: string;
  onNavigate: (viewId: string) => void;
  onOpenMessage: (message: PostaMessageRow) => void;
}

export default function PostaTelematicaDashboard({ serviceColor, onNavigate, onOpenMessage }: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setStats(await fetchPostaJson<Stats>("/api/platform/posta-telematica/stats"));
    } catch (e) {
      setStats(EMPTY_STATS);
      setLoadError(e instanceof Error ? e.message : "Errore caricamento dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingReceipts = (stats?.pecPendingAccettazione ?? 0) + (stats?.pecPendingConsegna ?? 0);

  const kpis = [
    { label: "Invii riusciti", value: stats?.totalSent ?? 0, icon: SendIcon, color: serviceColor },
    { label: "Oggi", value: stats?.todaySent ?? 0, icon: MarkEmailReadIcon, color: "#6366f1" },
    { label: "Falliti", value: stats?.totalFailed ?? 0, icon: ErrorOutlineOutlinedIcon, color: "#ef4444" },
    { label: "In arrivo", value: stats?.inboxUnread ?? 0, icon: InboxIcon, color: "#0ea5e9" },
  ];

  return (
    <Box>
      {loadError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      <PostaPulseBanner
        pendingReceipts={pendingReceipts}
        failedCount={stats?.totalFailed ?? 0}
        onNavigate={onNavigate}
      />

      <PostaTelematicaHero
        serviceColor={serviceColor}
        todaySent={stats?.todaySent ?? 0}
        pendingReceipts={pendingReceipts}
        inboxUnread={stats?.inboxUnread ?? 0}
        smtpOk={Boolean(stats?.smtpConfigured)}
        onNavigate={onNavigate}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid key={k.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <Card sx={[shellPanelSx, { height: "100%", position: "relative", overflow: "hidden" }]}>
                <Box
                  sx={{
                    position: "absolute",
                    top: -24,
                    right: -24,
                    width: 90,
                    height: 90,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${k.color}18 0%, transparent 70%)`,
                  }}
                />
                <CardContent>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "10px",
                      bgcolor: `${k.color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 1.5,
                    }}
                  >
                    <k.icon sx={{ fontSize: 20, color: k.color }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {k.label}
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.75rem", lineHeight: 1.1 }}>
                    {loading ? "—" : <AnimatedCounter value={k.value} />}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={[shellPanelSx, { p: 2.5, height: "100%" }]}>
            <Typography sx={{ fontWeight: 700, mb: 2 }}>Canali & consegna PEC</Typography>
            <Stack spacing={2}>
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="body2">Invii PEC</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {stats?.pecCount ?? 0}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="body2">Email</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {stats?.emailCount ?? 0}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, gap: 1 }}>
                  <Typography variant="body2">Casella mittente (.env)</Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, textAlign: "right", maxWidth: "60%", wordBreak: "break-all" }}
                  >
                    {stats?.fromAddress || "—"}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                  <Typography variant="body2" color="text.secondary">
                    Tasso consegna PEC
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {stats?.deliveryRate ?? 0}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats?.deliveryRate ?? 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: `${serviceColor}15`,
                    "& .MuiLinearProgress-bar": { bgcolor: serviceColor, borderRadius: 4 },
                  }}
                />
              </Box>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                <Chip size="small" label={`${stats?.pecPendingAccettazione ?? 0} accettazione`} color="warning" variant="outlined" />
                <Chip size="small" label={`${stats?.pecPendingConsegna ?? 0} consegna`} color="info" variant="outlined" />
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={[shellPanelSx, { p: 2.5 }]}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography sx={{ fontWeight: 700 }}>Ultimi invii</Typography>
              <Button size="small" onClick={() => onNavigate("storico")}>
                Vedi tutti
              </Button>
            </Box>
            <Stack spacing={1.25}>
              {(stats?.recent ?? []).map((m) => (
                <Paper
                  key={m.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    cursor: "pointer",
                    borderColor: "divider",
                    "&:hover": { borderColor: serviceColor, bgcolor: `${serviceColor}06` },
                  }}
                  onClick={() => onOpenMessage(m)}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap", mb: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }} noWrap>
                        {m.subject}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {clientLabel(m.client)} · {m.recipientEmail}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                      <Chip size="small" label={m.channel.toUpperCase()} variant="outlined" />
                      <Chip size="small" label={statusLabel(m.status)} color={statusColor(m.status)} />
                    </Stack>
                  </Box>
                  {m.channel === "pec" && m.status === "sent" && <PostaPecTimeline message={m} compact />}
                </Paper>
              ))}
              {!loading && !(stats?.recent?.length) && (
                <Typography color="text.secondary" variant="body2">
                  Nessun invio ancora. Crea il primo da Nuovo invio.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
