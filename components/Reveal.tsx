"use client";

// Reveal — energetic scroll-reveal for marketing sections.
// Spring physics give a lively little pop as each section lands; honours the
// user's reduced-motion preference (renders immediately, no transform).
// `delay` is in milliseconds.

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const VARIANTS = {
  up: { initial: { opacity: 0, y: 36 }, target: { opacity: 1, y: 0 } },
  left: { initial: { opacity: 0, x: -48 }, target: { opacity: 1, x: 0 } },
  right: { initial: { opacity: 0, x: 48 }, target: { opacity: 1, x: 0 } },
  zoom: { initial: { opacity: 0, scale: 0.88 }, target: { opacity: 1, scale: 1 } },
  blur: {
    initial: { opacity: 0, y: 24, filter: "blur(10px)" },
    target: { opacity: 1, y: 0, filter: "blur(0px)" },
  },
} as const;

export function Reveal({
  children,
  delay = 0,
  variant = "up",
  className,
}: {
  children: ReactNode;
  delay?: number;
  /** Motion personality — vary per section so the page never feels uniform. */
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  const v = VARIANTS[variant];
  return (
    <motion.div
      className={className}
      initial={v.initial}
      whileInView={v.target}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 120, damping: 16, mass: 0.9, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}
