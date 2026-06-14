"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { hubFadeUp, hubFadeUpSoft, hubSlideInRight } from "@/lib/hub-motion";

type VariantKey = "fadeUp" | "fadeUpSoft" | "slideRight";

const VARIANTS = {
  fadeUp: hubFadeUp,
  fadeUpSoft: hubFadeUpSoft,
  slideRight: hubSlideInRight,
};

interface Props {
  children: ReactNode;
  variant?: VariantKey;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function HubSectionReveal({
  children,
  variant = "fadeUp",
  delay = 0,
  style,
}: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div style={style}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px 0px -60px 0px", amount: 0.15 }}
      variants={VARIANTS[variant]}
      transition={{ delay }}
      style={style}
    >
      {children}
    </motion.div>
  );
}
