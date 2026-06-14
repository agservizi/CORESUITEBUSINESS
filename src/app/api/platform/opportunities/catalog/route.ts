import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { getProviderCatalog, getStatusOptions } from "@/lib/platform/opportunities-service";
import type { OpportunityCategory } from "@/generated/prisma";

export const GET = withApi(
  async (request, { user: _user }) => {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as OpportunityCategory | null;
    const [statuses, catalog] = await Promise.all([
      getStatusOptions(),
      getProviderCatalog(category || undefined),
    ]);
    return NextResponse.json({ statuses, catalog });
  },
  { requireCsrf: false, serviceSlug: "opportunities" }
);
