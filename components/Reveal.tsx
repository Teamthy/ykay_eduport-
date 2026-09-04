"use client";

// Reveal — energetic scroll-reveal for marketing sections.
// Spring physics give a lively little pop as each section lands; honours the
// user's reduced-motion preference (renders immediately, no transform).
// `delay` is in milliseconds.

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  y = 36,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 120, damping: 14, mass: 0.9, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}
