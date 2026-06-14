import type { Variants } from "framer-motion";
import { hubEase, hubSpring, hubStaggerContainer, hubFadeUp } from "@/lib/hub-motion";

export { hubEase, hubSpring, hubStaggerContainer, hubFadeUp };

export const oppHeroGlow = {
  animate: {
    opacity: [0.35, 0.65, 0.35],
    scale: [1, 1.08, 1],
  },
  transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const },
};

export const oppKpiHover = {
  y: -8,
  scale: 1.025,
  transition: hubSpring,
};

export const oppHotPulse: Variants = {
  idle: { boxShadow: "0 0 0px rgba(139,92,246,0)" },
  hot: {
    boxShadow: [
      "0 0 0px rgba(139,92,246,0)",
      "0 0 22px rgba(139,92,246,0.45)",
      "0 0 0px rgba(139,92,246,0)",
    ],
    transition: { duration: 2.4, repeat: Infinity },
  },
};

export const oppCardEnter: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.04, duration: 0.35, ease: hubEase },
  }),
};

export const oppTickerItem: Variants = {
  hidden: { opacity: 0, x: 24, height: 0 },
  show: {
    opacity: 1,
    x: 0,
    height: "auto",
    transition: { duration: 0.4, ease: hubEase },
  },
  exit: { opacity: 0, x: -16, height: 0, transition: { duration: 0.25 } },
};
