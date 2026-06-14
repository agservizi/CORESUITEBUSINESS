"use client";

import { useMemo } from "react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { motion, LayoutGroup } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import StarIcon from "@mui/icons-material/Star";
import HistoryIcon from "@mui/icons-material/History";
import PushPinIcon from "@mui/icons-material/PushPin";
import { useServiceLaunch } from "@/context/ServiceLaunchProvider";
import { getServiceIcon } from "@/lib/service-icons";
import { getShellTokens } from "@/theme/shell-tokens";
import type { PlatformServiceConfig } from "@/config/platform-services";

interface HubQuickAccessProps {
  services: PlatformServiceConfig[];
  pinned: string[];
  recent: string[];
  onTogglePin: (slug: string) => void;
}

function QuickChip({
  service,
  variant,
  onTogglePin,
  isPinned,
}: {
  service: PlatformServiceConfig;
  variant: "pinned" | "recent";
  onTogglePin?: (slug: string) => void;
  isPinned?: boolean;
}) {
  const { launchService, isLaunching } = useServiceLaunch();
  const theme = useTheme();
  const t = getShellTokens(theme);
  const Icon = getServiceIcon(service.icon);

  return (
    <Box
      component={motion.div}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        if (isLaunching || service.status !== "active") return;
        launchService({
          slug: service.slug,
          name: service.name,
          color: service.color,
          gradient: service.gradient,
          icon: service.icon,
          url: service.url,
        });
      }}
      sx={{
        position: "relative",
        flex: "0 0 auto",
        width: 148,
        p: 1.75,
        borderRadius: 2.5,
        cursor: service.status === "active" ? "pointer" : "default",
        background: t.panel,
        backdropFilter: "blur(12px)",
        border: t.border,
        transition: "border-color 0.25s, box-shadow 0.25s",
        "&:hover": service.status === "active"
          ? {
              borderColor: `${service.color}44`,
              boxShadow: `0 8px 24px ${service.color}18`,
            }
          : {},
      }}
    >
      {variant === "pinned" && onTogglePin && (
        <Tooltip title="Rimuovi dai preferiti">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(service.slug);
            }}
            sx={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 24,
              height: 24,
              color: "#fbbf24",
              background: "rgba(251,191,36,0.12)",
              "&:hover": { background: "rgba(251,191,36,0.2)" },
            }}
          >
            <StarIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      )}

      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "10px",
          background: service.gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 1.25,
          boxShadow: `0 4px 12px ${service.color}35`,
        }}
      >
        <Icon sx={{ color: "#fff", fontSize: 18 }} />
      </Box>

      <Typography
        sx={{
          fontWeight: 600,
          fontSize: "0.8rem",
          lineHeight: 1.3,
          pr: variant === "pinned" ? 2 : 0,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {service.name}
      </Typography>

      {variant === "recent" && !isPinned && onTogglePin && (
        <Tooltip title="Aggiungi ai preferiti">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(service.slug);
            }}
            sx={{
              position: "absolute",
              bottom: 8,
              right: 8,
              width: 22,
              height: 22,
              color: "text.secondary",
              opacity: 0.6,
              "&:hover": { opacity: 1, color: "#fbbf24" },
            }}
          >
            <StarIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

export default function HubQuickAccess({
  services,
  pinned,
  recent,
  onTogglePin,
}: HubQuickAccessProps) {
  const theme = useTheme();
  const scrollThumb = getShellTokens(theme).inputBorderHover;
  const serviceMap = useMemo(
    () => new Map(services.map((s) => [s.slug, s])),
    [services]
  );

  const pinnedServices = pinned
    .map((slug) => serviceMap.get(slug))
    .filter(Boolean) as PlatformServiceConfig[];

  const recentServices = recent
    .filter((slug) => !pinned.includes(slug))
    .map((slug) => serviceMap.get(slug))
    .filter(Boolean)
    .slice(0, 6) as PlatformServiceConfig[];

  if (pinnedServices.length === 0 && recentServices.length === 0) return null;

  return (
    <LayoutGroup>
    <Box sx={{ mb: 4 }}>
      {pinnedServices.length > 0 && (
        <Box sx={{ mb: recentServices.length > 0 ? 3 : 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <PushPinIcon sx={{ fontSize: 18, color: "#fbbf24" }} />
            <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>Preferiti</Typography>
            <Typography variant="caption" color="text.secondary">
              {pinnedServices.length} servizi
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              overflowX: "auto",
              pb: 1,
              mx: -0.5,
              px: 0.5,
              "&::-webkit-scrollbar": { height: 4 },
              "&::-webkit-scrollbar-thumb": {
                background: scrollThumb,
                borderRadius: 2,
              },
            }}
          >
            {pinnedServices.map((service, i) => (
              <motion.div
                key={service.slug}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 30, delay: i * 0.04 }}
              >
                <QuickChip
                  service={service}
                  variant="pinned"
                  onTogglePin={onTogglePin}
                  isPinned
                />
              </motion.div>
            ))}
          </Box>
        </Box>
      )}

      {recentServices.length > 0 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <HistoryIcon sx={{ fontSize: 18, color: "primary.light" }} />
            <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>Usati di recente</Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              overflowX: "auto",
              pb: 1,
              mx: -0.5,
              px: 0.5,
              "&::-webkit-scrollbar": { height: 4 },
              "&::-webkit-scrollbar-thumb": {
                background: scrollThumb,
                borderRadius: 2,
              },
            }}
          >
            {recentServices.map((service, i) => (
              <motion.div
                key={service.slug}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 30, delay: i * 0.04 }}
              >
                <QuickChip
                  service={service}
                  variant="recent"
                  onTogglePin={onTogglePin}
                  isPinned={pinned.includes(service.slug)}
                />
              </motion.div>
            ))}
          </Box>
        </Box>
      )}
    </Box>
    </LayoutGroup>
  );
}
