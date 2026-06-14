import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { runAiAssist } from "@/lib/ai/assist-service";
import type { AiAction, AiAssistRequest, AiScope } from "@/lib/ai/types";
import { AI_ACTIONS, AI_SCOPES } from "@/lib/ai/types";

function isScope(v: string): v is AiScope {
  return (AI_SCOPES as readonly string[]).includes(v);
}

function isAction(v: string): v is AiAction {
  return (AI_ACTIONS as readonly string[]).includes(v);
}

export const POST = withApi(
  async (request, { user }) => {
    try {
      const body = (await request.json()) as Partial<AiAssistRequest>;
      const scope = String(body.scope || "hub");
      const action = String(body.action || "chat");

      if (!isScope(scope)) {
        return NextResponse.json({ error: "Scope non valido" }, { status: 400 });
      }
      if (!isAction(action)) {
        return NextResponse.json({ error: "Action non valida" }, { status: 400 });
      }

      const result = await runAiAssist(
        {
          scope,
          action,
          message: body.message,
          entityId: body.entityId,
          moduleKey: body.moduleKey,
          context: body.context,
        },
        user.id,
        user.role,
        user.email
      );

      return NextResponse.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore AI";
      const status = message.includes("GROQ_API_KEY") ? 503 : 400;
      return NextResponse.json({ error: message }, { status });
    }
  },
  { requireCsrf: true }
);
