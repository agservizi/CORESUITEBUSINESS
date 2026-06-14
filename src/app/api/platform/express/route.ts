import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import type { ExpressPeriod } from "@/lib/platform/express-analytics";
import {
  completePdaImport,
  convertRequestToSale,
  createExpressOffer,
  createExpressOperator,
  createExpressProduct,
  createPdaImport,
  deleteDiscountCampaign,
  deleteExpressOffer,
  deleteExpressProduct,
  exportSalesCsv,
  getCampaignPerformance,
  getPdaPrefill,
  getProductInsights,
  linkPortalClient,
  listDiscountCampaigns,
  listExpressRequests,
  listExpressSalesFiltered,
  listOpenStockAlerts,
  listPdaImports,
  listPortalClients,
  refundExpressSaleLines,
  restockExpressProduct,
  syncStockAlerts,
  unlinkPortalClient,
  updateExpressOffer,
  updateExpressOperator,
  updateExpressProduct,
  updateExpressSettings,
  updatePortalClientPickup,
  updatePortalClientStatus,
  upsertDiscountCampaign,
  upsertExpressRequest,
} from "@/lib/platform/express-admin";
import { generateExpressSalePdf } from "@/lib/platform/express-sale-pdf";
import {
  computeCartMargin,
  getCartSuggestions,
  getClientTimeline,
  getExpressClientProfile,
  getOfferComparison,
  getPredictiveReorderActions,
  getPublicReceipt,
  getRequestPrefill,
  getStaffLeaderboard,
  lookupExpressClient,
} from "@/lib/platform/express-wow";
import {
  bulkImportIccid,
  cancelExpressSale,
  createExpressSale,
  getExpressDashboard,
  getExpressReport,
  getExpressSale,
  getPosContext,
  listExpressOffers,
  listExpressOperatorsWithStock,
  listExpressProducts,
  listIccidStock,
  lookupIccidByCode,
  updateIccidAssignedNumber,
  updateOperatorThreshold,
} from "@/lib/platform/express-service";

export const GET = withApi(
  async (request) => {
    try {
      const params = new URL(request.url).searchParams;
      const view = params.get("view") || "dashboard";
      const id = params.get("id");
      const period = (params.get("period") || "day") as ExpressPeriod;

      if (params.get("export") === "csv" && (view === "sales" || view === "vendite")) {
        const csv = await exportSalesCsv({
          status: params.get("status") || undefined,
          from: params.get("from") || undefined,
          to: params.get("to") || undefined,
          search: params.get("search") || undefined,
        });
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="express-vendite.csv"',
          },
        });
      }

      if (params.get("format") === "pdf" && id) {
        const pdf = await generateExpressSalePdf(id);
        if (!pdf) return NextResponse.json({ error: "Vendita non trovata" }, { status: 404 });
        return new NextResponse(new Uint8Array(pdf), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="vendita-${id.slice(-8)}.pdf"`,
          },
        });
      }

      if (id && view === "pda") {
        const prefill = await getPdaPrefill(id);
        if (!prefill) return NextResponse.json({ error: "Import PDA non trovato" }, { status: 404 });
        return NextResponse.json({ prefill });
      }

      if (view === "public-receipt" && id && params.get("token")) {
        const receipt = await getPublicReceipt(id, params.get("token") || "");
        if (!receipt) return NextResponse.json({ error: "Ricevuta non trovata" }, { status: 404 });
        return NextResponse.json({ receipt });
      }

      if (id) {
        const sale = await getExpressSale(id);
        if (!sale) return NextResponse.json({ error: "Vendita non trovata" }, { status: 404 });
        return NextResponse.json({ sale });
      }

      if (params.get("iccid")) {
        const row = await lookupIccidByCode(params.get("iccid") || "");
        return NextResponse.json({ iccid: row });
      }

      if (view === "client-profile" && params.get("clientId")) {
        const client = await getExpressClientProfile(params.get("clientId") || "");
        return NextResponse.json({ client });
      }

      if (view === "client-lookup" && params.get("q")) {
        const client = await lookupExpressClient(params.get("q") || "");
        return NextResponse.json({ client });
      }

      if (view === "client-timeline" && params.get("clientId")) {
        return NextResponse.json({
          items: await getClientTimeline(params.get("clientId") || ""),
        });
      }

      if (view === "offer-comparison" || view === "confronto") {
        return NextResponse.json(await getOfferComparison());
      }

      if (view === "staff-leaderboard") {
        return NextResponse.json({
          items: await getStaffLeaderboard(
            (params.get("period") as "day" | "month") || "day"
          ),
        });
      }

      if (view === "predictive-reorder") {
        return NextResponse.json(await getPredictiveReorderActions());
      }

      if (view === "request-prefill" && params.get("requestId")) {
        const prefill = await getRequestPrefill(params.get("requestId") || "");
        if (!prefill) return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 });
        return NextResponse.json({ prefill });
      }

      switch (view) {
        case "dashboard":
          return NextResponse.json(await getExpressDashboard(period));
        case "pos":
          return NextResponse.json(await getPosContext());
        case "sales":
        case "vendite":
          return NextResponse.json(
            await listExpressSalesFiltered({
              status: params.get("status") || undefined,
              paymentMethod: params.get("paymentMethod") || undefined,
              operatorId: params.get("operatorId") || undefined,
              from: params.get("from") || undefined,
              to: params.get("to") || undefined,
              search: params.get("search") || undefined,
              page: Number(params.get("page") || 1),
              limit: Number(params.get("limit") || 50),
            })
          );
        case "offers":
        case "offerte":
          return NextResponse.json({ items: await listExpressOffers() });
        case "operators":
        case "operatori":
          return NextResponse.json({ items: await listExpressOperatorsWithStock() });
        case "products":
        case "prodotti":
          return NextResponse.json({ items: await listExpressProducts() });
        case "stock":
        case "magazzino":
          return NextResponse.json(
            await listIccidStock({
              page: Number(params.get("page") || 1),
              perPage: Number(params.get("perPage") || 15),
              operatorId: params.get("operatorId") || undefined,
              status: params.get("status") || undefined,
              search: params.get("search") || undefined,
            })
          );
        case "report":
          return NextResponse.json(
            await getExpressReport(
              (params.get("granularity") as "daily" | "monthly" | "yearly") || "daily",
              {
                from: params.get("from") || undefined,
                to: params.get("to") || undefined,
              }
            )
          );
        case "settings":
        case "impostazioni":
          return NextResponse.json({
            settings: await import("@/lib/platform/express-admin").then((m) => m.getExpressSettingsRecord()),
            operators: await listExpressOperatorsWithStock(),
            campaigns: await listDiscountCampaigns(),
          });
        case "campaigns":
          return NextResponse.json({ items: await getCampaignPerformance() });
        case "alerts":
          await syncStockAlerts();
          return NextResponse.json({ items: await listOpenStockAlerts() });
        case "requests":
        case "richieste":
          return NextResponse.json({
            items: await listExpressRequests(params.get("status") || undefined),
          });
        case "portale":
          return NextResponse.json({ items: await listPortalClients() });
        case "pda":
          return NextResponse.json({ items: await listPdaImports() });
        case "product-insights":
          return NextResponse.json({ items: await getProductInsights() });
        default:
          return NextResponse.json(await getExpressDashboard(period));
      }
    } catch (error) {
      console.error("GET /api/platform/express:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Errore caricamento Express" },
        { status: 500 }
      );
    }
  },
  { requireCsrf: false, serviceSlug: "express" }
);

export const POST = withApi(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const action = body.action || "createSale";

      if (action === "createSale") {
        const { sale, integrations } = await createExpressSale({
          clientId: body.clientId,
          userId: user.id,
          paymentMethod: body.paymentMethod || "Contanti",
          discount: body.discount ? Number(body.discount) : 0,
          discountCampaignId: body.discountCampaignId,
          notes: body.notes,
          pdaImportId: body.pdaImportId,
          lines: body.lines || [],
        });
        return NextResponse.json({ sale, integrations }, { status: 201 });
      }

      if (action === "cancelSale") {
        if (!body.id) return NextResponse.json({ error: "ID vendita mancante" }, { status: 400 });
        return NextResponse.json({ sale: await cancelExpressSale(String(body.id)) });
      }

      if (action === "refundSale") {
        if (!body.id || !body.refunds?.length) {
          return NextResponse.json({ error: "Dati rimborso mancanti" }, { status: 400 });
        }
        return NextResponse.json({
          sale: await refundExpressSaleLines(String(body.id), body.refunds),
        });
      }

      if (action === "importIccid") {
        return NextResponse.json(
          await bulkImportIccid({
            operatorId: String(body.operatorId),
            iccids: Array.isArray(body.iccids)
              ? body.iccids
              : String(body.raw || "").split(/[\n,;]+/),
          })
        );
      }

      if (action === "updateThreshold") {
        return NextResponse.json({
          operator: await updateOperatorThreshold(String(body.operatorId), Number(body.threshold)),
        });
      }

      if (action === "createOperator") {
        return NextResponse.json({ item: await createExpressOperator(body) }, { status: 201 });
      }

      if (action === "updateOperator") {
        return NextResponse.json({ item: await updateExpressOperator(String(body.id), body) });
      }

      if (action === "deleteOffer") {
        return NextResponse.json({ item: await deleteExpressOffer(String(body.id)) });
      }

      if (action === "deleteProduct") {
        return NextResponse.json({ item: await deleteExpressProduct(String(body.id)) });
      }

      if (action === "deleteCampaign") {
        return NextResponse.json({ item: await deleteDiscountCampaign(String(body.id)) });
      }

      if (action === "updateIccidNumber") {
        if (!body.id) {
          return NextResponse.json({ error: "ID SIM mancante" }, { status: 400 });
        }
        return NextResponse.json({
          item: await updateIccidAssignedNumber(String(body.id), body.assignedNumber ?? null),
        });
      }

      if (action === "updateSettings") {
        await updateExpressSettings(body.settings || body);
        return NextResponse.json({ ok: true });
      }

      if (action === "createOffer") {
        return NextResponse.json({ item: await createExpressOffer(body) }, { status: 201 });
      }

      if (action === "updateOffer") {
        return NextResponse.json({ item: await updateExpressOffer(String(body.id), body) });
      }

      if (action === "createProduct") {
        return NextResponse.json({ item: await createExpressProduct(body) }, { status: 201 });
      }

      if (action === "updateProduct") {
        return NextResponse.json({ item: await updateExpressProduct(String(body.id), body) });
      }

      if (action === "restockProduct") {
        return NextResponse.json({
          item: await restockExpressProduct(String(body.id), Number(body.qty)),
        });
      }

      if (action === "upsertCampaign") {
        return NextResponse.json({ item: await upsertDiscountCampaign(body) });
      }

      if (action === "upsertRequest") {
        return NextResponse.json({
          item: await upsertExpressRequest({
            ...body,
            handledById: body.status !== "Pending" ? user.id : undefined,
          }),
        });
      }

      if (action === "convertRequest") {
        if (!body.id) return NextResponse.json({ error: "ID richiesta mancante" }, { status: 400 });
        return NextResponse.json({
          sale: await convertRequestToSale(String(body.id), user.id, body.lines),
        });
      }

      if (action === "linkPortal") {
        return NextResponse.json({
          item: await linkPortalClient(String(body.clientId), body.pickupMysqlId ? Number(body.pickupMysqlId) : undefined),
        });
      }

      if (action === "updatePortal") {
        return NextResponse.json({
          item: await updatePortalClientStatus(String(body.id), String(body.status)),
        });
      }

      if (action === "unlinkPortal") {
        return NextResponse.json({ item: await unlinkPortalClient(String(body.id)) });
      }

      if (action === "updatePortalPickup") {
        return NextResponse.json({
          item: await updatePortalClientPickup(
            String(body.id),
            body.pickupMysqlId != null ? Number(body.pickupMysqlId) : null
          ),
        });
      }

      if (action === "createPda") {
        return NextResponse.json(
          { item: await createPdaImport(body.payload || body, user.id, body.reference) },
          { status: 201 }
        );
      }

      if (action === "completePda") {
        if (!body.id || !body.saleId) {
          return NextResponse.json({ error: "ID PDA e vendita richiesti" }, { status: 400 });
        }
        return NextResponse.json({
          item: await completePdaImport(String(body.id), String(body.saleId)),
        });
      }

      if (action === "syncAlerts") {
        return NextResponse.json(await syncStockAlerts());
      }

      if (action === "getSuggestions") {
        return NextResponse.json({
          items: await getCartSuggestions({
            clientId: body.clientId,
            cart: body.cart || [],
          }),
        });
      }

      if (action === "computeMargin") {
        return NextResponse.json({
          margin: await computeCartMargin(body.lines || []),
        });
      }

      return NextResponse.json({ error: "Azione non supportata" }, { status: 400 });
    } catch (error) {
      console.error("POST /api/platform/express:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Errore operazione Express" },
        { status: 500 }
      );
    }
  },
  { serviceSlug: "express" }
);
