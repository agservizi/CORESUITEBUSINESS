import type { AiAction, AiAssistResponse, AiScope } from "@/lib/ai/types";
import { jsonMutationHeaders } from "@/lib/csrf-client";

export interface AiAssistOptions {
  scope: AiScope;
  action: AiAction;
  message?: string;
  entityId?: string;
  moduleKey?: string;
  context?: Record<string, unknown>;
}

export async function callAiAssist(options: AiAssistOptions): Promise<AiAssistResponse> {
  const res = await fetch("/api/ai/assist", {
    method: "POST",
    headers: jsonMutationHeaders(),
    body: JSON.stringify(options),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Errore assistente AI");
  return data as AiAssistResponse;
}

export async function fetchAiStatus(): Promise<{ configured: boolean; model: string }> {
  const res = await fetch("/api/ai/status");
  if (!res.ok) return { configured: false, model: "" };
  return res.json();
}
