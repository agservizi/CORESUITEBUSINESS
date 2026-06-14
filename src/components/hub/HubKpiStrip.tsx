"use client";

import { Box, Typography } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import EventIcon from "@mui/icons-material/Event";
import PaymentsIcon from "@mui/icons-material/Payments";
import PeopleIcon from "@mui/icons-material/People";
import { shellPanelSx } from "@/theme/shell-tokens";
import AnimatedCounter from "./AnimatedCounter";
import { HubKpiShimmer } from "./HubShimmer";
import { hubKpiFontSx } from "@/lib/hub-layout";
import { hubKpiHover, hubScaleIn, hubStaggerFast } from "@/lib/hub-motion";
import { useHubOperationsOptional } from "@/context/HubOperationsProvider";

const KPI_CONFIG = [
  { key: "openTickets" as const, label: "Ticket aperti", icon: ConfirmationNumberIcon, color: "#0ea5e9" },
  { key: "todayAppointments" as const, label: "Appuntamenti oggi", icon: EventIcon, color: "#10b981" },
  { key: "dailyRevenue" as const, label: "Incassi oggi", icon: PaymentsIcon, color: "#6366f1", format: "currency" as const },
  { key: "activeClients" as const, label: "Clienti attivi", icon: PeopleIcon, color: "#8b5cf6" },
];

export default function HubKpiStrip() {
  const ops = useHubOperationsOptional();
  const reduce = useReducedMotion();
  const kpi = ops?.kpi ?? null;
  const loading = ops?.loading ?? true;

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
        minHeight: 88,
      }}
    >
      {KPI_CONFIG.map((item, i) => {
        const Icon = item.icon;
        const value = kpi ? kpi[item.key] : null;
        return (
          <Box key={item.key} component={motion.div} variants={hubScaleIn} custom={i} sx={{ minHeight: 88 }}>
            {loading && value === null ? (
              <HubKpiShimmer />
            ) : (
              <Box
                component={motion.div}
                whileHover={reduce ? {} : hubKpiHover}
                whileTap={reduce ? {} : { scale: 0.98 }}
                sx={[
                  shellPanelSx,
                  {
                    p: 2,
                    minHeight: 88,
                    backdropFilter: "blur(12px)",
                    borderTop: `2px solid ${item.color}`,
                    position: "relative",
                    overflow: "hidden",
                  },
                ]}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Icon sx={{ fontSize: 16, color: item.color }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                    {item.label}
                  </Typography>
                </Box>
                <Typography component="div" sx={{ ...hubKpiFontSx(), color: item.color }}>
                  {value !== null ? <AnimatedCounter value={value} format={item.format} /> : "—"}
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
