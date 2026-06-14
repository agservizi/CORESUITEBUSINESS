import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { userHasServiceAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { buildOpportunityScope, serializeOpportunity } from "@/lib/platform/opportunities-service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const allowed = await userHasServiceAccess(auth.user.id, auth.user.role, "opportunities");
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const encoder = new TextEncoder();
  let lastAt = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("connected", { at: new Date().toISOString() });

      const interval = setInterval(async () => {
        try {
          const scope = await buildOpportunityScope(auth.user.id, auth.user.role);
          const newRows = await prisma.opportunity.findMany({
            where: { ...scope, updatedAt: { gt: lastAt } },
            orderBy: { updatedAt: "asc" },
            take: 10,
            include: {
              status: true,
              collaborator: { select: { name: true, email: true } },
            },
          });

          if (newRows.length) {
            lastAt = newRows[newRows.length - 1].updatedAt;
            send("opportunities", {
              items: newRows.map((r) => serializeOpportunity(r as unknown as Record<string, unknown>)),
            });
          }

          const openCount = await prisma.opportunity.count({
            where: { ...scope, statusCode: { notIn: ["attivato", "annullato"] } },
          });
          send("pulse", { openCount, at: new Date().toISOString() });
        } catch {
          /* ignore poll errors */
        }
      }, 5000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
