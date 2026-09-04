"use client";

import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { HeroCanvas } from "@/components/three/HeroCanvas";

export default function Hero() {
  return (
    <section className="relative w-full min-h-[88vh] md:min-h-[92vh] bg-brand-navy-dark overflow-hidden flex items-center">
      {/* 3D knowledge constellation (gated, decorative) */}
      <HeroCanvas className="absolute inset-0 z-[1] overflow-hidden" />

      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1920&q=80"
          alt="Students in modern classroom"
          className="w-full h-full object-cover opacity-45"
        />
        {/* Left-to-right darkening for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-navy-dark via-brand-navy-dark/80 to-brand-navy-dark/30" />
        {/* Top-to-bottom vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-dark via-transparent to-brand-navy-dark/40" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:py-36 w-full">
        <div className="max-w-4xl">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="font-body text-xs md:text-sm font-bold tracking-[0.25em] uppercase text-brand-green mb-4 md:mb-6"
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
            <span className="text-white">EDUCATION</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="font-body text-base md:text-xl text-white max-w-xl mb-8 md:mb-10 leading-relaxed drop-shadow"
          >
            A premium day secondary school in Sango Ota, Ogun State — raising role models through
            rigorous academics, leadership training, and character formation. JSS1 to SS3.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="flex flex-wrap items-center gap-6 md:gap-10 text-white font-body text-sm md:text-base"
          >
            <div>
              <span className="block text-xs uppercase tracking-[0.15em] text-brand-green font-bold mb-1">
                Location
              </span>
              <span className="font-medium text-white/95">Sango Ota, Ogun State</span>
            </div>
            <div className="w-px h-10 bg-white/20 hidden sm:block" />
            <div>
              <span className="block text-xs uppercase tracking-[0.15em] text-brand-green font-bold mb-1">
                Programmes
              </span>
              <span className="font-medium text-white/95">Junior &amp; Senior Secondary</span>
            </div>
            <div className="w-px h-10 bg-white/20 hidden sm:block" />
            <div>
              <span className="block text-xs uppercase tracking-[0.15em] text-brand-green font-bold mb-1">
                Session
              </span>
              <span className="font-medium text-white/95">2025 / 2026</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            className="flex flex-wrap gap-4 mt-10 md:mt-14"
          >
            {/* /download, not the raw .apk: it explains Android's "unknown
                source" warning and still works before the URL is configured. */}
            <a
              href="/download"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-brand-orange text-brand-navy font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-brand-orange-dark transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-black/30"
            >
              <Download size={18} /> Download Mobile App
            </a>
            <a
              href="/portal"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white/15 border border-white/30 text-white border border-white/25 font-body text-sm font-bold tracking-[0.15em] uppercase hover:bg-white/20 hover:border-white/40 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] backdrop-blur-sm"
            >
              Student Portal
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
