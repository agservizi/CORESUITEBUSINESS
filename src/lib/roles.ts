export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Amministratore",
  MANAGER: "Manager",
  OPERATORE: "Operatore",
  PATRONATO: "Patronato",
  CLIENTE: "Cliente",
  COLLABORATORE: "Collaboratore",
};

export function getRoleLabel(role: string) {
  return ROLE_LABELS[role] || role;
}

const STAFF_ROLES = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "OPERATORE",
  "PATRONATO",
  "COLLABORATORE",
]);

export function isStaffRole(role: string) {
  return STAFF_ROLES.has(role);
}

export function getPostLoginRedirect(role: string): string {
  switch (role) {
    case "PATRONATO":
      return "/services/caf-patronato";
    case "CLIENTE":
      return "/portale";
    case "COLLABORATORE":
      return "/business?v=clienti";
    default:
      return "/dashboard";
  }
}

export function canAccessService(role: string, allowedRoles?: string[]) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (role === "SUPER_ADMIN") return true;
  return allowedRoles.includes(role);
}
