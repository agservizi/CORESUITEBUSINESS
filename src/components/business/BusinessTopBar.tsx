"use client";

import { useEffect, useState } from "react";
import { Box, IconButton, InputBase } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import { topbarShellSx, mergeShellSx, AppShellTopBarActions, topbarIconButtonSx, type AppShellTopBarUser } from "@/components/layout/app-shell";
import HubNotificationsMenu from "@/components/hub/HubNotificationsMenu";
import BusinessCommandPalette from "@/components/business/BusinessCommandPalette";
import AiContextTopBarButton from "@/components/ai/AiContextTopBarButton";
import { shellSearchBoxSx } from "@/theme/shell-tokens";

interface Props {
  user: AppShellTopBarUser;
  onMenuClick: () => void;
}

export default function BusinessTopBar({ user, onMenuClick }: Props) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Box sx={mergeShellSx(topbarShellSx, { px: 2, gap: 1 })}>
        <IconButton
          size="small"
          onClick={onMenuClick}
          sx={{ ...topbarIconButtonSx, display: { md: "none" } }}
        >
          <MenuIcon fontSize="small" />
        </IconButton>

        <Box
          onClick={() => setPaletteOpen(true)}
          sx={[shellSearchBoxSx, { flex: 1, maxWidth: 360 }]}
        >
          <SearchIcon sx={{ color: "text.secondary", fontSize: 18 }} />
          <InputBase
            readOnly
            placeholder="Cerca clienti, lead..."
            sx={{ fontSize: "0.825rem", color: "text.secondary", flex: 1, pointerEvents: "none" }}
          />
          <Box component="span" sx={{ fontSize: "0.7rem", color: "text.secondary", opacity: 0.5 }}>
            ⌘K
          </Box>
        </Box>

        <AppShellTopBarActions user={user}>
          <AiContextTopBarButton />
          <HubNotificationsMenu />
        </AppShellTopBarActions>
      </Box>

      <BusinessCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
