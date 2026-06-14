import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { getPostaTelematicaStats } from "@/lib/platform/posta-telematica-service";

export const GET = withApi(
  async () => {
    try {
      return NextResponse.json(await getPostaTelematicaStats());
    } catch (error) {
      console.error("[posta-telematica/stats]", error);
      const message = error instanceof Error ? error.message : "Errore caricamento statistiche";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { requireCsrf: false, serviceSlug: "posta-telematica" }
);
