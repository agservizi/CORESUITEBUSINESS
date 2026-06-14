import { prisma } from "@/lib/prisma";

export async function sendEnergyReminder(contractId: string, subject: string, recipient: string) {
  const contract = await prisma.energyContract.findUnique({
    where: { id: contractId },
    include: { client: { select: { name: true, email: true } } },
  });
  if (!contract) throw new Error("Contratto non trovato");

  const to = recipient || contract.client?.email;
  if (!to) throw new Error("Email destinatario mancante");

  return prisma.energyEmailLog.create({
    data: {
      contractId,
      subject,
      recipient: to,
      status: "sent",
      sentAt: new Date(),
    },
  });
}

export async function listEnergyEmailLogs(contractId: string) {
  return prisma.energyEmailLog.findMany({
    where: { contractId },
    orderBy: { sentAt: "desc" },
  });
}

export async function getCurriculumFull(id: string) {
  return prisma.curriculumRecord.findUnique({
    where: { id },
    include: {
      client: { select: { name: true, email: true } },
      experiences: { orderBy: { ordering: "asc" } },
      education: { orderBy: { ordering: "asc" } },
      skills: true,
      languages: true,
    },
  });
}

export async function updateCurriculumProfile(
  id: string,
  data: { summary?: string; keySkills?: string; title?: string; status?: string; notes?: string }
) {
  return prisma.curriculumRecord.update({ where: { id }, data });
}

export async function addCurriculumExperience(curriculumId: string, data: Record<string, unknown>) {
  const count = await prisma.curriculumExperience.count({ where: { curriculumId } });
  return prisma.curriculumExperience.create({
    data: {
      curriculumId,
      roleTitle: String(data.roleTitle),
      employer: String(data.employer),
      city: data.city ? String(data.city) : undefined,
      startDate: new Date(String(data.startDate)),
      endDate: data.endDate ? new Date(String(data.endDate)) : undefined,
      isCurrent: Boolean(data.isCurrent),
      description: data.description ? String(data.description) : undefined,
      ordering: count,
    },
  });
}

export async function addCurriculumEducation(curriculumId: string, data: Record<string, unknown>) {
  const count = await prisma.curriculumEducation.count({ where: { curriculumId } });
  return prisma.curriculumEducation.create({
    data: {
      curriculumId,
      title: String(data.title),
      institution: String(data.institution),
      city: data.city ? String(data.city) : undefined,
      startDate: new Date(String(data.startDate)),
      endDate: data.endDate ? new Date(String(data.endDate)) : undefined,
      description: data.description ? String(data.description) : undefined,
      ordering: count,
    },
  });
}

export async function addCurriculumSkill(curriculumId: string, name: string, level?: string) {
  return prisma.curriculumSkill.create({ data: { curriculumId, name, level } });
}

export async function addCurriculumLanguage(curriculumId: string, language: string, level: string) {
  return prisma.curriculumLanguage.create({ data: { curriculumId, language, level } });
}

export async function deleteCurriculumSection(
  type: "experience" | "education" | "skill" | "language",
  id: string
) {
  switch (type) {
    case "experience":
      return prisma.curriculumExperience.delete({ where: { id } });
    case "education":
      return prisma.curriculumEducation.delete({ where: { id } });
    case "skill":
      return prisma.curriculumSkill.delete({ where: { id } });
    case "language":
      return prisma.curriculumLanguage.delete({ where: { id } });
  }
}
