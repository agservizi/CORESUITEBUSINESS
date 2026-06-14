"use client";

import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import WbTwilightIcon from "@mui/icons-material/WbTwilight";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { getShellTokens } from "@/theme/shell-tokens";
import { useHubOperationsOptional } from "@/context/HubOperationsProvider";

type DayPhase = "morning" | "afternoon" | "evening" | "night";

function getDayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

const PHASE_META: Record<
  DayPhase,
  { label: string; Icon: typeof WbSunnyIcon; accent: string; glow: string }
> = {
  morning: { label: "Mattina", Icon: WbSunnyIcon, accent: "#f59e0b", glow: "rgba(245,158,11,0.22)" },
  afternoon: { label: "Pomeriggio", Icon: WbTwilightIcon, accent: "#6366f1", glow: "rgba(99,102,241,0.22)" },
  evening: { label: "Sera", Icon: WbTwilightIcon, accent: "#a78bfa", glow: "rgba(167,139,250,0.22)" },
  night: { label: "Notte", Icon: NightsStayIcon, accent: "#06b6d4", glow: "rgba(6,182,212,0.18)" },
};

function formatSyncAgo(ms: number | null): string {
  if (!ms) return "—";
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (sec < 60) return `${sec}s fa`;
  return `${Math.floor(sec / 60)}m fa`;
}

export default function HubDateTimeWidget() {
  const [now, setNow] = useState<Date | null>(null);
  const [syncLabel, setSyncLabel] = useState("—");
  const reduce = useReducedMotion();
  const ops = useHubOperationsOptional();

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setSyncLabel(formatSyncAgo(ops?.lastSyncMs ?? null));
    const t = setInterval(() => setSyncLabel(formatSyncAgo(ops?.lastSyncMs ?? null)), 5000);
    return () => clearInterval(t);
  }, [ops?.lastSyncMs]);

  const phase = getDayPhase((now ?? new Date()).getHours());
  const meta = PHASE_META[phase];
  const PhaseIcon = meta.Icon;
  const isCritical = Boolean(ops && ops.criticalAlerts > 0);
  const statusColor = isCritical ? "#f59e0b" : ops?.loading ? "#94a3b8" : "#22c55e";
  const statusLabel = isCritical ? `${ops!.criticalAlerts} alert critici` : "Sistema operativo";

  const time = now
    ? now.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";

  const dateLine = now
    ? now.toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "\u00a0";

  return (
    <Box
      component={motion.div}
      initial={reduce ? false : { opacity: 0, x: 16 }}
      animate={{
        opacity: 1,
        x: 0,
        borderColor: isCritical ? "rgba(245,158,11,0.45)" : "rgba(99,102,241,0.12)",
        boxShadow: isCritical
          ? "0 8px 32px rgba(245,158,11,0.18)"
          : `0 8px 32px ${meta.glow}`,
      }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      sx={(theme) => {
        const shell = getShellTokens(theme);
        return {
          position: "relative",
          overflow: "hidden",
          minWidth: { xs: "100%", sm: 280 },
          maxWidth: 340,
          px: 2.25,
          py: 2,
          borderRadius: 3,
          border: shell.border,
          background: shell.panel,
          backdropFilter: "blur(16px)",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 100% 0%, ${meta.glow} 0%, transparent 55%)`,
            pointerEvents: "none",
          },
        };
      }}
    >
      <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: `${meta.accent}22`,
              color: meta.accent,
            }}
          >
            <PhaseIcon sx={{ fontSize: 16 }} />
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.06em", color: meta.accent }}>
            {meta.label.toUpperCase()}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            component={motion.div}
            animate={{
              color: statusColor,
              scale: isCritical && !reduce ? [1, 1.15, 1] : 1,
            }}
            transition={{
              color: { duration: 0.4 },
              scale: isCritical ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 },
            }}
            sx={{ display: "flex", alignItems: "center" }}
          >
            <FiberManualRecordIcon sx={{ fontSize: 10 }} />
          </Box>
          <Typography
            component={motion.span}
            animate={{ color: statusColor }}
            transition={{ duration: 0.4 }}
            variant="caption"
            sx={{ fontWeight: 600, fontSize: "0.65rem" }}
          >
            {statusLabel}
          </Typography>
        </Box>
      </Box>

      <Typography
        sx={(theme) => ({
          position: "relative",
          fontWeight: 800,
          fontSize: { xs: "2.1rem", md: "2.35rem" },
          lineHeight: 1,
          letterSpacing: "-0.04em",
          fontFamily: '"JetBrains Mono", "Roboto Mono", ui-monospace, monospace',
          fontVariantNumeric: "tabular-nums",
          mb: 0.5,
          background: `linear-gradient(135deg, ${meta.accent} 0%, ${theme.palette.text.primary} 120%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        })}
      >
        {time}
      </Typography>

      <Typography
        variant="body2"
        sx={{ position: "relative", textTransform: "capitalize", fontWeight: 600, fontSize: "0.82rem", mb: 1.25 }}
      >
        {dateLine}
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ position: "relative", fontWeight: 500, lineHeight: 1.5 }}>
        {statusLabel} · {ops?.activeServicesCount ?? "—"} servizi attivi · ultimo sync {syncLabel}
      </Typography>
    </Box>
  );
}
