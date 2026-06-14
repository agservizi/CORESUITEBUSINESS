import {
  groqChat,
  parseJsonFromModel,
  DEFAULT_GROQ_MODEL,
  FAST_GROQ_MODEL,
  isGroqConfigured,
} from "./groq-client";
import { buildSafeContextJson } from "./context-builder";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { checkAiRateLimit } from "./rate-limit";
import { runAiAgent } from "./agent-service";
import type { AiAssistRequest, AiAssistResponse, AiAction } from "./types";

const FAST_ACTIONS = new Set<AiAction>(["improve", "triage", "extract"]);
const AGENT_ACTIONS = new Set<AiAction>(["chat", "suggest"]);

export async function runAiAssist(
  request: AiAssistRequest,
  userId: string,
  role: string,
  userEmail?: string
): Promise<AiAssistResponse> {
  if (!isGroqConfigured()) {
    throw new Error("AI non configurata: imposta GROQ_API_KEY nel file .env");
  }

  const rate = checkAiRateLimit(userId);
  if (!rate.ok) {
    throw new Error(`Limite richieste AI raggiunto — riprova tra ${rate.retryAfterSec}s`);
  }

  if (AGENT_ACTIONS.has(request.action)) {
    return runAiAgent(request, userId, role, userEmail);
  }

  const contextJson = await buildSafeContextJson({
    scope: request.scope,
    entityId: request.entityId,
    moduleKey: request.moduleKey,
    userId,
    role,
    userEmail,
    extra: request.context,
  });

  const model = FAST_ACTIONS.has(request.action) ? FAST_GROQ_MODEL : DEFAULT_GROQ_MODEL;
  const system = buildSystemPrompt(request.scope, request.action);
  const user = buildUserPrompt(request.action, request.message, contextJson);

  const raw = await groqChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    {
      model,
      json: request.action === "triage" || request.action === "extract",
      maxTokens: request.action === "briefing" ? 2500 : 1800,
    }
  );

  if (request.action === "triage" || request.action === "extract") {
    try {
      const structured = parseJsonFromModel<Record<string, unknown>>(raw);
      const text =
        request.action === "triage"
          ? formatTriageText(structured)
          : formatExtractText(structured);
      return { text, structured, model };
    } catch {
      return { text: raw, model };
    }
  }

  return { text: raw, model };
}

function formatTriageText(s: Record<string, unknown>) {
  const lines = [
    s.summary ? String(s.summary) : "",
    s.type ? `Tipo suggerito: ${s.type}` : "",
    s.priority ? `Priorità: ${s.priority}` : "",
  ].filter(Boolean);
  const steps = Array.isArray(s.nextSteps) ? s.nextSteps.map(String).join("\n• ") : "";
  if (steps) lines.push(`Prossimi passi:\n• ${steps}`);
  return lines.join("\n\n");
}

function formatExtractText(s: Record<string, unknown>) {
  return Object.entries(s)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `**${k}**: ${String(v)}`)
    .join("\n");
}

export { isGroqConfigured, DEFAULT_GROQ_MODEL };
