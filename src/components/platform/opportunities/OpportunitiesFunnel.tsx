"use client";

import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";
import { money } from "./opportunities-utils";

interface FunnelStep {
  status: string;
  label: string;
  color: string;
  count: number;
  commission?: number;
  pct: number;
}

interface Props {
  steps: FunnelStep[];
  serviceColor: string;
}

export default function OpportunitiesFunnel({ steps, serviceColor }: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  return (
    <Box sx={[shellPanelSx, { p: 2.5 }]}>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>Funnel di conversione</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {steps.map((step, i) => {
          const widthPct = Math.max(12, Math.round((step.count / maxCount) * 100));
          return (
            <Box key={step.status} component={motion.div} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5, gap: 1 }}>
                <Typography sx={{ fontSize: "0.825rem", fontWeight: 600, color: step.color }}>{step.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {step.count} · {step.pct}%
                  {step.commission != null ? ` · ${money(step.commission)}` : ""}
                </Typography>
              </Box>
              <Box sx={{ height: 28, borderRadius: 2, bgcolor: shell.progressTrack, overflow: "hidden", position: "relative" }}>
                <Box
                  component={motion.div}
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                  sx={{
                    height: "100%",
                    borderRadius: 2,
                    background: `linear-gradient(90deg, ${step.color} 0%, ${step.color}cc 100%)`,
                    boxShadow: `inset 0 -2px 8px ${step.color}44`,
                  }}
                />
              </Box>
            </Box>
          );
        })}
      </Box>
      {steps.every((s) => s.count === 0) && (
        <Typography color="text.secondary" sx={{ fontSize: "0.875rem", mt: 1 }}>Nessun contratto nel funnel</Typography>
      )}
    </Box>
  );
}
