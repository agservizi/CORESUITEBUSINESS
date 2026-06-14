import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { verifyMfaToken } from "@/lib/mfa";
import { prisma } from "@/lib/prisma";

export const POST = withApi(
  async (request, { user }) => {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Codice richiesto" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { mfaSecret: true, mfaEnabled: true },
    });

    if (!dbUser?.mfaEnabled || !dbUser.mfaSecret) {
      return NextResponse.json({ error: "MFA non attivo" }, { status: 400 });
    }

    if (!verifyMfaToken(dbUser.mfaSecret, String(token))) {
      return NextResponse.json({ error: "Codice non valido" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: null, mfaEnabled: false },
    });

    return NextResponse.json({ success: true, mfaEnabled: false });
  },
  { requireCsrf: false }
);
