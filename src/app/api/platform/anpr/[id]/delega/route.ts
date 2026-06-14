import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { sendAnprDelegaOtp, verifyAnprDelega } from "@/lib/platform/practice-workflow-service";

export const POST = withApi(
  async (request, { user, params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    const body = await request.json();
    if (body.action === "verify") {
      const item = await verifyAnprDelega(id, user.id);
      return NextResponse.json({ item });
    }
    const result = await sendAnprDelegaOtp(id, String(body.recipient), user.id);
    return NextResponse.json(result);
  },
  { serviceSlug: "anpr" }
);
