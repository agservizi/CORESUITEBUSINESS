import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { createMfaSecret, getMfaQrDataUrl } from "@/lib/mfa";
import { prisma } from "@/lib/prisma";

export const POST = withApi(
  async (_request, { user }) => {
    if (user.mfaEnabled) {
      return NextResponse.json({ error: "MFA già attivo" }, { status: 400 });
    }

    const secret = createMfaSecret(user.email);
    const qrCode = await getMfaQrDataUrl(user.email, secret);

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret },
    });

    return NextResponse.json({ secret, qrCode });
  },
  { requireCsrf: false }
);
