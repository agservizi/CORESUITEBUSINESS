"use client";

import { Box, Typography, Chip, alpha } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import { hubFadeUp } from "@/lib/hub-motion";
import type { ServiceViewTheme } from "./service-view-themes";

interface Props {
  theme: ServiceViewTheme;
  badge?: string;
  children?: React.ReactNode;
}

export default function ServiceViewHero({ theme, badge, children }: Props) {
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
        p: { xs: 2.5, md: 3 },
        background: theme.gradient,
        color: "#fff",
        boxShadow: `0 12px 40px ${alpha(theme.color, 0.28)}`,
      }}
    >
      {!reduce && (
        <Box
          component={motion.div}
          animate={{ scale: [1, 1.12, 1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 7, repeat: Infinity }}
          sx={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
      )}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 15% 85%, rgba(255,255,255,0.12) 0%, transparent 45%)",
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "flex-start",
        }}
      >
        <Box>
          <Typography variant="overline" sx={{ letterSpacing: "0.14em", opacity: 0.88, fontSize: "0.62rem" }}>
            {theme.serviceName}
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.45rem", md: "1.75rem" }, mb: 0.5 }}>
            {theme.title}
          </Typography>
          <Typography sx={{ opacity: 0.9, maxWidth: 480, fontSize: "0.9rem" }}>
            {theme.subtitle}
          </Typography>
          {badge && (
            <Chip
              size="small"
              label={badge}
              sx={{ mt: 1.5, bgcolor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 700 }}
            />
          )}
        </Box>
        {children}
      </Box>
    </Box>
  );
}
