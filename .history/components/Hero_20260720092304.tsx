"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative w-full min-h-[95vh] md:min-h-screen bg-[#0D0D0D] overflow-hidden flex items-center">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1920&q=80"
          alt="Students in modern classroom"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D0D] via-[#0D0D0D]/60 to-[#0D0D0D]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-[#0D0D0D]/40" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:py-36 w-full">
        <div className="max-w-4xl">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="font-body text-xs md:text-sm font-bold tracking-[0.25em] uppercase text-[#4EC54D] mb-4 md:mb-6"
          >
            YKAY COLLEGE &amp; LEADERSHIP ACADEMY
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="font-display text-[52px] md:text-[96px] lg:text-[130px] leading-[0.85] tracking-[3px] md:tracking-[6px] text-white mb-6 md:mb-8"
          >
            EXCELLENCE IN
            <br />
            <span className="text-white/90">EDUCATION</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="font-body text-base md:text-xl text-white/50 max-w-xl mb-8 md:mb-10 leading-relaxed"
          >
            A premium day secondary school in Sango Ota, Ogun State — raising role models through rigorous academics, leadership training, and character formation. JSS1 to SS3.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="flex flex-wrap items-center gap-6 md:gap-10 text-white/80 font-body text-sm md:text-base"
          >
            <div>
              <span className="block text-xs uppercase tracking-[0.15em] text-[#4EC54D] font-bold">Location</span>
              <span className="font-medium">Sango Ota, Ogun State</span>
            </div>
            <div className="w-px h-8 bg-white/15 hidden sm:block" />
            <div>
              <span className="block text-xs uppercase tracking-[0.15em] text-[#4EC54D] font-bold">Programmes</span>
              <span className="font-medium">Junior &amp; Senior Secondary</span>
            </div>
            <div className="w-px h-8 bg-white/15 hidden sm:block" />
            <div>
              <span className="block text-xs uppercase tracking-[0.15em] text-[#4EC54D] font-bold">Session</span>
              <span className="font-medium">2025 / 2026</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            className="flex flex-wrap gap-4 mt-10 md:mt-14"
          >
            <a
              href="/admissions"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#FF6E00] text-white font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-[#E65F00] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-black/30"
            >
              Apply for Admission
            </a>
            <a
              href="/portal"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white/10 text-white border border-white/20 font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-white/15 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
            >
              Student Portal
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
