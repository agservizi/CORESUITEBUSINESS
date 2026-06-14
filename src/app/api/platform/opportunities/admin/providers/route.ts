import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import {
  adminCreateProvider,
  adminListProviders,
  isStaffRole,
} from "@/lib/platform/opportunities-service";

export const GET = withApi(
  async (_request, { user }) => {
    if (!isStaffRole(user.role)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    const providers = await adminListProviders(true);
    return NextResponse.json({ providers });
  },
  { requireCsrf: false, serviceSlug: "opportunities" }
);

export const POST = withApi(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const provider = await adminCreateProvider(body, user.role);
      return NextResponse.json({ provider }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore creazione";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
  { serviceSlug: "opportunities" }
);
