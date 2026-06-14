import { prisma } from "./prisma";
import { getPlatformService } from "@/config/platform-services";
import { canAccessService } from "./roles";

export async function userHasServiceAccess(
  userId: string,
  role: string,
  serviceSlug: string
): Promise<boolean> {
  if (role === "SUPER_ADMIN") return true;

  const service = getPlatformService(serviceSlug);
  if (!service) return false;
  if (!canAccessService(role, service.roles)) return false;

  const dbService = await prisma.service.findUnique({ where: { slug: serviceSlug } });
  if (!dbService) return true;

  const perm = await prisma.servicePermission.findUnique({
    where: { userId_serviceId: { userId, serviceId: dbService.id } },
  });

  if (role === "ADMIN" || role === "MANAGER") return true;
  if (!perm && ["OPERATORE", "PATRONATO", "COLLABORATORE"].includes(role)) {
    return service.status === "active";
  }
  return Boolean(perm);
}

export async function requireRole(roles: string[], userRole: string) {
  if (userRole === "SUPER_ADMIN") return true;
  return roles.includes(userRole);
}

export const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATORE", "PATRONATO", "COLLABORATORE"];

export function isStaff(role: string) {
  return STAFF_ROLES.includes(role);
}
