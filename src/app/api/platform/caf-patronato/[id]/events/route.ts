import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { listPracticeEvents, addPracticeEvent, updatePracticeWorkflow } from "@/lib/platform/practice-workflow-service";

export const GET = withApi(
  async (_req, { params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    const events = await listPracticeEvents(id);
    return NextResponse.json({ events });
  },
  { requireCsrf: false, serviceSlug: "caf-patronato" }
);

export const POST = withApi(
  async (request, { user, params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    const body = await request.json();
    if (body.action === "workflow") {
      const item = await updatePracticeWorkflow(id, body.data ?? body, user.id);
      return NextResponse.json({ item });
    }
    const event = await addPracticeEvent(id, String(body.eventType || "note"), body.note, user.id);
    return NextResponse.json({ event }, { status: 201 });
  },
  { serviceSlug: "caf-patronato" }
);
