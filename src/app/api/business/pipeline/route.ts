import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const pipelines = await prisma.pipeline.findMany({
    include: {
      stages: {
        orderBy: { order: "asc" },
        include: {
          leads: {
            include: {
              client: { select: { name: true, companyName: true } },
              assignee: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  return NextResponse.json(pipelines);
}
