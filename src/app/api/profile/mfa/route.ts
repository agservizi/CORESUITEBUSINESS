import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { createMfaSecret, getMfaQrDataUrl, verifyMfaToken } from "@/lib/mfa";

export async function POST(request: NextRequest) {
  return withApi(async (_req, { user }) => {
    const secret = createMfaSecret(user.email);
    const qrDataUrl = await getMfaQrDataUrl(user.email, secret);

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret, mfaEnabled: false },
    });

    return NextResponse.json({ qrDataUrl, secret });
  })(request);
}

export async function PUT(request: NextRequest) {
  return withApi(async (req, { user }) => {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: "Codice richiesto" }, { status: 400 });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { mfaSecret: true },
    });
    if (!dbUser?.mfaSecret) {
      return NextResponse.json({ error: "Configura prima MFA" }, { status: 400 });
    }

    if (!verifyMfaToken(dbUser.mfaSecret, String(code))) {
      return NextResponse.json({ error: "Codice non valido" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    });

    return NextResponse.json({ success: true, mfaEnabled: true });
  })(request);
}

export async function DELETE(request: NextRequest) {
  return withApi(async (_req, { user }) => {
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    return NextResponse.json({ success: true, mfaEnabled: false });
  })(request);
}
