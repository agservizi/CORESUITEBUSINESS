"use client";

import { Box, Typography, Chip, IconButton, Tooltip } from "@mui/material";
import { motion } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { useServiceLaunch } from "@/context/ServiceLaunchProvider";
import { getServiceIcon } from "@/lib/service-icons";
import { getShellTokens } from "@/theme/shell-tokens";

interface PremiumServiceCardProps {
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
  categoryLabel?: string;
  pinned?: boolean;
  onTogglePin?: (slug: string) => void;
  animateEntrance?: boolean;
}

export default function PremiumServiceCard({
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
  categoryLabel,
  pinned,
  onTogglePin,
  animateEntrance = true,
}: PremiumServiceCardProps) {
  const { launchService, isLaunching } = useServiceLaunch();
  const theme = useTheme();
  const t = getShellTokens(theme);
  const Icon = getServiceIcon(icon);
  const isActive = status === "active";

  return (
    <motion.div
      initial={animateEntrance ? { opacity: 0, y: 16 } : false}
      animate={animateEntrance ? { opacity: 1, y: 0 } : undefined}
      transition={animateEntrance ? { duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] } : undefined}
      whileHover={isActive ? { y: -6, scale: 1.015 } : {}}
      whileTap={isActive ? { scale: 0.98 } : {}}
      style={{ cursor: isActive ? "pointer" : "default", height: "100%" }}
      onClick={() => {
        if (!isActive || isLaunching) return;
        launchService({ slug, name, color, gradient, icon, url });
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: "100%",
          minHeight: 168,
          p: 2.5,
          borderRadius: 2.5,
          background: t.panel,
          backdropFilter: "blur(12px)",
          border: t.border,
          overflow: "hidden",
          transition: "border-color 0.3s, box-shadow 0.3s",
          opacity: isActive ? 1 : 0.55,
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            padding: "1px",
            background: `linear-gradient(135deg, ${color}00, ${color}44, ${color}00)`,
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            opacity: 0,
            transition: "opacity 0.3s",
          },
          "&:hover::before": isActive ? { opacity: 1 } : {},
          ...(isActive && {
            "&:hover": {
              borderColor: `${color}44`,
              boxShadow: `0 12px 40px ${color}18, 0 0 0 1px ${color}22`,
            },
          }),
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
          }}
        />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Box
            component={motion.div}
            whileHover={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.4 }}
            sx={{
              width: 42,
              height: 42,
              borderRadius: "11px",
              background: gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 16px ${color}40`,
            }}
          >
            <Icon sx={{ color: "#fff", fontSize: 20 }} />
          </Box>
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
            {onTogglePin && (
              <Tooltip title={pinned ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(slug);
                  }}
                  sx={{
                    width: 28,
                    height: 28,
                    color: pinned ? "#fbbf24" : "text.secondary",
                    opacity: pinned ? 1 : 0.5,
                    "&:hover": { opacity: 1, color: "#fbbf24" },
                  }}
                >
                  {pinned ? (
                    <StarIcon sx={{ fontSize: 16 }} />
                  ) : (
                    <StarBorderIcon sx={{ fontSize: 16 }} />
                  )}
                </IconButton>
              </Tooltip>
            )}
            {categoryLabel && (
              <Chip
                label={categoryLabel}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.6rem",
                  fontWeight: 600,
                  background: t.hoverStrong,
                  color: "text.secondary",
                }}
              />
            )}
            {isActive && (
              <ArrowForwardIosIcon sx={{ fontSize: 12, color: "text.secondary", opacity: 0.6 }} />
            )}
          </Box>
        </Box>

        <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", mb: 0.5, lineHeight: 1.3 }}>
          {name}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: "0.78rem",
            lineHeight: 1.55,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description}
        </Typography>

        {badge && (
          <Chip
            label={badge}
            size="small"
            sx={{
              position: "absolute",
              bottom: 12,
              right: 12,
              height: 20,
              fontSize: "0.6rem",
              fontWeight: 700,
              background: gradient,
              color: "#fff",
            }}
          />
        )}
      </Box>
    </motion.div>
  );
}
