"use client";

import { Box, Typography, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { getPlatformService } from "@/config/platform-services";
import { topbarShellSx, mergeShellSx, AppShellTopBarActions, type AppShellTopBarUser } from "@/components/layout/app-shell";
import AiContextTopBarButton from "@/components/ai/AiContextTopBarButton";

interface PlatformTopBarProps {
  serviceSlug: string;
  user: AppShellTopBarUser;
  onMenuClick: () => void;
}

export default function PlatformTopBar({
  serviceSlug,
  user,
  onMenuClick,
}: PlatformTopBarProps) {
  const service = getPlatformService(serviceSlug);

  return (
    <Box sx={mergeShellSx(topbarShellSx, { px: { xs: 2, md: 3 }, justifyContent: "space-between" })}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <IconButton size="small" onClick={onMenuClick} sx={{ display: { md: "none" } }}>
          <MenuIcon />
        </IconButton>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>
            {service?.name || "Servizio"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            AG Servizi Platform
          </Typography>
        </Box>
      </Box>

      <AppShellTopBarActions
        user={user}
        avatarGradient={service?.gradient || "linear-gradient(135deg, #6366f1, #8b5cf6)"}
      >
        <AiContextTopBarButton />
      </AppShellTopBarActions>
    </Box>
  );
}
