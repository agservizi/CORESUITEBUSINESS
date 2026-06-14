"use client";

import { useState } from "react";
import { IconButton, Tooltip, CircularProgress, alpha } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import type { AiAction, AiScope } from "@/lib/ai/types";
import { useAiAssistantOptional } from "@/context/AiAssistantProvider";
import { callAiAssist } from "@/lib/ai/client";

interface Props {
  scope: AiScope;
  action: AiAction;
  message?: string;
  entityId?: string;
  moduleKey?: string;
  context?: Record<string, unknown>;
  label?: string;
  /** Se true, restituisce testo via onResult invece di aprire dialog */
  inline?: boolean;
  onResult?: (text: string) => void;
  size?: "small" | "medium";
  color?: string;
}

export default function AiSparkButton({
  scope,
  action,
  message,
  entityId,
  moduleKey,
  context,
  label = "AI",
  inline = true,
  onResult,
  size = "small",
  color = "#6366f1",
}: Props) {
  const ai = useAiAssistantOptional();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!inline && ai) {
      ai.openAssistant({
        scope,
        entityId,
        moduleKey,
        context,
        initialAction: action,
        initialMessage: message,
      });
      return;
    }

    setLoading(true);
    try {
      const res = await callAiAssist({
        scope,
        action,
        message,
        entityId,
        moduleKey,
        context,
      });
      onResult?.(res.text);
    } catch {
      if (ai) {
        ai.openAssistant({ scope, entityId, moduleKey, context, initialAction: action, initialMessage: message });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tooltip title={label}>
      <IconButton
        size={size}
        onClick={handleClick}
        disabled={loading}
        sx={{
          color,
          bgcolor: alpha(color, 0.1),
          "&:hover": { bgcolor: alpha(color, 0.18) },
        }}
      >
        {loading ? <CircularProgress size={16} /> : <AutoAwesomeIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
