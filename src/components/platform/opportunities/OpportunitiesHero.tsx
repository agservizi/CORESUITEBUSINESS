"use client";

import { Box, Typography, Chip, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import BoltIcon from "@mui/icons-material/Bolt";
import { motion, useReducedMotion } from "framer-motion";
import { hubFadeUp } from "@/lib/hub-motion";
import { oppHeroGlow } from "./opportunities-motion";
import { OPPORTUNITY_GRADIENT } from "./opportunities-utils";

interface Props {
  serviceColor: string;
  liveCount: number | null;
  winRate: number;
  monthlyPct: number;
  onNew: () => void;
}

export default function OpportunitiesHero({ serviceColor, liveCount, winRate, monthlyPct, onNew }: Props) {
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
        background: OPPORTUNITY_GRADIENT,
        color: "#fff",
      }}
    >
      {!reduce && (
        <>
          <Box
            component={motion.div}
            {...oppHeroGlow}
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
          <Box
            component={motion.div}
            animate={{ rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            sx={{
              position: "absolute",
              bottom: -80,
              left: -60,
              width: 200,
              height: 200,
              borderRadius: "50%",
              border: "1px dashed rgba(255,255,255,0.15)",
              pointerEvents: "none",
            }}
          />
        </>
      )}

      <Box sx={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <BoltIcon sx={{ fontSize: 20, opacity: 0.9 }} />
            <Typography variant="overline" sx={{ letterSpacing: "0.14em", opacity: 0.85, fontSize: "0.65rem" }}>
              Premium Intelligence
            </Typography>
            <Box
              component={motion.div}
              animate={reduce ? {} : { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#22c55e", ml: 0.5 }}
            />
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600 }}>
              Live
            </Typography>
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.5rem", md: "1.85rem" }, lineHeight: 1.15, mb: 1 }}>
            Centro Opportunità
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {liveCount != null && (
              <Chip
                size="small"
                label={`${liveCount} contratti attivi`}
                sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 600, height: 26 }}
              />
            )}
            <Chip
              size="small"
              label={`Win rate ${winRate}%`}
              sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff", height: 26 }}
            />
            <Chip
              size="small"
              label={`Obiettivo mese ${monthlyPct}%`}
              sx={{ bgcolor: monthlyPct >= 70 ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.12)", color: "#fff", height: 26 }}
            />
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onNew}
          sx={{
            bgcolor: "#fff",
            color: serviceColor,
            fontWeight: 700,
            "&:hover": { bgcolor: "rgba(255,255,255,0.92)" },
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          }}
        >
          Nuovo contratto
        </Button>
      </Box>
    </Box>
  );
}
