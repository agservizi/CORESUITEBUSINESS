import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { auditAction } from "@/lib/api-guard";
import { sendEmailCampaign } from "@/lib/platform/module-crud";

export const POST = withApi(
  async (request, { user, params }) => {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID campagna richiesto" }, { status: 400 });

    try {
      const campaign = await sendEmailCampaign(id);
      await auditAction(request, user.id, "SEND", "marketing-campaign", id, {
        recipientCount: campaign.recipientCount,
      });
      return NextResponse.json({ campaign });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore invio campagna";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
  { serviceSlug: "marketing" }
);
