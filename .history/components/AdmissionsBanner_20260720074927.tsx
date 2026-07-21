"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function AdmissionsBanner() {
  return (
    <section className="w-full bg-white pt-24 md:pt-32 pb-4 md:pb-8">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#4A148C] via-[#7B1FA2] to-[#C2185B] p-10 md:p-16 lg:p-20"
        >
          {/* Decorative circles */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-2xl">
              <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-white/15 text-white/90 font-body text-[10px] font-bold tracking-[0.2em] uppercase backdrop-blur-sm">
                2025 / 2026 Session — Now Open
              </span>
              <h2 className="font-display text-[36px] md:text-[56px] lg:text-[72px] leading-[0.9] tracking-[4px] md:tracking-[6px] text-white mb-4">
                ADMISSIONS<br />OPEN
              </h2>
              <div className="flex flex-wrap gap-6 text-white/80 font-body text-sm md:text-base">
                <span>JSS1 — SS3</span>
                <span className="hidden md:inline text-white/30">|</span>
                <span>Day Secondary School</span>
                <span className="hidden md:inline text-white/30">|</span>
                <span>Sango Ota, Ogun State</span>
              </div>
            </div>
            <a
              href="/admissions"
              className="inline-flex items-center gap-3 self-start lg:self-end px-8 py-4 rounded-full bg-white text-[#C2185B] font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-white/90 transition-all duration-300 hover:scale-[1.05] active:scale-[0.97] shadow-lg shadow-black/20"
            >
              Apply Now <ArrowRight size={18} />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
