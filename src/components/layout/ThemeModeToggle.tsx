"use client";

import { IconButton, Tooltip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useThemeMode } from "@/context/ThemeModeProvider";

export default function ThemeModeToggle() {
  const theme = useTheme();
  const { mode, toggleMode } = useThemeMode();
  const isDark = theme.palette.mode === "dark";

  return (
    <Tooltip title={isDark ? "Tema chiaro" : "Tema scuro"}>
      <IconButton size="small" onClick={toggleMode} sx={{ color: "text.secondary" }}>
        {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
