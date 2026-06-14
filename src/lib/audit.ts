import { prisma } from "./prisma";
import type { Prisma } from "@/generated/prisma";

export async function logLoginAttempt(params: {
  email: string;
  success: boolean;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}) {
  await prisma.loginAudit.create({
    data: {
      email: params.email,
      success: params.success,
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      reason: params.reason,
    },
  });
}

export async function checkLoginLock(email: string, ipAddress?: string) {
  const record = await prisma.loginAttempt.findFirst({
    where: { email, ipAddress: ipAddress ?? null },
  });

  if (record?.lockedUntil && record.lockedUntil > new Date()) {
    return { locked: true, until: record.lockedUntil };
  }
  return { locked: false };
}

export async function registerFailedLogin(email: string, ipAddress?: string) {
  const existing = await prisma.loginAttempt.findFirst({
    where: { email, ipAddress: ipAddress ?? null },
  });

  const attempts = (existing?.attempts ?? 0) + 1;
  const lockedUntil =
    attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

  if (existing) {
    await prisma.loginAttempt.update({
      where: { id: existing.id },
      data: { attempts, lockedUntil },
    });
  } else {
    await prisma.loginAttempt.create({
      data: { email, ipAddress, attempts, lockedUntil },
    });
  }
}

export async function clearLoginAttempts(email: string, ipAddress?: string) {
  await prisma.loginAttempt.deleteMany({
    where: { email, ipAddress: ipAddress ?? null },
  });
}

export async function writeAuditLog(params: {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
      ipAddress: params.ipAddress,
    },
  });
}
