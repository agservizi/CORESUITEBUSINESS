"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Skeleton, Divider } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";
import { hubAlertItem, hubSlideInRight, hubStaggerFast } from "@/lib/hub-motion";

interface AlertItem {
  text: string;
  severity: "warn" | "info";
}

export default function HubActivityPanel() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<{ month: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const reduce = useReducedMotion();

  useEffect(() => {
    fetch("/api/platform/operations")
      .then((r) => r.json())
      .then((d) => {
        const k = d.kpi;
        const items: AlertItem[] = [];
        if (k?.openTickets > 0) items.push({ text: `${k.openTickets} ticket aperti`, severity: "warn" });
        if (k?.pendingPackages > 0) items.push({ text: `${k.pendingPackages} pacchi in attesa`, severity: "warn" });
        if (k?.pendingPractices > 0) items.push({ text: `${k.pendingPractices} pratiche in corso`, severity: "info" });
        if (k?.todayAppointments > 0) items.push({ text: `${k.todayAppointments} appuntamenti oggi`, severity: "info" });
        setAlerts(items.slice(0, 5));
        setRevenueTrend(d.revenueTrend || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box
      component={motion.div}
      variants={hubSlideInRight}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      sx={[
        shellPanelSx,
        {
          position: "sticky",
          top: 88,
          p: 2.5,
          backdropFilter: "blur(16px)",
        },
      ]}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Box
          component={motion.div}
          animate={
            reduce
              ? {}
              : {
                  scale: [1, 1.35, 1],
                  boxShadow: [
                    "0 0 0px #22c55e00",
                    "0 0 14px #22c55e88",
                    "0 0 0px #22c55e00",
                  ],
                }
          }
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#22c55e",
          }}
        />
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>Stato piattaforma</Typography>
        <Typography variant="caption" color="success.main" sx={{ ml: "auto", fontWeight: 600 }}>
          Operativa
        </Typography>
      </Box>

      <Divider sx={(theme) => ({ borderColor: getShellTokens(theme).borderColor, mb: 2 })} />

      <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: "0.1em" }}>
        Attività recente
      </Typography>
      <Box
        component={motion.div}
        variants={hubStaggerFast}
        initial="hidden"
        animate={loading ? "hidden" : "show"}
        sx={{ mt: 1.5, mb: 2.5 }}
      >
        {loading ? (
          <>
            <Skeleton height={24} sx={{ mb: 1 }} />
            <Skeleton height={24} sx={{ mb: 1 }} />
            <Skeleton height={24} />
          </>
        ) : alerts.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
            Nessun alert al momento. Tutto sotto controllo.
          </Typography>
        ) : (
          alerts.map((a, i) => (
            <Box
              key={a.text}
              component={motion.div}
              variants={hubAlertItem}
              custom={i}
              sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.75 }}
            >
              <FiberManualRecordIcon
                sx={{
                  fontSize: 8,
                  color: a.severity === "warn" ? "#f59e0b" : "#6366f1",
                }}
              />
              <Typography sx={{ fontSize: "0.8rem" }}>{a.text}</Typography>
            </Box>
          ))
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <TrendingUpIcon sx={{ fontSize: 16, color: "#6366f1" }} />
        <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: "0.1em" }}>
          Trend incassi
        </Typography>
      </Box>
      <Box
        component={motion.div}
        initial={{ opacity: 0, scaleY: 0.6 }}
        whileInView={{ opacity: 1, scaleY: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        sx={{ height: 100, mt: 1, transformOrigin: "bottom" }}
      >
        {loading ? (
          <Skeleton variant="rounded" height={100} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="hubRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#hubRevenue)"
                dot={false}
                isAnimationActive={!reduce}
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
}
