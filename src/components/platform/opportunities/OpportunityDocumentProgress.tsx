"use client";

import { Box, Typography, LinearProgress } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { useTheme } from "@mui/material/styles";
import { getShellTokens } from "@/theme/shell-tokens";
import { documentCompletionPct, getDocumentChecklist } from "./opportunities-health";
import type { OpportunityRow } from "./opportunities-utils";

interface Props {
  row: OpportunityRow;
  serviceColor?: string;
}

export default function OpportunityDocumentProgress({ row, serviceColor = "#8b5cf6" }: Props) {
  const theme = useTheme();
  const shell = getShellTokens(theme);
  const items = getDocumentChecklist(row);
  const pct = documentCompletionPct(items);
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase" }}>
          Completezza pratica
        </Typography>
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color }}>{pct}%</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 6,
          borderRadius: 3,
          mb: 1.5,
          bgcolor: shell.progressTrack,
          "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 },
        }}
      />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        {items.map((item) => (
          <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {item.done ? (
              <CheckCircleIcon sx={{ fontSize: 16, color: "#10b981" }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: item.required ? serviceColor : "text.disabled" }} />
            )}
            <Typography sx={{ fontSize: "0.8rem", color: item.done ? "text.primary" : "text.secondary" }}>
              {item.label}
              {!item.required && !item.done ? " (opz.)" : ""}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
