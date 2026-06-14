import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { listBrtRecipients, saveBrtRecipient, listBrtLogs } from "@/lib/platform/brt-service";

export const GET = withApi(
  async (request) => {
    const type = new URL(request.url).searchParams.get("type");
    if (type === "logs") {
      return NextResponse.json({ logs: await listBrtLogs() });
    }
    return NextResponse.json({ recipients: await listBrtRecipients() });
  },
  { requireCsrf: false, serviceSlug: "brt" }
);

export const POST = withApi(
  async (request) => {
    const body = await request.json();
    const recipient = await saveBrtRecipient(body);
    return NextResponse.json({ recipient }, { status: 201 });
  },
  { serviceSlug: "brt" }
);
