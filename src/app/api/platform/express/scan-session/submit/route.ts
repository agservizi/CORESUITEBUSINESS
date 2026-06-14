import { NextRequest, NextResponse } from "next/server";
import {
  getExpressScanSession,
  submitExpressScanSession,
} from "@/lib/platform/express-scan-sessions";
import { isScannableCode, normalizeBarcodeScan } from "@/lib/platform/express-scan-formats";

/** Invio scansione da smartphone — autenticazione tramite token QR (no login). */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const token = String(body.token || "");
  const rawValue = String(body.iccid || body.value || "");
  const assignedNumber =
    body.assignedNumber == null ? null : String(body.assignedNumber);

  if (!token) {
    return NextResponse.json({ error: "Token mancante" }, { status: 400 });
  }

  try {
    const session = await getExpressScanSession(token);
    if (!session) {
      return NextResponse.json({ error: "Sessione scaduta o non valida" }, { status: 404 });
    }

    const value = normalizeBarcodeScan(rawValue);
    if (!isScannableCode(value)) {
      return NextResponse.json({ error: "Codice non valido" }, { status: 400 });
    }

    const ok = await submitExpressScanSession(token, value, assignedNumber);
    if (!ok) {
      return NextResponse.json({ error: "Scansione già inviata o sessione chiusa" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[express/scan-session/submit]", e);
    return NextResponse.json({ error: "Errore interno scanner Express" }, { status: 500 });
  }
}
