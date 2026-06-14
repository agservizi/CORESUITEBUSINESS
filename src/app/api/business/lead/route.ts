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
  const limit = parseInt(searchParams.get("limit") || "20");

  const where = {
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { contactName: { contains: search, mode: "insensitive" as const } },
        { contactEmail: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(status && { status: status as "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" }),
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true, companyName: true } },
        assignee: { select: { name: true, email: true } },
        stage: { select: { name: true, color: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({ leads, total, page, limit });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const data = await request.json();

  const lead = await prisma.lead.create({
    data: {
      title: data.title,
      clientId: data.clientId || undefined,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      source: data.source || "OTHER",
      status: data.status || "NEW",
      priority: data.priority || "MEDIUM",
      value: data.value ? parseFloat(data.value) : undefined,
      assigneeId: data.assigneeId || user.id,
      pipelineId: data.pipelineId,
      stageId: data.stageId,
      expectedClose: data.expectedClose ? new Date(data.expectedClose) : undefined,
    },
    include: {
      client: { select: { name: true } },
      stage: { select: { name: true, color: true } },
    },
  });

  return NextResponse.json(lead, { status: 201 });
}
