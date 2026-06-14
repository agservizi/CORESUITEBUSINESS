export const ticketKpiHover = { y: -6, scale: 1.02, transition: { type: "spring" as const, stiffness: 420, damping: 32 } };

export const ticketTickerItem = {
  hidden: { opacity: 0, x: -12, height: 0 },
  show: { opacity: 1, x: 0, height: "auto", transition: { duration: 0.35 } },
  exit: { opacity: 0, x: 12, height: 0, transition: { duration: 0.2 } },
};

export const ticketHeroGlow = {
  animate: { scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] },
  transition: { duration: 6, repeat: Infinity, ease: "easeInOut" as const },
};
