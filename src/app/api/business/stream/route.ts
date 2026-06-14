import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBusinessLiveEvents } from "@/lib/business-wow";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let lastTick = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("connected", { at: new Date().toISOString() });

      const interval = setInterval(async () => {
        try {
          const since = lastTick;
          lastTick = new Date();
          const live = await getBusinessLiveEvents(since);

          const feed: { id: string; kind: string; message: string; at: string; link?: string }[] = [];

          for (const l of live.newLeads) {
            feed.push({
              id: `lead-${l.id}`,
              kind: "lead_new",
              message: `Nuovo lead: ${l.title}${l.client?.name ? ` (${l.client.name})` : ""}`,
              at: l.createdAt.toISOString(),
              link: `/business?v=lead&id=${l.id}`,
            });
          }
          for (const d of live.wonDeals) {
            feed.push({
              id: `won-${d.id}`,
              kind: "deal_won",
              message: `Deal chiuso €${d.value.toLocaleString("it-IT")}: ${d.title}`,
              at: d.closedAt!.toISOString(),
              link: `/business?v=deals&id=${d.id}`,
            });
          }
          for (const d of live.lostDeals) {
            feed.push({
              id: `lost-${d.id}`,
              kind: "deal_lost",
              message: `Deal perso: ${d.title}`,
              at: d.closedAt!.toISOString(),
              link: `/business?v=deals&id=${d.id}`,
            });
          }
          for (const m of live.stageMoves) {
            feed.push({
              id: `move-${m.id}-${m.updatedAt.toISOString()}`,
              kind: "stage_move",
              message: `Lead spostato in ${m.stage?.name || "stage"}: ${m.title}`,
              at: m.updatedAt.toISOString(),
              link: `/business?v=lead&id=${m.id}`,
            });
          }

          if (feed.length) send("feed", { items: feed });
          send("pulse", {
            pipelineValue: live.pipeline.value,
            pipelineCount: live.pipeline.count,
            dueToday: live.dueActivities.length,
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
