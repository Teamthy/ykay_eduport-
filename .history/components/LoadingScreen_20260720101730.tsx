"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] bg-[var(--loading-bg)] flex flex-col items-center justify-center overflow-hidden theme-transition"
        >
          {/* Rotating ring text */}
          <div className="relative mb-10 md:mb-16">
            <div className="w-[320px] h-[320px] md:w-[420px] md:h-[420px] animate-[rotate-ring_30s_linear_infinite]">
              <svg
                viewBox="0 0 420 420"
                width="100%"
                height="100%"
                className="overflow-visible"
              >
                <defs>
                  <path
                    id="ring-path"
                    d="M 210 36 A 174 174 0 1 1 209.99 36"
                    fill="none"
                  />
                </defs>
                <text
                  fill="var(--loading-ring)"
                  fillOpacity="0.35"
                  fontSize="15"
                  fontFamily="var(--font-body)"
                  fontWeight="600"
                  letterSpacing="8"
                  textAnchor="start"
                >
                  <textPath href="#ring-path" startOffset="0%">
                    YKAY COLLEGE · EXCELLENCE · LEADERSHIP · YKAY COLLEGE ·
                  </textPath>
                </text>
              </svg>
            </div>
          </div>

          {/* Logo icon — pen nib in Ykay green */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative z-10 mb-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[70%]"
          >
            <svg
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="var(--loading-icon)"
              stroke="var(--loading-icon)"
              strokeWidth="0"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {/* Graduation cap for now — swap to pen nib SVG when ready */}
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </motion.div>

          {/* Reveal text */}
          <div className="flex overflow-hidden gap-0.5 md:gap-1 mt-2">
            {"EXCELLENCE IN EDUCATION".split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 + i * 0.04 }}
                className="font-display text-[var(--loading-reveal-text)] text-[28px] md:text-[52px] tracking-[6px] md:tracking-[12px] leading-none"
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}