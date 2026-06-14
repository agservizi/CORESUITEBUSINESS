import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { getPipelineBoard } from "@/lib/platform/opportunities-service";

export const GET = withApi(
  async (_request, { user }) => {
    const columns = await getPipelineBoard(user.id, user.role);
    return NextResponse.json({ columns });
  },
  { requireCsrf: false, serviceSlug: "opportunities" }
);
