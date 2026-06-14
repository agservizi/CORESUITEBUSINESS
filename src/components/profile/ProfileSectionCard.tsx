"use client";

import { Box, Typography, Paper, alpha } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import { motion } from "framer-motion";
import { hubFadeUpSoft } from "@/lib/hub-motion";
import { shellPaperSx } from "@/theme/shell-tokens";

interface Props {
  title: string;
  subtitle?: string;
  icon: SvgIconComponent;
  accent: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  delay?: number;
}

export default function ProfileSectionCard({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
  action,
  delay = 0,
}: Props) {
  return (
    <Paper
      component={motion.div}
      variants={hubFadeUpSoft}
      initial="hidden"
      animate="show"
      transition={{ delay }}
      sx={[
        shellPaperSx,
        {
          p: { xs: 2.5, md: 3 },
          overflow: "hidden",
          position: "relative",
          borderTop: `3px solid ${accent}`,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? `linear-gradient(145deg, ${alpha(accent, 0.08)} 0%, rgba(13,17,23,0.85) 55%)`
              : `linear-gradient(145deg, ${alpha(accent, 0.06)} 0%, rgba(255,255,255,0.98) 55%)`,
        },
      ]}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, mb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(accent, 0.14),
              flexShrink: 0,
            }}
          >
            <Icon sx={{ color: accent, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {action}
      </Box>
      {children}
    </Paper>
  );
}
