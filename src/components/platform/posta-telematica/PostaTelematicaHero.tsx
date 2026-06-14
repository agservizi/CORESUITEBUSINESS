"use client";

import { Box, Typography, Button, Chip } from "@mui/material";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import SendIcon from "@mui/icons-material/Send";
import SyncIcon from "@mui/icons-material/Sync";
import { motion, useReducedMotion } from "framer-motion";
import { hubFadeUp } from "@/lib/hub-motion";
import { POSTA_GRADIENT } from "./posta-utils";

interface Props {
  serviceColor: string;
  todaySent: number;
  pendingReceipts: number;
  inboxUnread: number;
  smtpOk: boolean;
  onNavigate: (viewId: string) => void;
}

export default function PostaTelematicaHero({
  serviceColor,
  todaySent,
  pendingReceipts,
  inboxUnread,
  smtpOk,
  onNavigate,
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
        background: POSTA_GRADIENT,
        color: "#fff",
      }}
    >
      {!reduce && (
        <Box
          component={motion.div}
          animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.05, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
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
      )}

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <MarkEmailReadIcon sx={{ fontSize: 20, opacity: 0.9 }} />
            <Typography variant="overline" sx={{ letterSpacing: "0.14em", opacity: 0.85, fontSize: "0.65rem" }}>
              Posta certificata & invii
            </Typography>
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.5rem", md: "1.85rem" }, mb: 0.5, letterSpacing: "-0.02em" }}>
            Posta Telematica
          </Typography>
          <Typography sx={{ opacity: 0.9, maxWidth: 520, fontSize: "0.925rem" }}>
            Invii PEC ed email per cliente, ricevute PDF automatiche e tracciamento accettazione/consegna.
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
            <Chip size="small" label={`${todaySent} invii oggi`} sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 600 }} />
            {pendingReceipts > 0 && (
              <Chip
                size="small"
                label={`${pendingReceipts} ricevute in attesa`}
                sx={{ bgcolor: "rgba(245,158,11,0.35)", color: "#fff", fontWeight: 600 }}
              />
            )}
            {inboxUnread > 0 && (
              <Chip
                size="small"
                label={`${inboxUnread} non letti`}
                sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff", fontWeight: 600 }}
              />
            )}
            <Chip
              size="small"
              label={smtpOk ? "Casella operativa" : "SMTP da configurare"}
              sx={{
                bgcolor: smtpOk ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)",
                color: "#fff",
                fontWeight: 600,
              }}
            />
          </Box>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => onNavigate("invio")}
            sx={{ bgcolor: "rgba(255,255,255,0.95)", color: serviceColor, fontWeight: 700, "&:hover": { bgcolor: "#fff" } }}
          >
            Nuovo invio
          </Button>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={() => onNavigate("inbox")}
            sx={{ borderColor: "rgba(255,255,255,0.5)", color: "#fff", fontWeight: 600, "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.08)" } }}
          >
            Sincronizza casella
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
