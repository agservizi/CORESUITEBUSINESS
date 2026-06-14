import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { getClientIdForUser } from "@/lib/api-handler";
import { createPortaleLead } from "@/lib/business-wow";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const clientId = await getClientIdForUser(auth.user);
  if (!clientId) {
    return NextResponse.json({ error: "Profilo cliente non collegato" }, { status: 400 });
  }

  const body = await request.json();
  const title = String(body.title || body.subject || "").trim();
  if (!title) {
    return NextResponse.json({ error: "Titolo obbligatorio" }, { status: 400 });
  }

  const lead = await createPortaleLead({
    clientId,
    title,
    message: body.message ? String(body.message) : undefined,
    contactName: auth.user.name ?? undefined,
    contactEmail: auth.user.email,
    userId: auth.user.id,
  });

  return NextResponse.json({ lead }, { status: 201 });
}
