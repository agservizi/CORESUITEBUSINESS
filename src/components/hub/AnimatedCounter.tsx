"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";

interface Props {
  value: number;
  format?: "number" | "currency";
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

function formatDisplay(n: number, format: "number" | "currency") {
  if (format === "currency") {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  }
  return String(Math.round(n));
}

export default function AnimatedCounter({ value, format = "number", style }: Props) {
  const reduce = useReducedMotion();
  const spring = useSpring(0, { stiffness: 90, damping: 22 });
  const display = useTransform(spring, (v) => formatDisplay(v, format));
  const [text, setText] = useState(formatDisplay(0, format));
  const prev = useRef(0);

  useEffect(() => {
    if (reduce) {
      setText(formatDisplay(value, format));
      return;
    }
    spring.set(value);
    prev.current = value;
  }, [value, format, reduce, spring]);

  useEffect(() => {
    if (reduce) return;
    const unsub = display.on("change", (v) => setText(v));
    return () => unsub();
  }, [display, reduce]);

  if (reduce) {
    return <span style={style}>{formatDisplay(value, format)}</span>;
  }

  return (
    <motion.span
      style={style}
      key={value}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.06, 1] }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {text}
    </motion.span>
  );
}
