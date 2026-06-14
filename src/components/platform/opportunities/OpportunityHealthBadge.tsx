"use client";

import { Chip } from "@mui/material";
import { computeOpportunityHealth, type OpportunityHealth } from "./opportunities-health";
import type { OpportunityRow } from "./opportunities-utils";

interface Props {
  row: OpportunityRow;
  size?: "small" | "medium";
  showScore?: boolean;
}

export default function OpportunityHealthBadge({ row, size = "small", showScore = true }: Props) {
  const health: OpportunityHealth = computeOpportunityHealth(row);

  return (
    <Chip
      label={showScore ? `${health.label} · ${health.score}` : health.label}
      size={size}
      sx={{
        height: size === "small" ? 22 : 26,
        fontSize: size === "small" ? "0.65rem" : "0.72rem",
        fontWeight: 700,
        bgcolor: `${health.color}18`,
        color: health.color,
        border: `1px solid ${health.color}44`,
      }}
    />
  );
}
