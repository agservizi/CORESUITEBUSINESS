import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const [
    totalClients,
    activeClients,
    totalLeads,
    newLeads,
    wonLeads,
    totalDeals,
    revenueWon,
    recentActivities,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: "ACTIVE" } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.count({ where: { status: "WON" } }),
    prisma.deal.count(),
    prisma.deal.aggregate({ where: { status: "WON" }, _sum: { value: true } }),
    prisma.activity.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true } },
        client: { select: { name: true } },
        lead: { select: { title: true } },
      },
    }),
  ]);

  // Lead value in pipeline
  const pipelineValue = await prisma.lead.aggregate({
    where: { status: { notIn: ["WON", "LOST"] } },
    _sum: { value: true },
  });

  return NextResponse.json({
    totalClients,
    activeClients,
    totalLeads,
    newLeads,
    wonLeads,
    totalDeals,
    revenueWon: revenueWon._sum.value || 0,
    pipelineValue: pipelineValue._sum.value || 0,
    conversionRate: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0,
    activeClientRate: totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0,
    avgLeadValue: totalLeads > 0 ? Math.round((pipelineValue._sum.value || 0) / totalLeads) : 0,
    recentActivities,
  });
}
