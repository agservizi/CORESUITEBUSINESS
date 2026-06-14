import type { Transition, Variants } from "framer-motion";

/** Curva premium usata in tutto l'hub */
export const hubEase = [0.22, 1, 0.36, 1] as const;

export const hubSpring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 0.85,
};

export const hubSpringSoft = {
  type: "spring" as const,
  stiffness: 260,
  damping: 28,
};

export const hubPageTransition: Transition = {
  duration: 0.55,
  ease: hubEase,
};

/** Container stagger per sezioni dashboard */
export const hubStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

export const hubStaggerFast: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

/** Fade + slide up */
export const hubFadeUp: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: hubPageTransition,
  },
};

export const hubFadeUpSoft: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: hubEase },
  },
};

/** Slide da destra (sidebar / panel) */
export const hubSlideInRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: hubEase, delay: 0.15 },
  },
};

/** Scale in per card */
export const hubScaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: hubSpring,
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: -8,
    transition: { duration: 0.22 },
  },
};

/** Hero headline — parola per parola */
export const hubHeroWord: Variants = {
  hidden: { opacity: 0, y: 24, rotateX: -40 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      duration: 0.55,
      ease: hubEase,
      delay: 0.12 + i * 0.06,
    },
  }),
};

/** KPI card hover */
export const hubKpiHover = {
  y: -6,
  scale: 1.02,
  transition: hubSpring,
};

/** Spotlight card */
export const hubSpotlightHover = {
  y: -8,
  scale: 1.015,
  transition: hubSpringSoft,
};

/** Grid item filter transition */
export const hubGridItem: Variants = {
  hidden: { opacity: 0, scale: 0.88, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: hubEase,
      delay: i * 0.035,
    },
  }),
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -12,
    transition: { duration: 0.2 },
  },
};

/** Alert list item */
export const hubAlertItem: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: hubEase },
  }),
};

/** Command palette overlay + panel */
export const hubPaletteOverlay: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const hubPalettePanel: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -12, filter: "blur(8px)" },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.28, ease: hubEase },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: -8,
    filter: "blur(4px)",
    transition: { duration: 0.18 },
  },
};

export const hubPaletteItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.025, duration: 0.22, ease: hubEase },
  }),
};

/** Hero subtitle lines */
export const hubHeroLine: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: hubEase, delay: 0.35 + i * 0.1 },
  }),
};

/** Dropdown menu */
export const hubMenuDropdown: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: hubEase },
  },
  exit: { opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.15 } },
};

/** Explorer section highlight ring */
export const hubExplorerHighlight = {
  boxShadow: [
    "0 0 0 0 rgba(99,102,241,0)",
    "0 0 0 4px rgba(99,102,241,0.35)",
    "0 0 0 0 rgba(99,102,241,0)",
  ],
  transition: { duration: 1.8, ease: "easeInOut" },
};
