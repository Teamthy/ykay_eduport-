"use client";

// MotionProvider — global framer-motion config. reducedMotion="user" makes
// every motion component respect the OS reduced-motion setting app-wide.

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
