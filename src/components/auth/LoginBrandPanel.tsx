"use client";

import { Box, Typography, Chip, alpha } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import BoltIcon from "@mui/icons-material/Bolt";
import PaymentsIcon from "@mui/icons-material/Payments";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import HubAmbientBackground from "@/components/hub/HubAmbientBackground";
import { hubFadeUpSoft, hubStaggerContainer } from "@/lib/hub-motion";
import CoresuiteLogo from "@/components/brand/CoresuiteLogo";

const HIGHLIGHTS = [
  { icon: BoltIcon, label: "Express", color: "#6366f1" },
  { icon: PaymentsIcon, label: "Entrate & Uscite", color: "#22c55e" },
  { icon: ConfirmationNumberIcon, label: "Ticket & SLA", color: "#0ea5e9" },
  { icon: TrendingUpIcon, label: "Opportunities", color: "#8b5cf6" },
];

export default function LoginBrandPanel() {
  const reduce = useReducedMotion();

  return (
    <Box
      sx={{
        position: "relative",
        display: { xs: "none", md: "flex" },
        flex: 1,
        flexDirection: "column",
        justifyContent: "space-between",
        p: { md: 5, lg: 7 },
        overflow: "hidden",
        background: "linear-gradient(145deg, #4338ca 0%, #6366f1 38%, #8b5cf6 72%, #a855f7 100%)",
        color: "#fff",
      }}
    >
      <HubAmbientBackground />

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.12) 0%, transparent 45%)",
          pointerEvents: "none",
        }}
      />

      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Box sx={{ mb: 6 }}>
          <CoresuiteLogo size="lg" showTagline variant="onDark" link={false} />
        </Box>

        <Typography
          component={motion.h1}
          variants={reduce ? undefined : hubFadeUpSoft}
          initial={reduce ? undefined : "hidden"}
          animate={reduce ? undefined : "show"}
          sx={{
            fontWeight: 800,
            fontSize: { md: "2.25rem", lg: "2.75rem" },
            lineHeight: 1.12,
            letterSpacing: "-0.03em",
            maxWidth: 420,
            mb: 2,
          }}
        >
          Il command center per ogni servizio del tuo business
        </Typography>

        <Typography sx={{ opacity: 0.88, fontSize: "1.05rem", maxWidth: 400, lineHeight: 1.55 }}>
          CRM, cassa, pratiche, spedizioni e assistenza — un unico hub operativo con dashboard live e AI integrata.
        </Typography>
      </Box>

      <Box
        component={motion.div}
        variants={reduce ? undefined : hubStaggerContainer}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "show"}
        sx={{ position: "relative", zIndex: 1 }}
      >
        <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: "0.14em", mb: 1.5, display: "block" }}>
          Moduli attivi
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 4 }}>
          {HIGHLIGHTS.map(({ icon: Icon, label, color }) => (
            <Box
              key={label}
              component={reduce ? "div" : motion.div}
              variants={reduce ? undefined : hubFadeUpSoft}
            >
              <Chip
                icon={<Icon sx={{ color: "#fff !important", fontSize: 18 }} />}
                label={label}
                sx={{
                  bgcolor: "rgba(255,255,255,0.14)",
                  color: "#fff",
                  fontWeight: 600,
                  border: `1px solid ${alpha(color, 0.35)}`,
                  backdropFilter: "blur(8px)",
                }}
              />
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1.25,
            borderRadius: 2,
            bgcolor: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.18)",
            width: "fit-content",
          }}
        >
          <ShieldOutlinedIcon sx={{ fontSize: 20, opacity: 0.9 }} />
          <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.92 }}>
            Accesso protetto · MFA · Audit log · Sessioni sicure
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
