import { groqChat, parseJsonFromModel, DEFAULT_GROQ_MODEL } from "./groq-client";
import { buildSafeContextJson } from "./context-builder";
import { toolsCatalogJson, executeAiTools, type AiToolCall, type AiToolResult } from "./tools";
import type { AiAssistRequest, AiAssistResponse, AiExecutedAction } from "./types";

const AGENT_SYSTEM = `Sei l'assistente operativo di Coresuite con capacità di ESECUZIONE REALE nel gestionale.
Quando l'operatore chiede di FARE qualcosa (completare, chiudere, aggiornare, segnare pagato, ecc.) DEVI usare i tool disponibili — NON limitarti a consigliare.

Regole:
- Rispondi in italiano, tono professionale.
- Usa SOLO dati dal CONTESTO e dai risultati tool.
- Se l'operatore chiede un'azione eseguibile, chiama i tool appropriati.
- Se manca un identificatore (es. quale pratica) e ce n'è una sola nel contesto, usala.
- Se ce ne sono più di una in sospeso e la richiesta è ambigua, chiedi quale — senza chiamare tool.
- Per "completa la pratica" / "pratica in sospeso" senza codice: se c'è una sola pendingPractices nel contesto, completala; se ce n'è una sola practice aperta, completala.
- Non inventare ID o codici.
- Per domande informative senza azione da eseguire, rispondi normalmente senza tool.

TOOL DISPONIBILI:
${toolsCatalogJson()}

Rispondi SOLO con JSON valido (senza markdown):
{
  "reply": "messaggio all'operatore",
  "tools": [{ "name": "nome_tool", "arguments": { ... } }]
}

Se non servono azioni, "tools" deve essere [] o omesso.`;

interface AgentPlan extends Record<string, unknown> {
  reply?: string;
  tools?: AiToolCall[];
}

export async function runAiAgent(
  request: AiAssistRequest,
  userId: string,
  role: string,
  userEmail?: string
): Promise<AiAssistResponse> {
  const contextJson = await buildSafeContextJson({
    scope: request.scope,
    entityId: request.entityId,
    moduleKey: request.moduleKey,
    userId,
    role,
    userEmail,
    extra: request.context,
  });

  const userPrompt = [
    `CONTESTO (JSON):\n${contextJson}`,
    request.message?.trim() ? `\nRICHIESTA OPERATORE:\n${request.message.trim()}` : "",
    "\nDecidi se eseguire azioni reali tramite tool e rispondi in JSON.",
  ].join("\n");

  const raw = await groqChat(
    [
      { role: "system", content: AGENT_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    { model: DEFAULT_GROQ_MODEL, json: true, maxTokens: 2000, temperature: 0.2 }
  );

  let plan: AgentPlan;
  try {
    plan = parseJsonFromModel<AgentPlan>(raw);
  } catch {
    return { text: raw, model: DEFAULT_GROQ_MODEL };
  }

  const toolCalls = Array.isArray(plan.tools)
    ? plan.tools.filter((t) => t?.name && typeof t.name === "string")
    : [];

  if (toolCalls.length === 0) {
    return { text: plan.reply?.trim() || raw, model: DEFAULT_GROQ_MODEL };
  }

  const results = await executeAiTools(
    toolCalls.map((t) => ({
      name: t.name,
      arguments: (t.arguments as Record<string, unknown>) ?? {},
    })),
    {
      userId,
      role,
      scope: request.scope,
      entityId: request.entityId,
      moduleKey: request.moduleKey,
    }
  );

  const executedActions = resultsToExecutedActions(results);
  const text = formatAgentResponse(plan.reply, results);

  return {
    text,
    executedActions,
    structured: { toolResults: results },
    model: DEFAULT_GROQ_MODEL,
  };
}

function resultsToExecutedActions(results: AiToolResult[]): AiExecutedAction[] {
  return results.map((r) => ({
    tool: r.tool,
    success: r.success,
    summary: r.summary,
    moduleKey: r.data?.moduleKey as string | undefined,
    recordId: r.data?.id as string | undefined,
  }));
}

function formatAgentResponse(reply: string | undefined, results: AiToolResult[]): string {
  const lines: string[] = [];

  if (reply?.trim()) lines.push(reply.trim());

  const executed = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (executed.length) {
    lines.push("");
    lines.push("✅ Azioni eseguite:");
    for (const r of executed) {
      lines.push(`• ${r.summary}`);
    }
  }

  if (failed.length) {
    lines.push("");
    lines.push("⚠️ Azioni non riuscite:");
    for (const r of failed) {
      lines.push(`• ${r.summary}`);
    }
  }

  if (!lines.length) return "Operazione completata.";
  return lines.join("\n");
}
