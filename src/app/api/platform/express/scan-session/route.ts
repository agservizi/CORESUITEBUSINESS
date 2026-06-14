import { NextRequest, NextResponse } from "next/server";
import { requireServiceAccess } from "@/lib/api-guard";
import {
  consumeExpressScanSession,
  createExpressScanSession,
  getExpressScanSession,
  submitExpressScanSession,
} from "@/lib/platform/express-scan-sessions";
import { getExpressMobileScanUrl } from "@/lib/platform/express-scan-url";

export async function POST(request: NextRequest) {
  const auth = await requireServiceAccess(request, "express");
  if ("error" in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const action = String(body.action || "");

  try {
    if (action === "create") {
      const { token, expiresAt } = await createExpressScanSession(auth.user.id);
      return NextResponse.json({
        token,
        scanUrl: getExpressMobileScanUrl(token),
        expiresAt,
      });
    }

    if (action === "submit") {
      const token = String(body.token || "");
      const iccid = String(body.iccid || "");
      const assignedNumber =
        body.assignedNumber == null ? null : String(body.assignedNumber);

      const session = await getExpressScanSession(token);
      if (!session) {
        return NextResponse.json({ error: "Sessione non valida o scaduta" }, { status: 404 });
      }

      const ok = await submitExpressScanSession(token, iccid, assignedNumber);
      if (!ok) {
        return NextResponse.json({ error: "Impossibile inviare la scansione" }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "consume") {
      const token = String(body.token || "");
      const result = await consumeExpressScanSession(token, auth.user.id);
      if (!result) {
        return NextResponse.json({ scanned: false });
      }
      return NextResponse.json({ scanned: true, ...result });
    }
  } catch (e) {
    console.error("[express/scan-session]", e);
    const message =
      e instanceof Error && e.message.includes("ExpressScanSession")
        ? "Tabella scanner non migrata — esegui: npx prisma db push"
        : "Errore interno scanner Express";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ error: "Azione non supportata" }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const auth = await requireServiceAccess(request, "express");
  if ("error" in auth) return auth.error;

  const token = request.nextUrl.searchParams.get("token") || "";

  try {
    const session = await getExpressScanSession(token);
    if (!session || session.userId !== auth.user.id) {
      return NextResponse.json({ error: "Sessione non valida" }, { status: 404 });
    }

    return NextResponse.json({
      status: session.status,
      iccid: session.iccid,
      assignedNumber: session.assignedNumber,
      expiresAt: session.expiresAt,
    });
  } catch (e) {
    console.error("[express/scan-session GET]", e);
    return NextResponse.json({ error: "Errore interno scanner Express" }, { status: 500 });
  }
}
