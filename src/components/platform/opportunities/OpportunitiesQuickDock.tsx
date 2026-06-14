"use client";

import { Box, Fab, Tooltip, Zoom } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import BoltIcon from "@mui/icons-material/Bolt";
import { motion } from "framer-motion";

interface Props {
  serviceColor: string;
  onNew: () => void;
  onPipeline: () => void;
  onSearch: () => void;
  onDashboard: () => void;
}

export default function OpportunitiesQuickDock({
  serviceColor,
  onNew,
  onPipeline,
  onSearch,
  onDashboard,
}: Props) {
  const actions = [
    { label: "Cerca (Ctrl+K)", icon: SearchIcon, onClick: onSearch, color: "#6366f1" },
    { label: "Pipeline", icon: ViewKanbanIcon, onClick: onPipeline, color: "#0ea5e9" },
    { label: "Dashboard", icon: BoltIcon, onClick: onDashboard, color: "#f59e0b" },
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
                bgcolor: `${action.color}18`,
                color: action.color,
                border: `1px solid ${action.color}44`,
                boxShadow: `0 4px 20px ${action.color}33`,
                "&:hover": { bgcolor: `${action.color}28` },
              }}
            >
              <action.icon fontSize="small" />
            </Fab>
          </Tooltip>
        </Zoom>
      ))}

      <Box component={motion.div} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
        <Tooltip title="Nuovo contratto" placement="left">
          <Fab
            onClick={onNew}
            sx={{
              background: `linear-gradient(135deg, ${serviceColor} 0%, #7c3aed 100%)`,
              color: "#fff",
              boxShadow: `0 8px 28px ${serviceColor}55`,
            }}
          >
            <AddIcon />
          </Fab>
        </Tooltip>
      </Box>
    </Box>
  );
}
