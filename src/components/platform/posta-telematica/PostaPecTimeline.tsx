"use client";

import { Box, Typography, Stack } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import type { PostaMessageRow } from "./posta-utils";
import { pecSteps } from "./posta-utils";

function fmt(at?: string | null) {
  if (!at) return null;
  return new Date(at).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PostaPecTimeline({
  message,
  compact = false,
}: {
  message: PostaMessageRow;
  compact?: boolean;
}) {
  const steps = pecSteps(message);

  return (
    <Stack direction={compact ? "row" : "column"} spacing={compact ? 2 : 1.5} sx={{ width: "100%" }}>
      {steps.map((step, index) => {
        const Icon = step.failed ? ErrorOutlineOutlinedIcon : step.done ? CheckCircleIcon : RadioButtonUncheckedIcon;
        const color = step.failed ? "#ef4444" : step.done ? "#10b981" : step.pending ? "#f59e0b" : "#94a3b8";

        return (
          <Box
            key={step.key}
            sx={{
              display: "flex",
              alignItems: compact ? "center" : "flex-start",
              gap: 1,
              flex: compact ? 1 : undefined,
              minWidth: compact ? 0 : undefined,
            }}
          >
            <Icon sx={{ fontSize: compact ? 18 : 20, color, mt: compact ? 0 : 0.2, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: compact ? "0.75rem" : "0.85rem", lineHeight: 1.2 }}>
                {step.label}
              </Typography>
              {!compact && (
                <Typography variant="caption" color="text.secondary">
                  {step.done ? fmt(step.at) : step.failed ? "Fallito" : step.pending ? "In attesa" : "—"}
                </Typography>
              )}
            </Box>
            {compact && index < steps.length - 1 && (
              <Box sx={{ flex: 1, height: 2, bgcolor: step.done ? "#10b98133" : "#e2e8f0", borderRadius: 1, mx: 0.5 }} />
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
