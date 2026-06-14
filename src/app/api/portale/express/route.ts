import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { notifyExpressRequest } from "@/lib/platform/express-wow";

async function resolveExpressClient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { clientId: true },
  });
  if (!user?.clientId) return null;

  const portal = await prisma.expressPortalClient.findUnique({
    where: { clientId: user.clientId },
  });
  if (!portal || portal.status !== "active") return null;

  return user.clientId;
}

export const GET = withApi(
  async (request, { user }) => {
    const clientId = await resolveExpressClient(user.id);
    if (!clientId) {
      return NextResponse.json({ error: "Portale Express non attivo per questo account" }, { status: 403 });
    }

    const view = new URL(request.url).searchParams.get("view") || "catalog";

    if (view === "catalog") {
      const products = await prisma.expressProduct.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, price: true, category: true, stockQty: true },
      });
      return NextResponse.json({
        items: products.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          category: p.category,
          inStock: p.stockQty > 0,
        })),
      });
    }

    if (view === "orders") {
      const requests = await prisma.expressRequest.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        include: { product: { select: { name: true, price: true } } },
      });
      return NextResponse.json({
        items: requests.map((r) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          requestType: r.requestType,
          createdAt: r.createdAt.toISOString(),
          product: r.product,
          depositAmount: r.depositAmount ? Number(r.depositAmount) : null,
          installments: r.installments,
        })),
      });
    }

    if (view === "receipts") {
      const sales = await prisma.expressSale.findMany({
        where: { clientId, status: { not: "Annullata" } },
        orderBy: { soldAt: "desc" },
        take: 50,
        select: {
          id: true,
          total: true,
          soldAt: true,
          paymentMethod: true,
          receiptNumber: true,
          receiptToken: true,
          mysqlId: true,
        },
      });
      return NextResponse.json({
        items: sales.map((s) => ({
          id: s.id,
          total: Number(s.total),
          soldAt: s.soldAt.toISOString(),
          paymentMethod: s.paymentMethod,
          receiptNumber: s.receiptNumber ?? s.mysqlId,
          receiptToken: s.receiptToken,
        })),
      });
    }

    return NextResponse.json({ error: "Vista non supportata" }, { status: 400 });
  },
  { requireCsrf: false }
);

export const POST = withApi(async (request, { user }) => {
  const clientId = await resolveExpressClient(user.id);
  if (!clientId) {
    return NextResponse.json({ error: "Portale Express non attivo" }, { status: 403 });
  }

  const body = await request.json();
  if (body.action === "createRequest") {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    });
    const item = await prisma.expressRequest.create({
      data: {
        clientId,
        productId: body.productId || null,
        title: String(body.title || "Richiesta acquisto"),
        requestType: body.requestType || "Purchase",
        status: "Pending",
        clientNotes: body.clientNotes || null,
        depositAmount: body.depositAmount != null ? Number(body.depositAmount) : null,
        installments: body.installments != null ? Number(body.installments) : null,
        paymentMethod: body.paymentMethod || null,
        desiredDate: body.desiredDate ? new Date(body.desiredDate) : null,
      },
      include: { product: { select: { name: true, price: true } } },
    });
    await notifyExpressRequest(item.id, client?.name || "Cliente", item.title);
    return NextResponse.json(
      {
        item,
        posPrefillUrl: `/services/express?v=pos&prefillRequest=${item.id}`,
      },
      { status: 201 }
    );
  }

  if (body.action === "quickPurchase" && body.productId) {
    const product = await prisma.expressProduct.findUnique({ where: { id: body.productId } });
    if (!product) return NextResponse.json({ error: "Prodotto non trovato" }, { status: 404 });
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } });
    const item = await prisma.expressRequest.create({
      data: {
        clientId,
        productId: product.id,
        title: `Acquisto rapido: ${product.name}`,
        requestType: "Purchase",
        status: "Pending",
        paymentMethod: "Contanti",
      },
    });
    await notifyExpressRequest(item.id, client?.name || "Cliente", item.title);
    return NextResponse.json(
      {
        item,
        message: "Richiesta inviata al negozio",
        posPrefillUrl: `/services/express?v=pos&prefillRequest=${item.id}`,
      },
      { status: 201 }
    );
  }

  return NextResponse.json({ error: "Azione non supportata" }, { status: 400 });
});
