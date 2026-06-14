import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const q = (new URL(request.url).searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ clients: [], leads: [], deals: [] });
  }

  const [clients, leads, deals] = await Promise.all([
    prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { vatNumber: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, companyName: true, email: true, status: true },
    }),
    prisma.lead.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { contactName: { contains: q, mode: "insensitive" } },
          { contactEmail: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        value: true,
        client: { select: { name: true, companyName: true } },
      },
    }),
    prisma.deal.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { client: { name: { contains: q, mode: "insensitive" } } },
          { client: { companyName: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        value: true,
        client: { select: { name: true, companyName: true } },
      },
    }),
  ]);

  return NextResponse.json({ clients, leads, deals });
}
