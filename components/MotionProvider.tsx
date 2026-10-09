"use client";

// MotionProvider — global framer-motion config.
//
// LazyMotion loads only the domAnimation feature bundle (animate, exit,
// whileInView, hover/tap/focus gestures) instead of the full framer-motion
// build. That keeps the animation library out of the critical path as a
// full-size chunk: the public pages hydrate faster, which is what the
// Lighthouse LCP budget measures. Components use the `m` component (instead
// of `motion`) so they render through this bundle.
//
// reducedMotion="user" makes every motion component respect the OS
// reduced-motion setting app-wide.

import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
