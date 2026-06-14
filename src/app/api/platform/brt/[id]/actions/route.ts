import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { confirmBrtShipment, trackBrtShipment, createBrtCustomsDoc } from "@/lib/platform/brt-service";

export const GET = withApi(
  async (_req, { params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    return NextResponse.json(await trackBrtShipment(id));
  },
  { requireCsrf: false, serviceSlug: "brt" }
);

export const POST = withApi(
  async (request, { user, params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    const body = await request.json();
    if (body.action === "customs") {
      const doc = await createBrtCustomsDoc(id, body);
      return NextResponse.json({ doc }, { status: 201 });
    }
    const shipment = await confirmBrtShipment(id, user.id);
    return NextResponse.json({ shipment });
  },
  { serviceSlug: "brt" }
);
