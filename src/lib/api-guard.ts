import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "./auth";
import { canAccessService } from "./roles";
import { getPlatformService } from "@/config/platform-services";
import { writeAuditLog } from "./audit";

export async function requireAuth(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return { error: NextResponse.json({ error: "Non autenticato" }, { status: 401 }) };
  }
  return { user };
}

export async function requireServiceAccess(
  request: NextRequest,
  serviceSlug: string
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const service = getPlatformService(serviceSlug);
  if (!service) {
    return { error: NextResponse.json({ error: "Servizio non trovato" }, { status: 404 }) };
  }

  if (!canAccessService(auth.user.role, service.roles)) {
    return { error: NextResponse.json({ error: "Accesso negato" }, { status: 403 }) };
  }

  return { user: auth.user, service };
}

export async function auditAction(
  request: NextRequest,
  userId: string,
  action: string,
  entity?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined;

  await writeAuditLog({
    userId,
    action,
    entity,
    entityId,
    metadata,
    ipAddress: ip,
  });
}
