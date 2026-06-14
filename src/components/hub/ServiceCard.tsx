"use client";

import { Box, Typography, Chip } from "@mui/material";
import { motion } from "framer-motion";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PeopleIcon from "@mui/icons-material/People";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import EventIcon from "@mui/icons-material/Event";
import DescriptionIcon from "@mui/icons-material/Description";
import PaymentsIcon from "@mui/icons-material/Payments";
import BoltIcon from "@mui/icons-material/Bolt";
import BadgeIcon from "@mui/icons-material/Badge";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import CloudIcon from "@mui/icons-material/Cloud";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CampaignIcon from "@mui/icons-material/Campaign";
import LoyaltyIcon from "@mui/icons-material/Loyalty";
import WorkIcon from "@mui/icons-material/Work";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import TelegramIcon from "@mui/icons-material/Telegram";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useServiceLaunch } from "@/context/ServiceLaunchProvider";
import { useTheme } from "@mui/material/styles";
import { getShellTokens, shellPanelSx } from "@/theme/shell-tokens";

const ICONS: Record<string, React.ElementType> = {
  BusinessCenter: BusinessCenterIcon,
  Analytics: AnalyticsIcon,
  AccountTree: AccountTreeIcon,
  AccountBalance: AccountBalanceIcon,
  People: PeopleIcon,
  LibraryBooks: LibraryBooksIcon,
  Dashboard: DashboardIcon,
  ConfirmationNumber: ConfirmationNumberIcon,
  Event: EventIcon,
  Description: DescriptionIcon,
  Payments: PaymentsIcon,
  Bolt: BoltIcon,
  Badge: BadgeIcon,
  CreditCard: CreditCardIcon,
  FindInPage: FindInPageIcon,
  Cloud: CloudIcon,
  LocalShipping: LocalShippingIcon,
  Inventory2: Inventory2Icon,
  Campaign: CampaignIcon,
  Loyalty: LoyaltyIcon,
  Work: WorkIcon,
  DirectionsCar: DirectionsCarIcon,
  Telegram: TelegramIcon,
  AccountCircle: AccountCircleIcon,
  MarkEmailRead: MarkEmailReadIcon,
  FlashOn: FlashOnIcon,
  TrendingUp: TrendingUpIcon,
};

interface ServiceCardProps {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  url: string;
  status: string;
  badge?: string;
  index: number;
}

export default function ServiceCard({
  slug,
  name,
  description,
  icon,
  color,
  gradient,
  url,
  status,
  badge,
  index,
}: ServiceCardProps) {
  const { launchService, isLaunching } = useServiceLaunch();
  const theme = useTheme();
  const t = getShellTokens(theme);
  const Icon = ICONS[icon] || BusinessCenterIcon;
  const isActive = status === "active";

  function handleClick() {
    if (!isActive || isLaunching) return;
    launchService({ slug, name, color, gradient, icon, url });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: "easeOut" }}
      whileHover={isActive ? { y: -4, scale: 1.01 } : {}}
      style={{ cursor: isActive ? "pointer" : "default" }}
      onClick={handleClick}
    >
      <Box
        sx={[
          shellPanelSx,
          {
            position: "relative",
            backdropFilter: "blur(16px)",
            p: 3,
            height: "100%",
            minHeight: 180,
            overflow: "hidden",
            transition: "border-color 0.2s, box-shadow 0.2s",
            opacity: isActive ? 1 : 0.6,
            ...(isActive && {
              "&:hover": {
                borderColor: t.inputBorderHover,
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              },
            }),
          },
        ]}
      >
        {/* Glow background */}
        <Box
          sx={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        {/* Header row */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              background: gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 4px 16px ${color}44`,
            }}
          >
            <Icon sx={{ color: "#fff", fontSize: 22 }} />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {badge && (
              <Chip
                label={badge}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff",
                  border: "none",
                }}
              />
            )}
            {!isActive && (
              <Chip
                label="Prossimamente"
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  background: t.skeleton,
                  color: "text.secondary",
                  border: `1px solid ${t.inputBorder}`,
                }}
              />
            )}
            {isActive && (
              <ArrowForwardIosIcon sx={{ color: "text.secondary", fontSize: 14 }} />
            )}
          </Box>
        </Box>

        {/* Content */}
        <Typography
          sx={{ fontWeight: 600, mb: 0.75, fontSize: "1rem", color: "text.primary" }}
        >
          {name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: "0.825rem" }}>
          {description}
        </Typography>
      </Box>
    </motion.div>
  );
}
