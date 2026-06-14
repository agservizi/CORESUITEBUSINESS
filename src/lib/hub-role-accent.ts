export type HubRoleAccent = {
  primary: string;
  secondary: string;
  meshA: string;
  meshB: string;
  meshC: string;
  label: string;
};

const ADMIN_ACCENT: HubRoleAccent = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  meshA: "rgba(99,102,241,0.2)",
  meshB: "rgba(139,92,246,0.14)",
  meshC: "rgba(14,165,233,0.1)",
  label: "Admin",
};

const OPERATOR_ACCENT: HubRoleAccent = {
  primary: "#06b6d4",
  secondary: "#10b981",
  meshA: "rgba(6,182,212,0.18)",
  meshB: "rgba(16,185,129,0.12)",
  meshC: "rgba(245,158,11,0.08)",
  label: "Operatore",
};

const DEFAULT_ACCENT: HubRoleAccent = {
  primary: "#6366f1",
  secondary: "#a78bfa",
  meshA: "rgba(99,102,241,0.18)",
  meshB: "rgba(167,139,250,0.12)",
  meshC: "rgba(6,182,212,0.1)",
  label: "Hub",
};

export function getHubRoleAccent(role: string): HubRoleAccent {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return ADMIN_ACCENT;
  if (role === "OPERATORE") return OPERATOR_ACCENT;
  return DEFAULT_ACCENT;
}
