"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { AiAction, AiScope } from "@/lib/ai/types";
import AiAssistantDialog from "@/components/ai/AiAssistantDialog";
import AiGlobalHotkeys from "@/components/ai/AiGlobalHotkeys";

export interface AiAssistantTarget {
  scope: AiScope;
  entityId?: string;
  moduleKey?: string;
  context?: Record<string, unknown>;
  title?: string;
  initialAction?: AiAction;
  initialMessage?: string;
}

interface AiAssistantContextValue {
  open: boolean;
  target: AiAssistantTarget | null;
  openAssistant: (target: AiAssistantTarget) => void;
  closeAssistant: () => void;
  runInline: (opts: AiAssistantTarget & { action: AiAction; message?: string }) => Promise<string>;
}

const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

export function AiAssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<AiAssistantTarget | null>(null);

  const openAssistant = useCallback((t: AiAssistantTarget) => {
    setTarget(t);
    setOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setOpen(false);
  }, []);

  const runInline = useCallback(
    async (opts: AiAssistantTarget & { action: AiAction; message?: string }) => {
      const { callAiAssist } = await import("@/lib/ai/client");
      const res = await callAiAssist({
        scope: opts.scope,
        action: opts.action,
        message: opts.message,
        entityId: opts.entityId,
        moduleKey: opts.moduleKey,
        context: opts.context,
      });
      return res.text;
    },
    []
  );

  const value = useMemo(
    () => ({ open, target, openAssistant, closeAssistant, runInline }),
    [open, target, openAssistant, closeAssistant, runInline]
  );

  return (
    <AiAssistantContext.Provider value={value}>
      {children}
      <AiGlobalHotkeys />
      <AiAssistantDialog open={open} target={target} onClose={closeAssistant} />
    </AiAssistantContext.Provider>
  );
}

export function useAiAssistant() {
  const ctx = useContext(AiAssistantContext);
  if (!ctx) throw new Error("useAiAssistant must be used within AiAssistantProvider");
  return ctx;
}

export function useAiAssistantOptional() {
  return useContext(AiAssistantContext);
}
