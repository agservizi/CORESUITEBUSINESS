"use client";

import { Box, Typography, Button, Chip } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { motion } from "framer-motion";
import { shellPanelSx } from "@/theme/shell-tokens";
import { hubFadeUp } from "@/lib/hub-motion";

interface Props {
  slaBreached: number;
  slaAtRisk: number;
  urgentCount: number;
  onNavigate: (viewId: string) => void;
}

export default function TicketsPulseBanner({ slaBreached, slaAtRisk, urgentCount, onNavigate }: Props) {
  if (slaBreached === 0 && slaAtRisk === 0 && urgentCount === 0) return null;

  return (
    <Box
      component={motion.div}
      variants={hubFadeUp}
      initial="hidden"
      animate="show"
      sx={[
        shellPanelSx,
        {
          mb: 3,
          p: 2,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          borderLeft: "4px solid #ef4444",
          background: "linear-gradient(90deg, rgba(239,68,68,0.08) 0%, transparent 100%)",
        },
      ]}
    >
      <WarningAmberIcon sx={{ color: "#ef4444" }} />
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>Attenzione operativa</Typography>
        <Typography variant="body2" color="text.secondary">
          {slaBreached > 0 && `${slaBreached} SLA scaduti`}
          {slaBreached > 0 && (slaAtRisk > 0 || urgentCount > 0) && " · "}
          {slaAtRisk > 0 && `${slaAtRisk} a rischio entro 4h`}
          {slaAtRisk > 0 && urgentCount > 0 && " · "}
          {urgentCount > 0 && `${urgentCount} urgenti`}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {slaBreached > 0 && (
          <Button size="small" variant="contained" color="error" onClick={() => onNavigate("sla_scaduti")}>
            SLA scaduti
          </Button>
        )}
        {urgentCount > 0 && (
          <Chip
            clickable
            label="Urgenti"
            onClick={() => onNavigate("urgenti")}
            sx={{ fontWeight: 600 }}
          />
        )}
        {slaAtRisk > 0 && (
          <Chip
            clickable
            label="SLA a rischio"
            color="warning"
            onClick={() => onNavigate("sla_rischio")}
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>
    </Box>
  );
}
