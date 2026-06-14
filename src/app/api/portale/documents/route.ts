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
        ? { client: { email: auth.user.email } }
        : {};

  const items = await prisma.document.findMany({
    where,
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}
