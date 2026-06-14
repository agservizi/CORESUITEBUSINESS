/** Token di brand Coresuite — unica fonte per gradienti e colori del marchio. */
export const CORESUITE_BRAND = {
  indigo: "#6366f1",
  violet: "#8b5cf6",
  purple: "#7c3aed",
  gradient: "linear-gradient(135deg, #6366f1 0%, #7c3aed 52%, #8b5cf6 100%)",
  gradientSoft: "linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.18) 100%)",
  markShadow: "0 4px 14px rgba(99, 102, 241, 0.35)",
  markShadowLg: "0 8px 28px rgba(99, 102, 241, 0.4)",
} as const;

export type CoresuiteLogoSize = "sm" | "md" | "lg";

export const CORESUITE_LOGO_MARK_SIZE: Record<CoresuiteLogoSize, number> = {
  sm: 28,
  md: 34,
  lg: 42,
};

/** Lockup orizzontale topbar (SVG — trasparenza reale, crop stretto). */
export const CORESUITE_LOGO_TOPBAR = {
  onLight: "/brand/coresuite-logo-dark.svg",
  onDark: "/brand/coresuite-logo-light.svg",
} as const;