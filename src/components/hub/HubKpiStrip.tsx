"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Skeleton } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import EventIcon from "@mui/icons-material/Event";
import PaymentsIcon from "@mui/icons-material/Payments";
import PeopleIcon from "@mui/icons-material/People";
import { shellPanelSx } from "@/theme/shell-tokens";
import AnimatedCounter from "./AnimatedCounter";
import { hubKpiHover, hubScaleIn, hubStaggerFast } from "@/lib/hub-motion";

interface KpiData {
  openTickets: number;
  todayAppointments: number;
  dailyRevenue: number;
  activeClients: number;
  pendingPractices: number;
}

const KPI_CONFIG = [
  { key: "openTickets" as const, label: "Ticket aperti", icon: ConfirmationNumberIcon, color: "#0ea5e9" },
  { key: "todayAppointments" as const, label: "Appuntamenti oggi", icon: EventIcon, color: "#10b981" },
  { key: "dailyRevenue" as const, label: "Incassi oggi", icon: PaymentsIcon, color: "#6366f1", format: "currency" as const },
  { key: "activeClients" as const, label: "Clienti attivi", icon: PeopleIcon, color: "#8b5cf6" },
];

export default function HubKpiStrip() {
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    fetch("/api/platform/operations")
      .then((r) => r.json())
      .then((d) => setKpi(d.kpi))
      .catch(() => setKpi(null));
  }, []);

  return (
    <Box
      component={motion.div}
      variants={hubStaggerFast}
      initial="hidden"
      animate="show"
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
        gap: 1.5,
        mt: 3,
      }}
    >
      {KPI_CONFIG.map((item, i) => {
        const Icon = item.icon;
        const value = kpi ? kpi[item.key] : null;
        return (
          <Box
            key={item.key}
            component={motion.div}
            variants={hubScaleIn}
            custom={i}
            whileHover={reduce ? {} : hubKpiHover}
            whileTap={reduce ? {} : { scale: 0.98 }}
            sx={[
              shellPanelSx,
              {
                p: 2,
                backdropFilter: "blur(12px)",
                borderTop: `2px solid ${item.color}`,
                position: "relative",
                overflow: "hidden",
                cursor: "default",
              },
            ]}
          >
            <motion.div
              aria-hidden
              animate={
                reduce
                  ? {}
                  : {
                      opacity: [0.4, 0.7, 0.4],
                      scale: [1, 1.08, 1],
                    }
              }
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: `${item.color}15`,
                pointerEvents: "none",
              }}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Icon sx={{ fontSize: 16, color: item.color }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                {item.label}
              </Typography>
            </Box>
            {value === null ? (
              <Skeleton width={60} height={28} />
            ) : (
              <Typography
                component="div"
                sx={{ fontWeight: 800, fontSize: "1.35rem", letterSpacing: "-0.02em", color: item.color }}
              >
                <AnimatedCounter value={value} format={item.format} />
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
