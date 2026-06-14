import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { auditAction } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";

function nextCode() {
  return `PL-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export const GET = withApi(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const activeOnly = searchParams.get("active") !== "false";

    const items = await prisma.priceListItem.findMany({
      where: {
        ...(category && { category }),
        ...(activeOnly && { isActive: true }),
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ items });
  },
  { requireCsrf: false, serviceSlug: "entrate-uscite" }
);

export const POST = withApi(
  async (request, { user }) => {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "Nome richiesto" }, { status: 400 });
    }

    const resellerCost = Number(body.resellerCost) || 0;
    const clientPrice = Number(body.clientPrice) || 0;
    const margin = body.margin !== undefined ? Number(body.margin) : clientPrice - resellerCost;

    const item = await prisma.priceListItem.create({
      data: {
        code: body.code ? String(body.code) : nextCode(),
        name: String(body.name),
        category: body.category ? String(body.category) : undefined,
        resellerCost,
        clientPrice,
        margin,
        isActive: body.isActive !== false,
      },
    });

    await auditAction(request, user.id, "CREATE", "listino", item.id);
    return NextResponse.json({ item }, { status: 201 });
  },
  { serviceSlug: "entrate-uscite" }
);
