import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { getClientIdForUser } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const clientId = await getClientIdForUser(auth.user);

  const where =
    auth.user.role === "CLIENTE" && clientId
      ? { clientId }
      : auth.user.role === "CLIENTE"
        ? { clientId: "__none__" }
        : undefined;

  const items = await prisma.practice.findMany({
    where,
    take: 20,
    orderBy: { createdAt: "desc" },
    include: { client: { select: { name: true } } },
  });

  return NextResponse.json({ items });
}
