import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { updatePickupStatus, getPickupHistory, notifyPickupClient } from "@/lib/platform/logistica-service";

export const GET = withApi(
  async (_req, { params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    const history = await getPickupHistory(id);
    return NextResponse.json({ history });
  },
  { requireCsrf: false, serviceSlug: "logistica" }
);

export const POST = withApi(
  async (request, { user, params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    const body = await request.json();
    if (body.action === "notify") {
      const notification = await notifyPickupClient(id, user.id);
      return NextResponse.json({ notification });
    }
    const pkg = await updatePickupStatus(id, String(body.status), body.note, user.id);
    return NextResponse.json({ item: pkg });
  },
  { serviceSlug: "logistica" }
);
