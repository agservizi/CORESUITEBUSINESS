import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import {
  listPostaMessages,
  createPostaMessage,
  listPecInbox,
  markPecInboxRead,
  syncPecInbox,
  getPostaTelematicaStatus,
} from "@/lib/platform/posta-telematica-service";

export const GET = withApi(
  async (request) => {
    try {
      const url = new URL(request.url);
      const view = url.searchParams.get("view");

      if (view === "status") {
        return NextResponse.json(await getPostaTelematicaStatus());
      }

      if (view === "inbox") {
        const sync = url.searchParams.get("sync") === "1";
        const syncResult = sync ? await syncPecInbox() : null;
        return NextResponse.json({
          messages: await listPecInbox(),
          sync: syncResult,
        });
      }

      return NextResponse.json({ messages: await listPostaMessages() });
    } catch (error) {
      console.error("[posta-telematica/messages GET]", error);
      const message = error instanceof Error ? error.message : "Errore caricamento messaggi";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { requireCsrf: false, serviceSlug: "posta-telematica" }
);

export const POST = withApi(
  async (request, { user }) => {
    const body = await request.json();

    if (body.action === "syncInbox") {
      const result = await syncPecInbox();
      return NextResponse.json({ success: true, ...result });
    }

    if (body.action === "markRead") {
      await markPecInboxRead(String(body.id));
      return NextResponse.json({ success: true });
    }

    try {
      const message = await createPostaMessage(
        {
          channel: String(body.channel || "email"),
          recipientEmail: String(body.recipientEmail || ""),
          subject: String(body.subject || ""),
          body: String(body.body || ""),
          clientId: String(body.clientId || ""),
        },
        user.id
      );
      return NextResponse.json({ message }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore invio";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
  { serviceSlug: "posta-telematica" }
);
