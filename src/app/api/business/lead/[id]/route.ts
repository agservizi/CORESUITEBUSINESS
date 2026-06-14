import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leadStatusFromStageName } from "@/lib/business-pipeline";
import { notifyBusinessEvent } from "@/lib/business-wow";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      client: true,
      assignee: { select: { id: true, name: true, email: true } },
      stage: { select: { id: true, name: true, color: true } },
      pipeline: { select: { id: true, name: true, stages: { orderBy: { order: "asc" } } } },
      notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      activities: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;
  const data = await request.json();

  const prev = await prisma.lead.findUnique({
    where: { id },
    select: { assigneeId: true, title: true, stageId: true },
  });

  let statusUpdate: string | undefined;
  if (data.stageId !== undefined) {
    const stage = await prisma.pipelineStage.findUnique({
      where: { id: data.stageId },
      select: { name: true },
    });
    if (stage) statusUpdate = leadStatusFromStageName(stage.name);
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.stageId !== undefined && { stageId: data.stageId }),
      ...(statusUpdate !== undefined && { status: statusUpdate as "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.value !== undefined && { value: data.value ? parseFloat(data.value) : null }),
      ...(data.expectedClose !== undefined && { expectedClose: data.expectedClose ? new Date(data.expectedClose) : null }),
      ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId || null }),
    },
    include: {
      stage: { select: { name: true, color: true } },
    },
  });

  if (data.assigneeId && data.assigneeId !== prev?.assigneeId) {
    await notifyBusinessEvent({
      title: "Lead assegnato a te",
      body: lead.title,
      type: "business_lead_assigned",
      link: `/business?v=lead&id=${lead.id}`,
      userIds: [data.assigneeId],
    });
  }

  return NextResponse.json(lead);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;
  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
