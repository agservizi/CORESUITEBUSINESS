"use client";

import { Box, Typography, Chip, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import { motion, useReducedMotion } from "framer-motion";
import { hubFadeUp } from "@/lib/hub-motion";
import { ticketHeroGlow } from "./tickets-motion";
import { TICKETS_GRADIENT } from "./tickets-utils";

interface Props {
  serviceColor: string;
  liveOpen: number | null;
  urgentCount: number;
  slaBreached: number;
  onNew: () => void;
}

export default function TicketsHero({ serviceColor, liveOpen, urgentCount, slaBreached, onNew }: Props) {
  const reduce = useReducedMotion();

  return (
    <Box
      component={motion.div}
      variants={hubFadeUp}
      initial="hidden"
      animate="show"
      sx={{
        position: "relative",
        borderRadius: 3,
        overflow: "hidden",
        mb: 3,
        p: { xs: 2.5, md: 3.5 },
        background: TICKETS_GRADIENT,
        color: "#fff",
      }}
    >
      {!reduce && (
        <Box
          component={motion.div}
          {...ticketHeroGlow}
          sx={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
      )}

      <Box sx={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <SupportAgentIcon sx={{ fontSize: 20, opacity: 0.9 }} />
            <Typography variant="overline" sx={{ letterSpacing: "0.14em", opacity: 0.85, fontSize: "0.65rem" }}>
              Assistenza Command Center
            </Typography>
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.5rem", md: "1.85rem" }, mb: 0.5, letterSpacing: "-0.02em" }}>
            Ticket & Assistenza
          </Typography>
          <Typography sx={{ opacity: 0.9, maxWidth: 520, fontSize: "0.925rem" }}>
            SLA, messaggistica multicanale e triage operativo — tutto in tempo reale.
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
            {liveOpen != null && (
              <Chip
                size="small"
                label={`${liveOpen} aperti`}
                sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 600 }}
              />
            )}
            {urgentCount > 0 && (
              <Chip
                size="small"
                label={`${urgentCount} urgenti`}
                sx={{ bgcolor: "rgba(239,68,68,0.35)", color: "#fff", fontWeight: 600 }}
              />
            )}
            {slaBreached > 0 && (
              <Chip
                size="small"
                label={`${slaBreached} SLA scaduti`}
                sx={{ bgcolor: "rgba(245,158,11,0.35)", color: "#fff", fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onNew}
          sx={{
            bgcolor: "rgba(255,255,255,0.95)",
            color: serviceColor,
            fontWeight: 700,
            "&:hover": { bgcolor: "#fff" },
          }}
        >
          Nuovo ticket
        </Button>
      </Box>
    </Box>
  );
}
