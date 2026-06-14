import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const isDone = searchParams.get("done");
  const clientId = searchParams.get("clientId") || undefined;
  const leadId = searchParams.get("leadId") || undefined;

  const activities = await prisma.activity.findMany({
    where: {
      ...(isDone !== null && { isDone: isDone === "true" }),
      ...(clientId && { clientId }),
      ...(leadId && { leadId }),
    },
    include: {
      author: { select: { name: true } },
      client: { select: { name: true, companyName: true } },
      lead: { select: { title: true } },
    },
    orderBy: [{ isDone: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  return NextResponse.json(activities);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const data = await request.json();

  const activity = await prisma.activity.create({
    data: {
      type: data.type || "TASK",
      title: data.title,
      description: data.description,
      dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
      authorId: user.id,
      ...(data.clientId && { clientId: data.clientId }),
      ...(data.leadId && { leadId: data.leadId }),
    },
    include: {
      author: { select: { name: true } },
      client: { select: { name: true, companyName: true } },
      lead: { select: { title: true } },
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
