import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { getFinanceInsights, searchFinanceMovements } from "@/lib/platform/finance-dashboard-service";

export const GET = withApi(
  async (request) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    if (q) {
      const items = await searchFinanceMovements(q);
      return NextResponse.json({
        items: items.map((m) => ({
          id: m.id,
          type: m.type,
          description: m.description,
          amount: Number(m.amount),
          method: m.method,
          status: m.status,
          clientName: m.client?.name,
          receiptNumber: m.expressSale?.receiptNumber,
        })),
      });
    }
    const data = await getFinanceInsights();
    return NextResponse.json(data);
  },
  { requireCsrf: false, serviceSlug: "entrate-uscite" }
);
