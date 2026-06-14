import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { userHasServiceAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const allowed = await userHasServiceAccess(auth.user.id, auth.user.role, "express");
  if (!allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let lastSaleAt = new Date();
  let lastRequestAt = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("connected", { at: new Date().toISOString() });

      const interval = setInterval(async () => {
        try {
          const [newSales, newRequests, stockCount] = await Promise.all([
            prisma.expressSale.findMany({
              where: { soldAt: { gt: lastSaleAt }, status: { not: "Annullata" } },
              orderBy: { soldAt: "asc" },
              take: 5,
              select: {
                id: true,
                total: true,
                soldAt: true,
                client: { select: { name: true } },
              },
            }),
            prisma.expressRequest.findMany({
              where: { createdAt: { gt: lastRequestAt }, status: "Pending" },
              orderBy: { createdAt: "asc" },
              take: 5,
              select: {
                id: true,
                title: true,
                createdAt: true,
                client: { select: { name: true } },
              },
            }),
            prisma.expressIccidStock.count({ where: { status: "InStock" } }),
          ]);

          if (newSales.length) {
            lastSaleAt = newSales[newSales.length - 1].soldAt;
            send("sales", {
              items: newSales.map((s) => ({
                id: s.id,
                total: Number(s.total),
                client: s.client?.name,
                soldAt: s.soldAt.toISOString(),
              })),
            });
          }

          if (newRequests.length) {
            lastRequestAt = newRequests[newRequests.length - 1].createdAt;
            send("requests", {
              items: newRequests.map((r) => ({
                id: r.id,
                title: r.title,
                client: r.client?.name,
                createdAt: r.createdAt.toISOString(),
              })),
            });
          }

          send("pulse", { iccidInStock: stockCount, at: new Date().toISOString() });
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
