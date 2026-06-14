import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import {
  closeCashSession,
  getCashSessionForDate,
  getTodayCashSessionStatus,
  openCashSession,
  serializeCashSession,
} from "@/lib/platform/cash-register-service";

export const GET = withApi(
  async (request) => {
    const dateParam = new URL(request.url).searchParams.get("date");
    if (dateParam) {
      const date = new Date(`${dateParam}T12:00:00`);
      const session = await getCashSessionForDate(date);
      return NextResponse.json({ session: serializeCashSession(session) });
    }
    const { session, live } = await getTodayCashSessionStatus();
    return NextResponse.json({
      session: serializeCashSession(session),
      live,
    });
  },
  { requireCsrf: false, serviceSlug: "entrate-uscite" }
);

export const POST = withApi(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const action = String(body.action || "open");

      if (action === "open") {
        const session = await openCashSession({
          userId: user.id,
          openingAmount: Number(body.openingAmount),
          notes: body.notes ? String(body.notes) : undefined,
        });
        return NextResponse.json({ session: serializeCashSession(session) }, { status: 201 });
      }

      if (action === "close") {
        const session = await closeCashSession({
          userId: user.id,
          closingAmount: Number(body.closingAmount),
          notes: body.notes ? String(body.notes) : undefined,
        });
        return NextResponse.json({ session: serializeCashSession(session) });
      }

      return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
  { serviceSlug: "entrate-uscite" }
);
