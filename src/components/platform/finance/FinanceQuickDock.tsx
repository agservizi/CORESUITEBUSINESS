"use client";

import { Box, Fab, Tooltip, Zoom, alpha } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { motion } from "framer-motion";
import { FINANCE_COLORS } from "./finance-utils";

interface Props {
  serviceColor: string;
  onNew: () => void;
  onSearch: () => void;
  onDay: () => void;
  onReport: () => void;
}

export default function FinanceQuickDock({ serviceColor, onNew, onSearch, onDay, onReport }: Props) {
  const actions = [
    { label: "Cerca (Ctrl+K)", icon: SearchIcon, onClick: onSearch, color: FINANCE_COLORS.express },
    { label: "Giornata cassa", icon: AccountBalanceWalletIcon, onClick: onDay, color: FINANCE_COLORS.cash },
    { label: "Report", icon: AssessmentIcon, onClick: onReport, color: FINANCE_COLORS.card },
  ];

  return (
    <Box
      sx={{
        position: "fixed",
        right: { xs: 16, md: 24 },
        bottom: { xs: 16, md: 24 },
        zIndex: 1200,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 1.25,
      }}
    >
      {actions.map((action, i) => (
        <Zoom key={action.label} in style={{ transitionDelay: `${i * 50}ms` }}>
          <Tooltip title={action.label} placement="left">
            <Fab
              size="small"
              onClick={action.onClick}
              sx={{
                bgcolor: alpha(action.color, 0.12),
                color: action.color,
                border: `1px solid ${alpha(action.color, 0.3)}`,
                backdropFilter: "blur(8px)",
                "&:hover": { bgcolor: alpha(action.color, 0.22), transform: "scale(1.05)" },
              }}
            >
              <action.icon fontSize="small" />
            </Fab>
          </Tooltip>
        </Zoom>
      ))}

      <Box component={motion.div} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}>
        <Tooltip title="Nuovo movimento" placement="left">
          <Fab
            onClick={onNew}
            sx={{
              background: serviceColor,
              color: "#fff",
              boxShadow: `0 8px 32px ${alpha(serviceColor, 0.45)}`,
              "&:hover": { background: serviceColor, filter: "brightness(1.05)" },
            }}
          >
            <AddIcon />
          </Fab>
        </Tooltip>
      </Box>
    </Box>
  );
}
