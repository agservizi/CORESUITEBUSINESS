"use client";

import { Box, Typography, alpha } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";

interface Props {
  score: number;
  label: string;
  color: string;
  size?: number;
}

export default function SecurityScoreRing({ score, label, color, size = 96 }: Props) {
  const reduce = useReducedMotion();
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
      <Box sx={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={reduce ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: "1.25rem", color: "#fff" }}>
            {score}
          </Typography>
        </Box>
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: alpha("#fff", 0.92),
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontSize: "0.62rem",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
