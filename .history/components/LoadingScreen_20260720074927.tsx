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
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Rotating ring text */}
          <div className="relative mb-10 md:mb-16">
            <div className="w-[320px] h-[320px] md:w-[420px] md:h-[420px] animate-[rotate-ring_30s_linear_infinite]">
              <svg viewBox="0 0 420 420" width="100%" height="100%" className="overflow-visible">
                <defs>
                  <path
                    id="ring-path"
                    d="M 210 36 A 174 174 0 1 1 209.99 36"
                    fill="none"
                  />
                </defs>
                <text
                  fill="rgba(255,255,255,0.25)"
                  fontSize="15"
                  fontFamily="var(--font-body)"
                  fontWeight="600"
                  letterSpacing="8"
                  textAnchor="start"
                >
                  <textPath href="#ring-path" startOffset="0%">
                    YKAY COLLEGE · EXCELLENCE · YKAY COLLEGE · EXCELLENCE ·
                  </textPath>
                </text>
              </svg>
            </div>
          </div>

          {/* Logo icon — graduation cap icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative z-10 mb-6"
          >
            <svg
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="#CE93D8"
              stroke="#CE93D8"
              strokeWidth="0"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </motion.div>

          {/* EDUCATION EXCELLENCE text */}
          <div className="flex overflow-hidden gap-0.5 md:gap-1">
            {"EDUCATION EXCELLENCE".split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 + i * 0.05 }}
                className="font-display text-white text-[36px] md:text-[64px] tracking-[8px] md:tracking-[14px] leading-none"
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
