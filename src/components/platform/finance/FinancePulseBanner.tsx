"use client";

import { Box, Button, Typography, alpha } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FINANCE_COLORS } from "./finance-utils";

interface Props {
  sessionStatus: "OPEN" | "CLOSED" | "NONE" | null;
}

export default function FinancePulseBanner({ sessionStatus }: Props) {
  const router = useRouter();

  if (sessionStatus === "OPEN" || sessionStatus === "CLOSED" || sessionStatus === null) {
    return null;
  }

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      sx={{
        mb: 2,
        p: 1.75,
        borderRadius: 2.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1.5,
        background: `linear-gradient(90deg, ${alpha(FINANCE_COLORS.pending, 0.15)} 0%, ${alpha(FINANCE_COLORS.pending, 0.05)} 100%)`,
        border: `1px solid ${alpha(FINANCE_COLORS.pending, 0.35)}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(FINANCE_COLORS.pending, 0.2),
          }}
        >
          <WarningAmberIcon sx={{ color: FINANCE_COLORS.pending, fontSize: 20 }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: FINANCE_COLORS.pending }}>
            Giornata cassa non aperta
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Inserisci il fondo mattina per quadratura e giornale serale
          </Typography>
        </Box>
      </Box>
      <Button
        variant="contained"
        size="small"
        onClick={() => router.push("/services/entrate-uscite?v=giornata&open=1")}
        sx={{ bgcolor: FINANCE_COLORS.pending, fontWeight: 700, "&:hover": { bgcolor: "#d97706" } }}
      >
        Apri cassa
      </Button>
    </Box>
  );
}
