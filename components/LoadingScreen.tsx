"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          style={{ backgroundColor: "#050C14" }}
        >
          {/* Container to center ring + logo + text vertically */}
          <div className="flex flex-col items-center justify-center gap-16">
            {/* Ring + Logo (perfectly centered) */}
            <div className="relative w-[320px] h-[320px] md:w-[420px] md:h-[420px] flex items-center justify-center">
              {/* Rotating ring text */}
              <div className="absolute inset-0 animate-[rotate-ring_30s_linear_infinite]">
                <svg viewBox="0 0 420 420" width="100%" height="100%" className="overflow-visible">
                  <defs>
                    <path
                      id="ring-path"
                      d="M 210 36 A 174 174 0 1 1 209.99 36"
                      fill="none"
                    />
                  </defs>
                  <text
                    fill="#4EC54D"
                    fillOpacity="0.6"
                    fontSize="15"
                    fontFamily="var(--font-body), sans-serif"
                    fontWeight="700"
                    letterSpacing="8"
                  >
                    <textPath href="#ring-path" startOffset="0%">
                      YKAY COLLEGE · EXCELLENCE · LEADERSHIP · YKAY COLLEGE ·
                    </textPath>
                  </text>
                </svg>
              </div>

              {/* Logo in center */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 100 }}
                className="relative z-10 bg-white rounded-3xl p-6 shadow-2xl"
              >
                <Image
                  src="/ykay-logo.png"
                  alt="Ykay College Logo"
                  width={140}
                  height={140}
                  className="w-24 h-24 md:w-32 md:h-32 object-contain"
                  priority
                />
              </motion.div>
            </div>

            {/* Reveal text (properly aligned below) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="text-center"
            >
              <div className="font-display text-2xl md:text-3xl tracking-[6px] text-white mb-3">
                EXCELLENCE IN EDUCATION
              </div>
              <div className="font-body text-[11px] tracking-[4px] text-brand-green font-bold">
                LEADERSHIP · CHARACTER · KNOWLEDGE
              </div>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="w-48 h-1 rounded-full bg-white/10 overflow-hidden"
            >
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, delay: 1.5, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-brand-green to-brand-orange"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
