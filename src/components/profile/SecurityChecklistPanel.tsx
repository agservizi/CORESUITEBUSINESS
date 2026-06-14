"use client";

import {
  Box, Typography, Button, Stack, LinearProgress, alpha, Chip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { motion } from "framer-motion";
import { hubFadeUpSoft } from "@/lib/hub-motion";
import type { SecurityCheckItem } from "./security-checklist";
import type { ProfileTab } from "./profile-utils";

interface Props {
  items: SecurityCheckItem[];
  score: number;
  accent: string;
  compact?: boolean;
  onAction: (action: SecurityCheckItem["action"], tab: ProfileTab) => void;
}

export default function SecurityChecklistPanel({ items, score, accent, compact, onAction }: Props) {
  const pending = items.filter((i) => !i.done && i.action !== "none");

  if (compact && pending.length === 0) return null;

  return (
    <Box
      component={motion.div}
      variants={hubFadeUpSoft}
      initial="hidden"
      animate="show"
      sx={{
        mb: compact ? 0 : 3,
        p: compact ? 2 : 2.5,
        borderRadius: 2.5,
        bgcolor: compact ? "rgba(255,255,255,0.12)" : undefined,
        border: compact ? "1px solid rgba(255,255,255,0.2)" : (theme) => theme.palette.divider,
        ...(compact
          ? {}
          : (theme) => ({
              border: `1px solid ${alpha(accent, 0.25)}`,
              background: `linear-gradient(145deg, ${alpha(accent, 0.06)} 0%, transparent 70%)`,
            })),
      }}
    >
      {!compact && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>Checklist sicurezza</Typography>
          <Chip size="small" label={`${score}/100`} sx={{ fontWeight: 700, bgcolor: alpha(accent, 0.12), color: accent }} />
        </Box>
      )}

      {compact && pending.length > 0 && (
        <Typography variant="caption" sx={{ display: "block", mb: 1.5, opacity: 0.9, fontWeight: 600 }}>
          {pending.length} {pending.length === 1 ? "azione consigliata" : "azioni consigliate"}
        </Typography>
      )}

      <LinearProgress
        variant="determinate"
        value={score}
        sx={{
          mb: 2,
          height: 6,
          borderRadius: 3,
          bgcolor: compact ? "rgba(255,255,255,0.15)" : alpha(accent, 0.12),
          "& .MuiLinearProgress-bar": {
            borderRadius: 3,
            bgcolor: score >= 85 ? "#10b981" : score >= 65 ? "#f59e0b" : "#ef4444",
          },
        }}
      />

      <Stack spacing={1.25}>
        {(compact ? pending : items).map((item) => (
          <Box
            key={item.id}
            sx={{
              display: "flex",
              gap: 1.5,
              alignItems: "flex-start",
              p: compact ? 1 : 1.5,
              borderRadius: 2,
              bgcolor: compact ? "rgba(255,255,255,0.08)" : (theme) => theme.palette.action.hover,
            }}
          >
            {item.done ? (
              <CheckCircleIcon sx={{ color: "#10b981", fontSize: 22, mt: 0.25 }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ color: compact ? "rgba(255,255,255,0.6)" : "text.secondary", fontSize: 22, mt: 0.25 }} />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: compact ? "#fff" : "text.primary" }}>
                {item.label}
                <Typography component="span" variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
                  +{item.points} pt
                </Typography>
              </Typography>
              {!compact && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {item.description}
                </Typography>
              )}
            </Box>
            {!item.done && item.action !== "none" && (
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => {
                  const tab: ProfileTab =
                    item.action === "name" ? "account" : item.action === "password" || item.action === "mfa" ? "security" : "security";
                  onAction(item.action, tab);
                }}
                sx={{
                  flexShrink: 0,
                  fontWeight: 700,
                  ...(compact
                    ? { color: "#fff", bgcolor: "rgba(255,255,255,0.18)", "&:hover": { bgcolor: "rgba(255,255,255,0.28)" } }
                    : { color: accent }),
                }}
              >
                {item.actionLabel}
              </Button>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
