import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { normalizeMovementStatus } from "@/lib/platform/cash-movement-utils";
import type { Prisma } from "@/generated/prisma";

export const GET = withApi(
  async (request) => {
    const url = new URL(request.url);
    const view = url.searchParams.get("view") || "elenco";
    const period = url.searchParams.get("period") || "month";

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (period === "week") {
      const d = start.getDay();
      start.setDate(start.getDate() - (d === 0 ? 6 : d - 1));
    } else if (period === "month") start.setDate(1);
    else if (period === "year") start.setMonth(0, 1);

    let defFilter: Prisma.CashMovementWhereInput = {};
    if (view === "entrate") defFilter = { type: "ENTRATA" };
    else if (view === "uscite") defFilter = { type: "USCITA" };
    else if (view === "scadenze") {
      defFilter = { status: { notIn: ["Pagato", "Completato", "Annullato"] } };
    }

    const items = await prisma.cashMovement.findMany({
      where: { ...defFilter, createdAt: { gte: start } },
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: { client: { select: { name: true } } },
    });

    const header = "Data;Tipo;Descrizione;Importo;Metodo;Stato;Cliente;Scadenza;Margine";
    const lines = items.map((m) =>
      [
        m.createdAt.toISOString().slice(0, 10),
        m.type,
        m.description,
        Number(m.amount).toFixed(2),
        m.method,
        normalizeMovementStatus(m.status),
        m.client?.name || "",
        m.dueDate ? m.dueDate.toISOString().slice(0, 10) : "",
        m.margin != null ? Number(m.margin).toFixed(2) : "",
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(";")
    );

    const csv = [header, ...lines].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="movimenti-${period}.csv"`,
      },
    });
  },
  { requireCsrf: false, serviceSlug: "entrate-uscite" }
);
