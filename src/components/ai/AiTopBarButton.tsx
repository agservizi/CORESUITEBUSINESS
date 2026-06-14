"use client";

import { IconButton, Tooltip, alpha } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useAiAssistantOptional } from "@/context/AiAssistantProvider";
import type { AiAssistantTarget } from "@/context/AiAssistantProvider";

interface Props {
  target: AiAssistantTarget;
  tooltip?: string;
}

export default function AiTopBarButton({ target, tooltip = "Assistente AI (Ctrl+Shift+A)" }: Props) {
  const ai = useAiAssistantOptional();
  if (!ai) return null;

  return (
    <Tooltip title={tooltip}>
      <IconButton
        size="small"
        onClick={() => ai.openAssistant(target)}
        sx={{
          color: "#a78bfa",
          bgcolor: alpha("#6366f1", 0.12),
          "&:hover": { bgcolor: alpha("#6366f1", 0.22) },
        }}
      >
        <AutoAwesomeIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
