import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { adminCreateOffer, isStaffRole } from "@/lib/platform/opportunities-service";

export const POST = withApi(
  async (request, { user }) => {
    if (!isStaffRole(user.role)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    try {
      const body = await request.json();
      const providerId = String(body.providerId || "");
      if (!providerId) {
        return NextResponse.json({ error: "providerId obbligatorio" }, { status: 400 });
      }
      const offer = await adminCreateOffer(providerId, body, user.role);
      return NextResponse.json({ offer }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore creazione";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
  { serviceSlug: "opportunities" }
);
