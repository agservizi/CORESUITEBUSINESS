import { prisma } from "@/lib/prisma";

export type ExpressScanSessionStatus = "waiting" | "scanned" | "consumed";

export type ExpressScanSession = {
  token: string;
  userId: string;
  iccid: string | null;
  assignedNumber: string | null;
  status: ExpressScanSessionStatus;
  expiresAt: number;
  createdAt: number;
};

const SESSION_TTL_MS = 10 * 60 * 1000;

function mapRow(row: {
  token: string;
  userId: string;
  iccid: string | null;
  assignedNumber: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}): ExpressScanSession {
  return {
    token: row.token,
    userId: row.userId,
    iccid: row.iccid,
    assignedNumber: row.assignedNumber,
    status: row.status as ExpressScanSessionStatus,
    expiresAt: row.expiresAt.getTime(),
    createdAt: row.createdAt.getTime(),
  };
}

async function cleanupExpiredSessions() {
  await prisma.expressScanSession.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
}

export async function createExpressScanSession(userId: string) {
  await cleanupExpiredSessions();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.expressScanSession.create({
    data: {
      token,
      userId,
      status: "waiting",
      expiresAt,
    },
  });
  return { token, expiresAt: expiresAt.getTime() };
}

export async function getExpressScanSession(token: string): Promise<ExpressScanSession | null> {
  const row = await prisma.expressScanSession.findUnique({ where: { token } });
  if (!row || row.expiresAt.getTime() <= Date.now()) {
    if (row) {
      await prisma.expressScanSession.delete({ where: { token } }).catch(() => undefined);
    }
    return null;
  }
  return mapRow(row);
}

export async function submitExpressScanSession(
  token: string,
  iccid: string,
  assignedNumber?: string | null
): Promise<boolean> {
  const row = await prisma.expressScanSession.findUnique({ where: { token } });
  if (!row || row.expiresAt.getTime() <= Date.now() || row.status !== "waiting") {
    return false;
  }
  await prisma.expressScanSession.update({
    where: { token },
    data: {
      iccid: iccid.trim(),
      assignedNumber: assignedNumber?.trim() || null,
      status: "scanned",
    },
  });
  return true;
}

export async function consumeExpressScanSession(
  token: string,
  userId: string
): Promise<{ iccid: string; assignedNumber: string | null } | null> {
  const row = await prisma.expressScanSession.findUnique({ where: { token } });
  if (
    !row ||
    row.expiresAt.getTime() <= Date.now() ||
    row.userId !== userId ||
    row.status !== "scanned" ||
    !row.iccid
  ) {
    return null;
  }
  await prisma.expressScanSession.update({
    where: { token },
    data: { status: "consumed" },
  });
  return { iccid: row.iccid, assignedNumber: row.assignedNumber };
}
