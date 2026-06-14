"use client";

import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Divider,
  IconButton,
} from "@mui/material";
import { motion } from "framer-motion";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import HandshakeIcon from "@mui/icons-material/Handshake";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import AssignmentIcon from "@mui/icons-material/Assignment";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import BarChartIcon from "@mui/icons-material/BarChart";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";
import { navigateResolved } from "@/lib/navigate-resolved";
import { type BusinessSection } from "@/lib/business-navigation";
import { useBusinessNavigation } from "@/context/BusinessNavigationProvider";
import {
  APP_SHELL,
  getSidebarHeaderSx,
  SIDEBAR_TOGGLE_LABELS,
  sidebarShellSx,
  sidebarToggleButtonSx,
  mergeShellSx,
} from "@/components/layout/app-shell";

const NAV_ITEMS: { label: string; icon: typeof DashboardIcon; section: BusinessSection }[] = [
  { label: "Dashboard", icon: DashboardIcon, section: "dashboard" },
  { label: "Clienti", icon: PeopleAltIcon, section: "clienti" },
  { label: "Lead", icon: TrendingUpIcon, section: "lead" },
  { label: "Pipeline", icon: HandshakeIcon, section: "pipeline" },
  { label: "Deal", icon: MonetizationOnIcon, section: "deals" },
  { label: "Attività", icon: AssignmentIcon, section: "attivita" },
  { label: "Preventivi", icon: RequestQuoteIcon, section: "preventivi" },
  { label: "Report", icon: BarChartIcon, section: "report" },
];

interface Props {
  open: boolean;
  onToggle: () => void;
  width: number;
  collapsedWidth: number;
}

export default function BusinessSidebar({ open, onToggle, width, collapsedWidth }: Props) {
  const router = useRouter();
  const { section: activeSection, navigate } = useBusinessNavigation();

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
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              flexShrink: 0,
            }}
          />
        )}
        {open && (
          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", lineHeight: 1.2, flex: 1, minWidth: 0 }}>
            Business
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
        {NAV_ITEMS.map(({ label, icon: Icon, section }) => {
          const isActive = activeSection === section;
          return (
            <Tooltip key={section} title={!open ? label : ""} placement="right">
              <ListItemButton
                selected={isActive}
                onClick={() => navigate(section)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  "&.Mui-selected": {
                    background: "rgba(99,102,241,0.13)",
                    borderLeft: "3px solid #6366f1",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: isActive ? "primary.main" : "text.secondary",
                  }}
                >
                  <Icon fontSize="small" />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={label}
                    slotProps={{ primary: { sx: { fontSize: "0.85rem" } } }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Divider sx={{ borderColor: "divider" }} />
      <List dense sx={{ px: 1, py: 1 }}>
        <Tooltip title={!open ? "Torna al Hub" : ""} placement="right">
          <ListItemButton onClick={() => navigateResolved(router, "/dashboard")} sx={{ borderRadius: 2 }}>
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
