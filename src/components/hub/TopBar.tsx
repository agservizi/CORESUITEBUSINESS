"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import SearchIcon from "@mui/icons-material/Search";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useRouter } from "next/navigation";
import { getRoleLabel } from "@/lib/roles";
import { useThemeMode } from "@/context/ThemeModeProvider";
import { getShellTokens, shellMenuPaperSx } from "@/theme/shell-tokens";
import HubNotificationsMenu from "./HubNotificationsMenu";
import AiContextTopBarButton from "@/components/ai/AiContextTopBarButton";

interface TopBarProps {
  user: {
    name?: string | null;
    email: string;
    role: string;
  };
  onSearchClick?: () => void;
}

function getInitials(name?: string | null, email?: string) {
  if (name) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return email?.[0]?.toUpperCase() || "U";
}

export default function TopBar({ user, onSearchClick }: TopBarProps) {
  const router = useRouter();
  const theme = useTheme();
  const t = getShellTokens(theme);
  const { mode, toggleMode } = useThemeMode();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: t.chrome,
        backdropFilter: "blur(20px)",
        borderBottom: t.border,
        px: { xs: 2, md: 4 },
        py: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "9px",
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
            C
          </Typography>
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em" }}>
          Coresuite
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {onSearchClick && (
          <Tooltip title="Cerca servizio (Ctrl+K)">
            <IconButton size="small" onClick={onSearchClick} sx={{ color: "text.secondary" }}>
              <SearchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title={mode === "dark" ? "Tema chiaro" : "Tema scuro"}>
          <IconButton size="small" onClick={toggleMode} sx={{ color: "text.secondary" }}>
            {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        <AiContextTopBarButton />

        <HubNotificationsMenu />

        <Tooltip title="Account">
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", ml: 0.5 }}
            onClick={(e) => setAnchor(e.currentTarget)}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: "0.75rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            >
              {getInitials(user.name, user.email)}
            </Avatar>
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <Typography sx={{ fontWeight: 600, lineHeight: 1.2, fontSize: "0.825rem" }}>
                {user.name || user.email}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                {getRoleLabel(user.role)}
              </Typography>
            </Box>
          </Box>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        slotProps={{
          paper: {
            sx: [
              shellMenuPaperSx,
              {
                mt: 1,
                minWidth: 200,
                backdropFilter: "blur(20px)",
                boxShadow: theme.palette.mode === "dark" ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(15,23,42,0.1)",
              },
            ],
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>{user.name || "Utente"}</Typography>
          <Typography variant="caption" color="text.secondary">{user.email}</Typography>
        </Box>
        <Divider sx={{ borderColor: t.borderColor }} />
        <MenuItem onClick={() => { setAnchor(null); router.push("/profile"); }}>
          <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
          Profilo
        </MenuItem>
        <Divider sx={{ borderColor: t.borderColor }} />
        <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
          <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: "error.main" }} /></ListItemIcon>
          Disconnetti
        </MenuItem>
      </Menu>
    </Box>
  );
}
