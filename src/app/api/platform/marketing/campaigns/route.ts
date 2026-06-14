import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { auditAction } from "@/lib/api-guard";
import { createEmailCampaign } from "@/lib/platform/module-crud";
import { prisma } from "@/lib/prisma";

export const GET = withApi(
  async (request) => {
    const status = new URL(request.url).searchParams.get("status") || undefined;
    const campaigns = await prisma.emailCampaign.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ campaigns });
  },
  { requireCsrf: false, serviceSlug: "marketing" }
);

export const POST = withApi(
  async (request, { user }) => {
    const body = await request.json();
    if (!body.name || !body.subject) {
      return NextResponse.json({ error: "Nome e oggetto richiesti" }, { status: 400 });
    }

    const campaign = await createEmailCampaign(body);
    await auditAction(request, user.id, "CREATE", "marketing-campaign", campaign.id);

    return NextResponse.json({ campaign }, { status: 201 });
  },
  { serviceSlug: "marketing" }
);
