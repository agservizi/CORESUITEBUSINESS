import { prisma } from "@/lib/prisma";

export async function listPracticeEvents(practiceId: string) {
  return prisma.practiceEvent.findMany({
    where: { practiceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function addPracticeEvent(
  practiceId: string,
  eventType: string,
  note: string | undefined,
  userId: string
) {
  const practice = await prisma.practice.findUnique({ where: { id: practiceId } });
  if (!practice) throw new Error("Pratica non trovata");
  return prisma.practiceEvent.create({
    data: { practiceId, eventType, note, createdBy: userId },
  });
}

export async function updatePracticeWorkflow(
  practiceId: string,
  data: {
    status?: string;
    notes?: string;
    priority?: number;
    dueDate?: string | null;
    assignee?: string;
  },
  userId: string
) {
  const practice = await prisma.practice.findUnique({ where: { id: practiceId } });
  if (!practice) throw new Error("Pratica non trovata");

  const updated = await prisma.practice.update({
    where: { id: practiceId },
    data: {
      ...(data.status ? { status: data.status as never } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      ...(data.assignee !== undefined ? { assignee: data.assignee } : {}),
      ...(data.status === "COMPLETATA" ? { completedAt: new Date() } : {}),
      ...(data.status === "INVIATA" ? { submittedAt: new Date() } : {}),
    },
    include: { client: { select: { name: true } } },
  });

  if (data.status && data.status !== practice.status) {
    await prisma.practiceEvent.create({
      data: {
        practiceId,
        eventType: "status_change",
        note: `${practice.status} → ${data.status}`,
        createdBy: userId,
      },
    });
  }

  return updated;
}

export async function sendAnprDelegaOtp(requestId: string, recipient: string, userId: string) {
  const req = await prisma.anprRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error("Richiesta non trovata");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.anprRequest.update({
    where: { id: requestId },
    data: {
      delegaFirmaStatus: "otp_inviato",
      delegaFirmaRecipient: recipient,
    },
  });

  // OTP simulato — in produzione inviare via email/SMS
  return { success: true, otpPreview: otp, recipient };
}

export async function verifyAnprDelega(requestId: string, userId: string) {
  return prisma.anprRequest.update({
    where: { id: requestId },
    data: { delegaFirmaStatus: "firmata", spidVerifiedAt: new Date() },
  });
}
