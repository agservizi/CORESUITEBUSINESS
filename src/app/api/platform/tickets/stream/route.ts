import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { userHasServiceAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { OPEN_STATUSES } from "@/lib/platform/tickets-service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const allowed = await userHasServiceAccess(auth.user.id, auth.user.role, "tickets");
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
          const now = new Date();
          const newRows = await prisma.ticket.findMany({
            where: { updatedAt: { gt: lastAt } },
            orderBy: { updatedAt: "asc" },
            take: 10,
            include: {
              assignedTo: { select: { name: true, email: true } },
              _count: { select: { messages: true } },
            },
          });

          if (newRows.length) {
            lastAt = newRows[newRows.length - 1].updatedAt;
            send("tickets", {
              items: newRows.map((r) => ({
                id: r.id,
                code: r.code,
                subject: r.subject,
                status: r.status,
                priority: r.priority,
                channel: r.channel,
                customerName: r.customerName,
                updatedAt: r.updatedAt.toISOString(),
                messageCount: r._count.messages,
              })),
            });
          }

          const [openCount, urgentCount, slaBreached] = await Promise.all([
            prisma.ticket.count({ where: { status: { in: OPEN_STATUSES } } }),
            prisma.ticket.count({
              where: { status: { in: OPEN_STATUSES }, priority: "URGENT" },
            }),
            prisma.ticket.count({
              where: { status: { in: OPEN_STATUSES }, slaDueAt: { lt: now } },
            }),
          ]);

          send("pulse", {
            openCount,
            urgentCount,
            slaBreached,
            at: now.toISOString(),
          });
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
