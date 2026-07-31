"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileCheck2, CreditCard, CalendarClock } from "lucide-react";

const HIGHLIGHTS = [
  { icon: FileCheck2, label: "Online application" },
  { icon: CalendarClock, label: "JSS1 — SS3 · 2025/2026" },
  { icon: CreditCard, label: "Secure Paystack fees" },
];

export default function AdmissionsBanner() {
  return (
    <section className="w-full bg-[var(--bg-primary)] pt-16 md:pt-24 pb-4 md:pb-8 theme-transition">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-[2.5rem] min-h-[440px] flex items-center"
        >
          {/* Background image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=1600&q=80"
            alt="Ykay College students"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Navy gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy-dark via-brand-navy-dark/90 to-brand-navy-dark/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-dark/80 via-transparent to-transparent" />

          {/* Content */}
          <div className="relative z-10 w-full p-9 md:p-14 lg:p-20">
            <div className="max-w-2xl">
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 rounded-full bg-brand-green/20 px-4 py-1.5 font-body text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green ring-1 ring-brand-green/40 backdrop-blur-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> Admissions Open · 2025
                / 2026
              </motion.span>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="mt-5 font-display text-4xl md:text-6xl lg:text-7xl leading-[0.9] tracking-[3px] md:tracking-[5px] text-white"
              >
                BEGIN THE <br />
                <span className="text-brand-green">JOURNEY</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="mt-5 max-w-lg font-body text-sm md:text-base leading-relaxed text-white/75"
              >
                A premium day secondary school in Sango Ota raising role models through rigorous
                academics, leadership and character formation. Apply online and track your
                application in real time.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="mt-7 flex flex-wrap gap-x-6 gap-y-3"
              >
                {HIGHLIGHTS.map((h) => (
                  <div
                    key={h.label}
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/85"
                  >
                    <h.icon size={16} className="text-brand-green" />
                    {h.label}
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="mt-9 flex flex-wrap items-center gap-4"
              >
                <a
                  href="/admissions"
                  className="inline-flex items-center gap-3 rounded-full bg-brand-orange px-8 py-4 font-body text-sm font-bold uppercase tracking-[0.15em] text-white shadow-lg shadow-black/30 transition-all duration-300 hover:scale-[1.04] hover:bg-brand-orange-dark active:scale-[0.97]"
                >
                  Apply Now <ArrowRight size={18} />
                </a>
                <a
                  href="/admissions/status"
                  className="font-body text-sm font-bold uppercase tracking-[0.15em] text-white/80 transition-colors hover:text-white"
                >
                  Check application status →
                </a>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
