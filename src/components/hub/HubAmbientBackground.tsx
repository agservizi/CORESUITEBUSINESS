"use client";

import { Box } from "@mui/material";
import { motion } from "framer-motion";
import { getShellTokens } from "@/theme/shell-tokens";
import { getHubRoleAccent } from "@/lib/hub-role-accent";

interface HubAmbientBackgroundProps {
  role?: string;
}

export default function HubAmbientBackground({ role = "USER" }: HubAmbientBackgroundProps) {
  const accent = getHubRoleAccent(role);

  return (
    <Box sx={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <Box
        sx={(theme) => {
          const grid = getShellTokens(theme).gridLine;
          return {
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(${grid} 1px, transparent 1px),
              linear-gradient(90deg, ${grid} 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 85%)",
          };
        }}
      />

      <Box
        component={motion.div}
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        sx={{
          position: "absolute",
          top: "-20%",
          left: "10%",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent.meshA} 0%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />
      <Box
        component={motion.div}
        animate={{ x: [0, -40, 0], y: [0, 25, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        sx={{
          position: "absolute",
          top: "5%",
          right: "5%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent.meshB} 0%, transparent 70%)`,
          filter: "blur(50px)",
        }}
      />
      <Box
        component={motion.div}
        animate={{ x: [0, 20, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        sx={{
          position: "absolute",
          bottom: "10%",
          left: "35%",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent.meshC} 0%, transparent 70%)`,
          filter: "blur(45px)",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          opacity: 0.045,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          mixBlendMode: "overlay",
        }}
      />
    </Box>
  );
}
