"use client";

import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import { motion } from "framer-motion";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import { getPlatformService } from "@/config/platform-services";
import { getPlatformNavIcon } from "./platform-nav-icons";
import {
  APP_SHELL,
  getSidebarHeaderSx,
  SIDEBAR_TOGGLE_LABELS,
  sidebarShellSx,
  sidebarToggleButtonSx,
  mergeShellSx,
} from "@/components/layout/app-shell";

interface PlatformSidebarProps {
  open: boolean;
  onToggle: () => void;
  width: number;
  collapsedWidth: number;
  userRole?: string;
}

export default function PlatformSidebar({
  open,
  onToggle,
  width,
  collapsedWidth,
  userRole = "",
}: PlatformSidebarProps) {
  const router = useRouter();
  const { serviceSlug, viewId, navigate } = usePlatformNavigation();
  const service = getPlatformService(serviceSlug);

  if (!service) return null;

  const navItems = service.nav.filter((item) => {
    if (!item.roles?.length) return true;
    if (userRole === "SUPER_ADMIN") return true;
    return item.roles.includes(userRole);
  });

  return (
    <Box
      component={motion.aside}
      animate={{ width: open ? width : collapsedWidth }}
      transition={{ duration: 0.25 }}
      sx={mergeShellSx(sidebarShellSx, { display: { xs: "none", md: "flex" } })}
    >
      <Box sx={getSidebarHeaderSx(open)}>
        {open && (
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "8px",
              background: service.gradient,
              flexShrink: 0,
            }}
          />
        )}
        {open && (
          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", lineHeight: 1.2, flex: 1, minWidth: 0 }}>
            {service.name}
          </Typography>
        )}
        <Tooltip
          title={open ? SIDEBAR_TOGGLE_LABELS.collapse : SIDEBAR_TOGGLE_LABELS.expand}
          placement="right"
        >
          <IconButton size="small" onClick={onToggle} sx={sidebarToggleButtonSx}>
            {open ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      <List dense sx={{ flex: 1, px: 1, py: 1 }}>
        {navItems.map((item) => (
          <Tooltip key={item.id} title={!open ? item.label : ""} placement="right">
            <ListItemButton
              selected={viewId === item.id}
              onClick={() => navigate(item.id)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                "&.Mui-selected": {
                  background: `${service.color}22`,
                  borderLeft: `3px solid ${service.color}`,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: viewId === item.id ? service.color : "text.secondary" }}>
                {getPlatformNavIcon(item.id)}
              </ListItemIcon>
              {open && (
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { sx: { fontSize: "0.85rem" } } }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>

      <Divider sx={{ borderColor: "divider" }} />
      <List dense sx={{ px: 1, py: 1 }}>
        <Tooltip title={!open ? "Torna al Hub" : ""} placement="right">
          <ListItemButton onClick={() => router.push("/dashboard")} sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ArrowBackIcon fontSize="small" />
            </ListItemIcon>
            {open && (
              <ListItemText
                primary="Service Hub"
                slotProps={{ primary: { sx: { fontSize: "0.85rem" } } }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </List>
    </Box>
  );
}
