import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { userHasServiceAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/platform/cash-register-service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const allowed = await userHasServiceAccess(auth.user.id, auth.user.role, "entrate-uscite");
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
          const [movements, session] = await Promise.all([
            prisma.cashMovement.findMany({
              where: { createdAt: { gt: lastAt } },
              orderBy: { createdAt: "asc" },
              take: 8,
              select: {
                id: true,
                type: true,
                description: true,
                amount: true,
                method: true,
                status: true,
                createdAt: true,
                expressSale: { select: { id: true, receiptNumber: true } },
              },
            }),
            prisma.cashRegisterSession.findUnique({
              where: { businessDate: toDateOnly() },
              select: { status: true },
            }),
          ]);

          if (movements.length) {
            lastAt = movements[movements.length - 1].createdAt;
            send("movements", {
              items: movements.map((m) => ({
                id: m.id,
                type: m.type,
                description: m.description,
                amount: Number(m.amount),
                method: m.method,
                status: m.status,
                createdAt: m.createdAt.toISOString(),
                expressSaleId: m.expressSale?.id ?? null,
                receiptNumber: m.expressSale?.receiptNumber ?? null,
              })),
            });
          }

          send("pulse", {
            sessionStatus: session?.status ?? "NONE",
            at: new Date().toISOString(),
          });
        } catch {
          send("error", { message: "stream tick failed" });
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
