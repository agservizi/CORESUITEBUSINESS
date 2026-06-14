import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") || "";
  const status = searchParams.get("status") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1), 100);

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { companyName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(status && { status: status as "ACTIVE" | "INACTIVE" | "PROSPECT" | "CHURNED" }),
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { leads: true, deals: true } },
      },
    }),
    prisma.client.count({ where }),
  ]);

  return NextResponse.json({ clients, total, page, limit });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const data = await request.json();

  const client = await prisma.client.create({
    data: {
      name: data.name,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      website: data.website,
      city: data.city,
      country: data.country || "IT",
      taxCode: data.taxCode,
      vatNumber: data.vatNumber,
      type: data.type || "COMPANY",
      status: data.status || "ACTIVE",
      tags: data.tags || [],
      morosityFlag: Boolean(data.morosityFlag),
      morosityScore: data.morosityScore || "OK",
      morosityNote: data.morosityNote || undefined,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
