"use client";

import { Box, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import ViewCompactIcon from "@mui/icons-material/ViewCompact";
import ViewComfyIcon from "@mui/icons-material/ViewComfy";
import { motion, useReducedMotion } from "framer-motion";
import type { HubLayoutDensity } from "@/lib/hub-layout";
import { getShellTokens } from "@/theme/shell-tokens";
import { hubFadeUp, hubSpring } from "@/lib/hub-motion";

interface HubLayoutToolbarProps {
  density: HubLayoutDensity;
  onDensityChange: (density: HubLayoutDensity) => void;
}

export default function HubLayoutToolbar({ density, onDensityChange }: HubLayoutToolbarProps) {
  const reduce = useReducedMotion();

  return (
    <Box
      component={motion.div}
      variants={hubFadeUp}
      initial="hidden"
      animate="show"
      sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1, mb: 2 }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        Layout workspace
      </Typography>
      <Box sx={{ position: "relative" }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={density}
          onChange={(_, v: HubLayoutDensity | null) => v && onDensityChange(v)}
          sx={{
            position: "relative",
            "& .MuiToggleButton-root": {
              border: (theme) => getShellTokens(theme).border,
              px: 1.25,
              py: 0.5,
              textTransform: "none",
              fontSize: "0.72rem",
              zIndex: 1,
            },
          }}
        >
          <ToggleButton value="comfortable" component={motion.button} whileTap={reduce ? {} : { scale: 0.96 }}>
            <Tooltip title="Layout espanso">
              <ViewComfyIcon sx={{ fontSize: 16, mr: 0.5 }} />
            </Tooltip>
            Espanso
          </ToggleButton>
          <ToggleButton value="compact" component={motion.button} whileTap={reduce ? {} : { scale: 0.96 }}>
            <Tooltip title="Layout compatto">
              <ViewCompactIcon sx={{ fontSize: 16, mr: 0.5 }} />
            </Tooltip>
            Compatto
          </ToggleButton>
        </ToggleButtonGroup>
        <Box
          component={motion.div}
          layout
          layoutId="hub-density-indicator"
          transition={hubSpring}
          sx={{
            position: "absolute",
            top: 2,
            bottom: 2,
            left: density === "comfortable" ? 2 : "50%",
            width: "calc(50% - 2px)",
            borderRadius: 1,
            bgcolor: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.25)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      </Box>
    </Box>
  );
}
