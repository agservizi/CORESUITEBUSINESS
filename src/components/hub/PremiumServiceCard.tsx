"use client";

import { useState, type HTMLAttributes } from "react";
import { Box, Typography, Chip, IconButton, Tooltip, Button } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { useServiceLaunch } from "@/context/ServiceLaunchProvider";
import { getServiceIcon } from "@/lib/service-icons";
import { getShellTokens } from "@/theme/shell-tokens";
import { hubCardHeightSx, type HubLayoutDensity } from "@/lib/hub-layout";
import type { ServiceHoverStat } from "@/lib/hub-service-stats";

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
  density?: HubLayoutDensity;
  hoverStats?: ServiceHoverStat[] | null;
  spotlight?: {
    reason: string;
    cta: string;
    stats: string[];
    alertLevel?: "critical" | "warning" | "info";
  };
  dragHandle?: boolean;
  dragHandleProps?: {
    attributes?: HTMLAttributes<HTMLElement>;
    listeners?: Record<string, Function>;
  };
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
  density = "comfortable",
  hoverStats,
  spotlight,
  dragHandle,
  dragHandleProps,
}: PremiumServiceCardProps) {
  const { launchService, isLaunching } = useServiceLaunch();
  const theme = useTheme();
  const t = getShellTokens(theme);
  const Icon = getServiceIcon(icon);
  const isActive = status === "active";
  const [hovered, setHovered] = useState(false);

  function handleLaunch() {
    if (!isActive || isLaunching) return;
    launchService({ slug, name, color, gradient, icon, url });
  }

  return (
    <motion.div
      initial={animateEntrance ? { opacity: 0, y: 16 } : false}
      animate={animateEntrance ? { opacity: 1, y: 0 } : undefined}
      transition={
        animateEntrance ? { duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] } : undefined
      }
      whileHover={isActive ? { y: -4 } : {}}
      whileTap={isActive ? { scale: 0.98 } : {}}
      style={{ cursor: isActive ? "pointer" : "default", height: "100%" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={spotlight ? undefined : handleLaunch}
    >
      <Box
        sx={{
          ...hubCardHeightSx(density),
          position: "relative",
          p: density === "compact" ? 2 : 2.5,
            borderRadius: 2.5,
            background: t.panel,
            backdropFilter: "blur(12px)",
            border: t.border,
            overflow: "hidden",
            transition: "border-color 0.3s, box-shadow 0.3s",
            opacity: isActive ? 1 : 0.55,
            display: "flex",
            flexDirection: "column",
            ...(spotlight?.alertLevel === "critical" && {
              borderColor: "rgba(239,68,68,0.45)",
              boxShadow: "0 0 0 1px rgba(239,68,68,0.15)",
            }),
            ...(spotlight?.alertLevel === "warning" && {
              borderColor: "rgba(245,158,11,0.4)",
            }),
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

        <Box
          sx={{
            position: "absolute",
            top: density === "compact" ? 12 : 14,
            left: density === "compact" ? 12 : 14,
            right: density === "compact" ? 12 : 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, pointerEvents: "auto" }}>
            {dragHandle && (
              <Tooltip title="Trascina per riordinare">
                <Box
                  {...dragHandleProps?.attributes}
                  {...dragHandleProps?.listeners}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    dragHandleProps?.listeners?.onPointerDown?.(e);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    dragHandleProps?.listeners?.onMouseDown?.(e as unknown as PointerEvent);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    cursor: "grab",
                    touchAction: "none",
                    color: hovered ? "text.secondary" : "text.disabled",
                    bgcolor: hovered ? "action.hover" : "transparent",
                    transition: "background 0.2s, color 0.2s",
                    "&:active": { cursor: "grabbing" },
                  }}
                >
                  <DragIndicatorIcon sx={{ fontSize: 18 }} />
                </Box>
              </Tooltip>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", pointerEvents: "auto" }}>
            {onTogglePin && (
              <Tooltip title={pinned ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(slug);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  sx={{
                    width: 28,
                    height: 28,
                    color: pinned ? "#fbbf24" : "text.secondary",
                    opacity: pinned ? 1 : hovered ? 1 : 0.5,
                    bgcolor: hovered ? "action.hover" : "transparent",
                    "&:hover": { opacity: 1, color: "#fbbf24", bgcolor: "action.hover" },
                  }}
                >
                  {pinned ? <StarIcon sx={{ fontSize: 16 }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5, pr: onTogglePin ? 4 : 0, pl: dragHandle ? 4 : 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box
              component={motion.div}
              whileHover={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.4 }}
              sx={{
                width: density === "compact" ? 38 : 42,
                height: density === "compact" ? 38 : 42,
                borderRadius: "11px",
                background: gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 16px ${color}40`,
              }}
            >
              <Icon sx={{ color: "#fff", fontSize: density === "compact" ? 18 : 20 }} />
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
            {spotlight && (
              <Chip
                label="Consigliato"
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  background: `${color}22`,
                  color,
                }}
              />
            )}
            {categoryLabel && !spotlight && (
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
            {isActive && !spotlight && (
              <ArrowForwardIosIcon sx={{ fontSize: 12, color: "text.secondary", opacity: 0.6 }} />
            )}
          </Box>
        </Box>

        {spotlight && (
          <Typography variant="caption" sx={{ color, fontWeight: 700, mb: 0.5, letterSpacing: "0.04em" }}>
            {spotlight.reason.toUpperCase()}
          </Typography>
        )}

        <Typography
          sx={{
            fontWeight: 600,
            fontSize: density === "compact" ? "0.88rem" : "0.95rem",
            mb: 0.5,
            lineHeight: 1.3,
          }}
        >
          {name}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: "0.78rem",
            lineHeight: 1.55,
            display: "-webkit-box",
            WebkitLineClamp: spotlight ? 1 : 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            flex: 1,
          }}
        >
          {description}
        </Typography>

        {spotlight && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1, mb: 1 }}>
            {spotlight.stats.map((s) => (
              <Chip
                key={s}
                label={s}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  background: t.hoverStrong,
                  border: t.border,
                }}
              />
            ))}
          </Box>
        )}

        {spotlight && (
          <Button
            fullWidth
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleLaunch();
            }}
            sx={{
              mt: "auto",
              textTransform: "none",
              fontWeight: 700,
              background: gradient,
              color: "#fff",
              "&:hover": { background: gradient, opacity: 0.92 },
            }}
          >
            {spotlight.cta}
          </Button>
        )}

        {badge && !spotlight && (
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

        <AnimatePresence>
          {hovered && hoverStats && hoverStats.length > 0 && !spotlight && (
            <Box
              component={motion.div}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                borderRadius: "inherit",
                background: "rgba(0,0,0,0.72)",
                backdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 1,
                p: 2,
                pointerEvents: "none",
              }}
            >
              {hoverStats.map((stat) => (
                <Box key={stat.label} sx={{ textAlign: "center" }}>
                  <Typography
                    sx={{
                      fontFamily: '"JetBrains Mono", "Roboto Mono", ui-monospace, monospace',
                      fontWeight: 800,
                      fontSize: "1.1rem",
                      color: "#fff",
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)" }}>
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </AnimatePresence>
      </Box>
    </motion.div>
  );
}
