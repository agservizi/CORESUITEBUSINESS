import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { verifyMfaToken } from "@/lib/mfa";
import { validatePassword } from "@/lib/password-policy";
import { writeAuditLog } from "@/lib/audit";

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}

export async function POST(request: NextRequest) {
  return withApi(async (req, { user }) => {
    const body = await req.json();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");
    const confirmPassword = String(body.confirmPassword ?? "");
    const mfaCode = body.mfaCode != null ? String(body.mfaCode) : undefined;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "Compila tutti i campi password" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Le password non coincidono" }, { status: 400 });
    }

    const policy = validatePassword(newPassword);
    if (!policy.valid) {
      return NextResponse.json({ error: policy.error }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: "La nuova password deve essere diversa da quella attuale" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true, mfaEnabled: true, mfaSecret: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    const validCurrent = await verifyPassword(currentPassword, dbUser.password);
    if (!validCurrent) {
      return NextResponse.json({ error: "Password attuale non corretta" }, { status: 401 });
    }

    if (dbUser.mfaEnabled) {
      if (!mfaCode || !dbUser.mfaSecret || !verifyMfaToken(dbUser.mfaSecret, mfaCode)) {
        return NextResponse.json({ error: "Codice MFA richiesto e valido per cambiare password" }, { status: 401 });
      }
    }

    const hashed = await hashPassword(newPassword);
    const now = new Date();

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, passwordChangedAt: now },
    });

    await writeAuditLog({
      userId: user.id,
      action: "password_changed",
      entity: "user",
      entityId: user.id,
      ipAddress: clientIp(req),
    });

    return NextResponse.json({
      success: true,
      message: "Password aggiornata con successo",
      passwordChangedAt: now.toISOString(),
    });
  })(request);
}
