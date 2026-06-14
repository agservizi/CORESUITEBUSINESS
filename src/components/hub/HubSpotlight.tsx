"use client";

import { Box, Typography, Button } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import { useServiceLaunch } from "@/context/ServiceLaunchProvider";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";
import { hubScaleIn, hubSpotlightHover, hubStaggerFast } from "@/lib/hub-motion";

const SPOTLIGHT = [
  {
    slug: "operations",
    name: "Centrale Operativa",
    tagline: "KPI, alert e panoramica in tempo reale",
    url: "/services/operations",
    icon: DashboardIcon,
    color: "#6366f1",
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    stats: ["14 KPI live", "Alert operativi", "Grafici trend"],
  },
  {
    slug: "business",
    name: "Business",
    tagline: "CRM, pipeline e gestione clienti",
    url: "/business",
    icon: BusinessCenterIcon,
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
    stats: ["Clienti & Lead", "Pipeline Kanban", "Report"],
  },
];

export default function HubSpotlight() {
  const { launchService, isLaunching } = useServiceLaunch();
  const reduce = useReducedMotion();

  return (
    <Box
      component={motion.div}
      variants={hubStaggerFast}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 2,
        mb: 4,
      }}
    >
      {SPOTLIGHT.map((item, i) => {
        const Icon = item.icon;
        return (
          <Box
            key={item.slug}
            component={motion.div}
            variants={hubScaleIn}
            custom={i}
            whileHover={reduce ? {} : hubSpotlightHover}
            whileTap={reduce ? {} : { scale: 0.985 }}
            onClick={() => {
              if (isLaunching) return;
              launchService({
                slug: item.slug,
                name: item.name,
                color: item.color,
                gradient: item.gradient,
                icon: item.slug === "operations" ? "Dashboard" : "BusinessCenter",
                url: item.url,
              });
            }}
            sx={[
              shellPanelSx,
              {
                position: "relative",
                p: { xs: 2.5, md: 3 },
                cursor: "pointer",
                overflow: "hidden",
                backdropFilter: "blur(16px)",
                transition: "border-color 0.25s, box-shadow 0.25s",
                "&:hover": {
                  borderColor: `${item.color}55`,
                  boxShadow: `0 20px 56px ${item.color}28`,
                },
              },
            ]}
          >
            <motion.div
              aria-hidden
              animate={reduce ? {} : { x: [0, 12, 0], y: [0, -8, 0] }}
              transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${item.color}33 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />

            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: item.gradient,
                opacity: 0.06,
                pointerEvents: "none",
              }}
            />

            <Box sx={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Box
                component={motion.div}
                whileHover={reduce ? {} : { rotate: [0, -6, 6, 0], scale: 1.05 }}
                transition={{ duration: 0.45 }}
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: "14px",
                  background: item.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 8px 24px ${item.color}44`,
                }}
              >
                <Icon sx={{ color: "#fff", fontSize: 26 }} />
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                sx={{
                  color: item.color,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  "&:hover": { background: `${item.color}15` },
                }}
              >
                Apri
              </Button>
            </Box>

            <Typography sx={{ fontWeight: 700, fontSize: "1.25rem", mt: 2, mb: 0.5, position: "relative" }}>
              {item.name}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: "0.875rem", mb: 2, position: "relative" }}>
              {item.tagline}
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, position: "relative" }}>
              {item.stats.map((s, si) => (
                <Box
                  key={s}
                  component={motion.div}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + si * 0.08 }}
                  sx={(theme) => {
                    const t = getShellTokens(theme);
                    return {
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 1.5,
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: "text.secondary",
                      background: t.hoverStrong,
                      border: t.border,
                    };
                  }}
                >
                  {s}
                </Box>
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
