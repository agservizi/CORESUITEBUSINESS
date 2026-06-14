"use client";

import { Box } from "@mui/material";
import { motion } from "framer-motion";
import { getShellTokens } from "@/theme/shell-tokens";

export default function HubAmbientBackground() {
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
          background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
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
          background: "radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)",
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
          background: "radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)",
          filter: "blur(45px)",
        }}
      />
    </Box>
  );
}
