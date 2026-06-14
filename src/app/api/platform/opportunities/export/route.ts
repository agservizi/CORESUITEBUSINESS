import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { CATEGORY_LABELS, listOpportunities } from "@/lib/platform/opportunities-service";

export const GET = withApi(
  async (request, { user }) => {
    const { items } = await listOpportunities({
      userId: user.id,
      role: user.role,
      page: 1,
      limit: 5000,
    });

    const header = "Codice;Categoria;Cliente;CF;Gestore;Offerta;Commissione;Stato;Collaboratore;Creato";
    const lines = items.map((row) => {
      const r = row as {
        code?: string;
        category?: string;
        customerName?: string;
        customerTaxCode?: string;
        providerLabel?: string;
        offerLabel?: string;
        commission?: number;
        statusLabel?: string;
        collaboratorName?: string;
        createdAt?: string;
      };
      return [
        r.code,
        CATEGORY_LABELS[r.category as keyof typeof CATEGORY_LABELS] || r.category,
        r.customerName,
        r.customerTaxCode,
        r.providerLabel,
        r.offerLabel || "",
        r.commission,
        r.statusLabel,
        r.collaboratorName,
        r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "",
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(";");
    });

    const csv = [header, ...lines].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="opportunities-contratti.csv"',
      },
    });
  },
  { requireCsrf: false, serviceSlug: "opportunities" }
);
