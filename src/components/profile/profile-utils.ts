import { getRoleLabel } from "@/lib/roles";

export interface ProfileUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar?: string | null;
  mfaEnabled: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  passwordChangedAt?: string | null;
}

export const PROFILE_GRADIENT = "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)";
export const PROFILE_ACCENT = "#6366f1";

const ROLE_THEMES: Record<string, { color: string; gradient: string }> = {
  SUPER_ADMIN: { color: "#6366f1", gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" },
  ADMIN: { color: "#8b5cf6", gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" },
  MANAGER: { color: "#0ea5e9", gradient: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)" },
  OPERATORE: { color: "#10b981", gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)" },
  PATRONATO: { color: "#f59e0b", gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" },
  CLIENTE: { color: "#ec4899", gradient: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)" },
  COLLABORATORE: { color: "#14b8a6", gradient: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)" },
};

export function getProfileTheme(role: string) {
  return ROLE_THEMES[role] ?? { color: PROFILE_ACCENT, gradient: PROFILE_GRADIENT };
}

export function getInitials(name: string | null, email: string) {
  const base = name?.trim() || email;
  const parts = base.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export function formatMemberSince(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

export function formatRelativeLogin(iso?: string | null) {
  if (!iso) return "Mai registrato";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Adesso";
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h fa`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gg fa`;
  return new Date(iso).toLocaleString("it-IT");
}

export function profileDisplayName(user: ProfileUser) {
  return user.name?.trim() || user.email.split("@")[0];
}

export function profileRoleLabel(role: string) {
  return getRoleLabel(role);
}

export type ProfileTab = "account" | "security" | "preferences";

export const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "security", label: "Sicurezza" },
  { id: "preferences", label: "Preferenze" },
];
