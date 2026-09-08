"use client";

import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { Marquee } from "@/components/AnimatedText";

/**
 * College home hero â€” full-bleed navy band, prebuiltui-style copy on the left,
 * Ykay student identity photograph on the right.
 */
export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-brand-navy-dark">
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/home/green-ribs.jpg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-[0.14]"
        />
        <img
          src="/home/hero-campus.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-navy-dark via-brand-navy-dark/92 to-brand-navy-dark/70" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-none items-center gap-10 px-6 pb-10 pt-28 sm:px-8 md:grid-cols-2 md:px-12 md:pb-14 md:pt-32 lg:px-16">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 font-body text-[11px] font-semibold text-white/90 backdrop-blur-sm"
          >
            <span className="h-2 w-2 rounded-full bg-brand-orange" />
            Raising Role Models Â· Est. 2021
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mt-7 font-display text-[clamp(2.4rem,6.5vw,5.2rem)] leading-[0.92] tracking-[-0.02em] text-white"
          >
            Excellence in Education.
            <span className="mt-1 block text-brand-green">Leadership. Character.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-5 max-w-xl font-body text-base leading-relaxed text-white/80 md:text-lg"
          >
            A premium day secondary school in Sango Ota, Ogun State â€” JSS1 to SS3 with science
            laboratories, sports, clubs and a full IT academy built into the timetable.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <a
              href="/admissions"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 font-body text-sm font-bold uppercase tracking-[0.12em] text-brand-navy shadow-lg shadow-black/30 transition hover:scale-[1.03] hover:bg-white/90"
            >
              Apply Now
            </a>
            <a
              href="/portal"
              className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/10 px-8 py-3.5 font-body text-sm font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              Student Portal
            </a>
            <a
              href="/download"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-8 py-3.5 font-body text-sm font-bold uppercase tracking-[0.12em] text-brand-navy shadow-lg transition hover:scale-[1.03] hover:bg-brand-orange-dark"
            >
              <Download size={16} /> Get the app
            </a>
          </motion.div>

          <p className="mt-7 font-body text-sm text-white/70">
            WAEC Â· NECO Â· JAMB Â· NERDC curriculum
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <div
            aria-hidden="true"
            className="absolute -inset-3 rounded-[2rem] border border-brand-green/30"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/home/ykay-students.png"
            alt="Ykay College students in school uniform"
            className="relative aspect-[4/3] w-full rounded-[1.75rem] object-cover object-[center_20%] shadow-2xl"
          />
        </motion.div>
      </div>

      <div className="relative z-10 border-t border-dashed border-white/20">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-7 font-body text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
          <span>NERDC</span>
          <span>STEM</span>
          <span>IT Academy</span>
          <span>Leadership</span>
          <span>Character</span>
        </div>
      </div>

      <Marquee
        items={["ADMISSIONS OPEN", "WAEC", "NECO", "JAMB", "IT ACADEMY"]}
        className="relative z-10 border-t border-white/15 bg-brand-navy-dark/80 py-3 backdrop-blur-sm"
        itemClassName="font-body text-[10px] sm:text-xs md:text-sm font-bold tracking-[0.25em] uppercase text-brand-green"
      />
    </section>
  );
}
