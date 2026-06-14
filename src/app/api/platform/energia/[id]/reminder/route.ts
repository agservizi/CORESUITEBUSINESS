import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { sendEnergyReminder, listEnergyEmailLogs } from "@/lib/platform/energia-curriculum-service";

export const GET = withApi(
  async (_req, { params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    return NextResponse.json({ logs: await listEnergyEmailLogs(id) });
  },
  { requireCsrf: false, serviceSlug: "energia" }
);

export const POST = withApi(
  async (request, { params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    const body = await request.json();
    const log = await sendEnergyReminder(id, String(body.subject || "Promemoria contratto energia"), String(body.recipient || ""));
    return NextResponse.json({ log }, { status: 201 });
  },
  { serviceSlug: "energia" }
);
