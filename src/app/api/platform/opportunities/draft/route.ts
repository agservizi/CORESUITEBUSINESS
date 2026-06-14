import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import {
  deleteOpportunityDraft,
  getOpportunityDraft,
  saveOpportunityDraft,
} from "@/lib/platform/opportunities-service";

export const GET = withApi(
  async (_request, { user }) => {
    const draft = await getOpportunityDraft(user.id);
    return NextResponse.json({ draft: draft?.payload ?? null, updatedAt: draft?.updatedAt ?? null });
  },
  { requireCsrf: false, serviceSlug: "opportunities" }
);

export const PUT = withApi(
  async (request, { user }) => {
    const body = await request.json();
    const draft = await saveOpportunityDraft(user.id, body);
    return NextResponse.json({ ok: true, updatedAt: draft.updatedAt });
  },
  { serviceSlug: "opportunities" }
);

export const DELETE = withApi(
  async (_request, { user }) => {
    await deleteOpportunityDraft(user.id);
    return NextResponse.json({ ok: true });
  },
  { serviceSlug: "opportunities" }
);
