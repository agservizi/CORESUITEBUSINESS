"use client";

import { Box, Typography, Card, CardContent, alpha } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import { motion } from "framer-motion";

const MotionCard = motion.create(Card);

interface Props {
  label: string;
  value: string;
  sub?: string;
  icon: SvgIconComponent;
  color: string;
  delay?: number;
}

export default function FinanceStatCard({ label, value, sub, icon: Icon, color, delay = 0 }: Props) {
  return (
    <MotionCard
      variant="outlined"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      sx={{
        height: "100%",
        borderColor: alpha(color, 0.28),
        background: `linear-gradient(145deg, ${alpha(color, 0.1)} 0%, transparent 65%)`,
        boxShadow: `0 4px 24px ${alpha(color, 0.08)}`,
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(color, 0.15),
            }}
          >
            <Icon sx={{ color, fontSize: 20 }} />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: "0.04em" }}>
            {label}
          </Typography>
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color, lineHeight: 1.2 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </MotionCard>
  );
}
