"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Typography, Button, Collapse, IconButton } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CloseIcon from "@mui/icons-material/Close";
import { motion } from "framer-motion";
import { shellPanelSx } from "@/theme/shell-tokens";

interface Props {
  onNavigate: (viewId: string) => void;
}

export default function OpportunitiesPulseBanner({ onNavigate }: Props) {
  const [staleCount, setStaleCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/platform/opportunities/insights");
    const data = await res.json();
    setStaleCount(data.stale?.length ?? 0);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (dismissed || staleCount === 0) return null;

  return (
    <Collapse in>
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        sx={[
          shellPanelSx,
          {
            mb: 2,
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
            borderLeft: "4px solid #f59e0b",
            background: "linear-gradient(90deg, #f59e0b12 0%, transparent 100%)",
          },
        ]}
      >
        <WarningAmberIcon sx={{ color: "#f59e0b" }} />
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
            {staleCount} contratt{staleCount === 1 ? "o" : "i"} ferm{staleCount === 1 ? "o" : "i"} da oltre 14 giorni
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Rischio perdita commissioni — interveni subito sui follow-up
          </Typography>
        </Box>
        <Button size="small" variant="contained" onClick={() => onNavigate("verifica")} sx={{ bgcolor: "#f59e0b", "&:hover": { bgcolor: "#d97706" } }}>
          Vedi in verifica
        </Button>
        <IconButton size="small" onClick={() => setDismissed(true)} aria-label="Chiudi">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Collapse>
  );
}
