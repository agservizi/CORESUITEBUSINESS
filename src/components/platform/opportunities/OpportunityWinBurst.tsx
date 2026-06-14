"use client";

import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface Props {
  trigger: number;
  title?: string;
  commission?: number;
}

const COLORS = ["#8b5cf6", "#10b981", "#0ea5e9", "#f59e0b", "#ec4899", "#6366f1"];

function Particle({ i, reduce }: { i: number; reduce: boolean }) {
  if (reduce) return null;
  const angle = (i / 24) * Math.PI * 2;
  const dist = 80 + (i % 5) * 28;
  const color = COLORS[i % COLORS.length];
  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      animate={{
        opacity: [1, 1, 0],
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 40,
        scale: [1, 0.4],
        rotate: i * 15,
      }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "absolute",
        width: 8 + (i % 3) * 3,
        height: 8 + (i % 3) * 3,
        borderRadius: i % 2 ? "50%" : 2,
        background: color,
        left: "50%",
        top: "50%",
        marginLeft: -4,
        marginTop: -4,
        pointerEvents: "none",
      }}
    />
  );
}

export default function OpportunityWinBurst({ trigger, title, commission }: Props) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <AnimatePresence>
      {visible && (
        <Box
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            bgcolor: "rgba(0,0,0,0.25)",
            backdropFilter: "blur(4px)",
          }}
        >
          <Box sx={{ position: "relative", textAlign: "center" }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <Particle key={i} i={i} reduce={!!reduce} />
            ))}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
            >
              <Box
                sx={{
                  px: 4,
                  py: 3,
                  borderRadius: 4,
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  boxShadow: "0 24px 64px rgba(16,185,129,0.45)",
                  color: "#fff",
                  minWidth: 280,
                }}
              >
                <EmojiEventsIcon sx={{ fontSize: 48, mb: 1 }} />
                <Typography sx={{ fontWeight: 800, fontSize: "1.35rem" }}>Opportunità vinta!</Typography>
                {title && (
                  <Typography sx={{ mt: 0.5, fontSize: "0.9rem", opacity: 0.95 }}>{title}</Typography>
                )}
                {commission != null && commission > 0 && (
                  <Typography sx={{ mt: 1, fontWeight: 700, fontSize: "1.1rem" }}>
                    +€{commission.toLocaleString("it-IT")}
                  </Typography>
                )}
              </Box>
            </motion.div>
          </Box>
        </Box>
      )}
    </AnimatePresence>
  );
}
