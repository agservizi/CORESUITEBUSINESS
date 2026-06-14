"use client";

import { Box, Typography, Chip, Button } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { motion, useReducedMotion } from "framer-motion";
import { hubFadeUp } from "@/lib/hub-motion";
import { FINANCE_GRADIENT, money } from "./finance-utils";

interface Props {
  serviceColor: string;
  saldoNetto: number;
  todayNetto: number;
  sessionStatus: "OPEN" | "CLOSED" | "NONE";
  pendingCount: number;
  onOpenDay: () => void;
  toolbar?: React.ReactNode;
}

export default function FinanceHero({
  serviceColor,
  saldoNetto,
  todayNetto,
  sessionStatus,
  pendingCount,
  onOpenDay,
  toolbar,
}: Props) {
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
        background: FINANCE_GRADIENT,
        color: "#fff",
      }}
    >
      {!reduce && (
        <>
          <Box
            component={motion.div}
            animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 6, repeat: Infinity }}
            sx={{
              position: "absolute",
              top: -40,
              right: -20,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: -30,
              left: -20,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
        </>
      )}

      <Box sx={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />
            <Typography variant="overline" sx={{ letterSpacing: "0.12em", opacity: 0.9, fontSize: "0.65rem" }}>
              Finance Intelligence
            </Typography>
            <Box
              component={motion.div}
              animate={reduce ? {} : { scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#bbf7d0", ml: 0.5 }}
            />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.35rem", md: "1.65rem" }, mb: 0.5 }}>
            Centro Finanza
          </Typography>
          <Typography sx={{ fontSize: { xs: "1.85rem", md: "2.35rem" }, fontWeight: 800, lineHeight: 1.05, mb: 0.5 }}>
            {money(saldoNetto)}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.88, display: "block" }}>
            Saldo netto periodo · Oggi {money(todayNetto)}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
            <Chip
              size="small"
              label={
                sessionStatus === "OPEN"
                  ? "● Cassa aperta"
                  : sessionStatus === "CLOSED"
                    ? "✓ Giornata chiusa"
                    : "○ Cassa da aprire"
              }
              sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 600 }}
            />
            {pendingCount > 0 && (
              <Chip
                size="small"
                label={`${pendingCount} in sospeso`}
                sx={{ bgcolor: "rgba(0,0,0,0.18)", color: "#fff", fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "flex-start", sm: "flex-end" }, gap: 1.5 }}>
          {toolbar}
          {sessionStatus === "NONE" && (
            <Button
              variant="contained"
              onClick={onOpenDay}
              sx={{
                bgcolor: "#fff",
                color: serviceColor,
                fontWeight: 700,
                px: 2.5,
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                "&:hover": { bgcolor: "#f0fdf4" },
              }}
            >
              Apri giornata
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
