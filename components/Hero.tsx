"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Download } from "lucide-react";
import { AnimatedText, WordCycle, Marquee } from "@/components/AnimatedText";

/**
 * Editorial hero.
 *
 * The headline is the layout: two lines of Anton set edge-to-edge with
 * `clamp()` so the type always touches both gutters, whatever the screen.
 * Line 1 is fixed ("EXCELLENCE IN"), line 2 cycles through the four words.
 * Under it sits a hairline rule and a meta row of small labelled columns,
 * then the CTAs and the marquee band.
 */
export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 110]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.12]);

  return (
    <section
      ref={sectionRef}
      className="relative flex w-full flex-col overflow-hidden bg-brand-navy-dark pt-24 pb-14 sm:pt-28 md:min-h-screen md:justify-center md:pt-32 md:pb-20"
    >
      {/* Background photograph, dimmed so the type stays dominant */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1920&q=80"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy-dark/85 via-brand-navy-dark/70 to-brand-navy-dark" />
      </div>

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 w-full px-4 sm:px-6 lg:px-8"
      >
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 110, damping: 15, delay: 0.1 }}
          className="mb-3 font-body text-[10px] font-bold uppercase tracking-[0.25em] text-brand-green sm:text-xs md:mb-5"
        >
          Ykay College &amp; Leadership Academy
        </motion.p>

        {/* The headline IS the layout: both lines are sized to span the full
            width, so the type always touches both gutters. Sizes come from
            Anton's cap advance width rather than a fixed vw, because the
            cycling words have different letter counts. */}
        <h1 className="font-display leading-[0.78] tracking-[-0.02em] text-white [container-type:inline-size] [--cap:30vh] md:[--cap:34vh]">
          <AnimatedText
            text="EXCELLENCE IN"
            className="block whitespace-nowrap text-[min(18.55cqw,var(--cap))]"
            animateOnLoad
            heavy
            delay={0.12}
            stagger={0.034}
          />
          <span className="mt-0.5 block text-brand-green sm:mt-1">
            <WordCycle
              words={["EDUCATION", "EXCELLENCE", "LEADERSHIP", "CHARACTER"]}
              heavy
              fitWords
              fitBasis={95.3}
              tracking={-0.02}
              fitMax="var(--cap)"
            />
          </span>
        </h1>

        {/* Hairline rule, straight off the reference layout */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 h-px w-full origin-left bg-white/25 sm:mt-7"
        />

        {/* Meta row: small caps labels over short values */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-5 grid grid-cols-2 gap-x-6 gap-y-6 sm:mt-7 md:grid-cols-4 md:gap-x-8"
        >
          <div>
            <p className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
              School
            </p>
            <p className="mt-1.5 font-body text-xs leading-relaxed text-white/85 sm:text-sm">
              Premium day secondary school, JSS1 to SS3.
            </p>
          </div>
          <div>
            <p className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
              Why
            </p>
            <p className="mt-1.5 font-body text-xs leading-relaxed text-white/85 sm:text-sm">
              Rigorous academics, leadership training and character formation.
            </p>
          </div>
          <div>
            <p className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
              Location
            </p>
            <p className="mt-1.5 font-body text-xs leading-relaxed text-white/85 sm:text-sm">
              Sango Ota, Ogun State
            </p>
          </div>
          <div>
            <p className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
              Session
            </p>
            <p className="mt-1.5 font-body text-xs leading-relaxed text-white/85 sm:text-sm">
              2025 / 2026
            </p>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.05 }}
          className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 md:mt-9"
        >
          {/* /download, not the raw .apk: it explains Android's "unknown
              source" warning and still works before the URL is configured. */}
          <a
            href="/download"
            className="inline-flex items-center justify-center gap-3 rounded-full bg-brand-orange px-6 py-3.5 font-body text-xs font-bold uppercase tracking-[0.15em] text-brand-navy shadow-lg shadow-black/30 transition-all duration-300 hover:scale-[1.03] hover:bg-brand-orange-dark active:scale-[0.97] sm:px-8 sm:py-4 sm:text-sm"
          >
            <Download size={18} /> Download Mobile App
          </a>
          <a
            href="/portal"
            className="inline-flex items-center justify-center gap-3 rounded-full border border-white/30 bg-white/15 px-6 py-3.5 font-body text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:border-white/40 hover:bg-white/20 active:scale-[0.97] sm:px-8 sm:py-4 sm:text-sm"
          >
            Student Portal
          </a>
        </motion.div>
      </motion.div>

      <Marquee
        items={["ADMISSIONS OPEN", "WAEC", "NECO", "JAMB", "IT ACADEMY"]}
        className="relative z-10 mt-10 border-y border-white/15 bg-brand-navy-dark/70 py-3 backdrop-blur-sm md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:border-b-0"
        itemClassName="font-body text-[10px] sm:text-xs md:text-sm font-bold tracking-[0.25em] uppercase text-brand-green"
      />
    </section>
  );
}
