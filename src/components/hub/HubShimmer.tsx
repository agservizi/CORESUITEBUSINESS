"use client";

import { Box, Skeleton } from "@mui/material";
import { shellPanelSx } from "@/theme/shell-tokens";
import { HUB_CARD_HEIGHT } from "@/lib/hub-layout";
import type { HubLayoutDensity } from "@/lib/hub-layout";

export function HubCardShimmer({ density = "comfortable" }: { density?: HubLayoutDensity }) {
  return (
    <Box
      sx={(theme) => ({
        ...shellPanelSx(theme),
        height: "100%",
        minHeight: HUB_CARD_HEIGHT[density],
        p: 2.5,
        position: "relative",
        overflow: "hidden",
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
          animation: "hubShimmer 1.6s infinite",
        },
        "@keyframes hubShimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      })}
    >
      <Skeleton variant="rounded" width={42} height={42} sx={{ mb: 2, bgcolor: "action.hover" }} />
      <Skeleton width="70%" height={20} sx={{ mb: 1, bgcolor: "action.hover" }} />
      <Skeleton width="90%" height={14} sx={{ bgcolor: "action.hover" }} />
    </Box>
  );
}

export function HubKpiShimmer() {
  return (
    <Box
      sx={[
        shellPanelSx,
        {
          p: 2,
          minHeight: 88,
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
            animation: "hubShimmer 1.6s infinite",
          },
        },
      ]}
    >
      <Skeleton width={80} height={14} sx={{ mb: 1, bgcolor: "action.hover" }} />
      <Skeleton width={60} height={28} sx={{ bgcolor: "action.hover" }} />
    </Box>
  );
}
