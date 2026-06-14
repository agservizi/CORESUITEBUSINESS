import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const [profile, recentLogins] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        mfaEnabled: true,
        passwordChangedAt: true,
        createdAt: true,
        lastLoginAt: true,
        name: true,
      },
    }),
    prisma.loginAudit.findMany({
      where: { userId: user.id, success: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({ profile, recentLogins });
}
