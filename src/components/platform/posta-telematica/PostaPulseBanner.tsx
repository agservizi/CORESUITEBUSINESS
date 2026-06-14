"use client";

import { Box, Typography, Button } from "@mui/material";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import { motion } from "framer-motion";
import { shellPanelSx } from "@/theme/shell-tokens";
import { hubFadeUp } from "@/lib/hub-motion";

interface Props {
  pendingReceipts: number;
  failedCount: number;
  onNavigate: (viewId: string) => void;
}

export default function PostaPulseBanner({ pendingReceipts, failedCount, onNavigate }: Props) {
  if (pendingReceipts === 0 && failedCount === 0) return null;

  const isError = failedCount > 0;

  return (
    <Box
      component={motion.div}
      variants={hubFadeUp}
      initial="hidden"
      animate="show"
      sx={[
        shellPanelSx,
        {
          mb: 3,
          p: 2,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          borderLeft: `4px solid ${isError ? "#ef4444" : "#f59e0b"}`,
          background: isError
            ? "linear-gradient(90deg, rgba(239,68,68,0.08) 0%, transparent 100%)"
            : "linear-gradient(90deg, rgba(245,158,11,0.08) 0%, transparent 100%)",
        },
      ]}
    >
      {isError ? (
        <ErrorOutlineOutlinedIcon sx={{ color: "#ef4444" }} />
      ) : (
        <HourglassTopIcon sx={{ color: "#f59e0b" }} />
      )}
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
          {isError ? "Invii da verificare" : "Ricevute PEC in attesa"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {failedCount > 0 && `${failedCount} invii falliti`}
          {failedCount > 0 && pendingReceipts > 0 && " · "}
          {pendingReceipts > 0 && `${pendingReceipts} PEC in attesa di accettazione/consegna`}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {failedCount > 0 && (
          <Button size="small" variant="contained" color="error" onClick={() => onNavigate("storico")}>
            Storico errori
          </Button>
        )}
        {pendingReceipts > 0 && (
          <Button size="small" variant="contained" color="warning" onClick={() => onNavigate("inbox")}>
            Sync ricevute
          </Button>
        )}
      </Box>
    </Box>
  );
}
