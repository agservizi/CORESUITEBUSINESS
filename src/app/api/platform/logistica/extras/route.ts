import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import {
  listPickupLocations,
  createPickupLocation,
  updatePickupStatus,
  getPickupHistory,
  notifyPickupClient,
  listPickupNotifications,
} from "@/lib/platform/logistica-service";

export const GET = withApi(
  async (request) => {
    const view = new URL(request.url).searchParams.get("view");
    if (view === "notifications") {
      return NextResponse.json({ notifications: await listPickupNotifications() });
    }
    return NextResponse.json({ locations: await listPickupLocations() });
  },
  { requireCsrf: false, serviceSlug: "logistica" }
);

export const POST = withApi(
  async (request, { user }) => {
    const body = await request.json();
    if (body.action === "createLocation") {
      const location = await createPickupLocation(String(body.name), body.address ? String(body.address) : undefined);
      return NextResponse.json({ location }, { status: 201 });
    }
    return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
  },
  { serviceSlug: "logistica" }
);
