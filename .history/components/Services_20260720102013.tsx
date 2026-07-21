"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const services = [
  {
    title: "Academics",
    subtitle: "JSS1 — SS3 · NERDC Aligned",
    desc: "Rigorous curriculum designed to develop intellectual excellence, critical thinking, and digital literacy across Junior and Senior Secondary levels.",
    href: "/academics",
  },
  {
    title: "Admissions",
    subtitle: "2025 / 2026 Session Open",
    desc: "Apply online for JSS1 through SS3. Multi-step application with document upload, application fee, and real-time status tracking.",
    href: "/admissions",
  },
  {
    title: "Campus Life",
    subtitle: "Clubs · Sports · Leadership",
    desc: "Beyond the classroom — discover clubs, sports, leadership training, virtual classrooms, and a vibrant student community.",
    href: "/campus-life",
  },
  {
    title: "Portal Login",
    subtitle: "Admin · Teacher · Student · Parent",
    desc: "Access the EduPortal for grades, attendance, assignments, fee payments, exam schedules, and real-time school communication.",
    href: "/portal",
  },
  {
    title: "Student Wellbeing",
    subtitle: "Health · Safety · Counselling",
    desc: "Comprehensive health records, anonymous wellbeing check-ins, anti-bullying reporting, and confidential counselor messaging.",
    href: "/contact",
  },
];

export default function Services() {
  return (
    <section
      id="academics"
      className="w-full bg-[var(--bg-primary)] pt-16 md:pt-24 pb-12 md:pb-20 theme-transition"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12 md:mb-16">
          <div>
            <span className="font-body text-[10px] font-bold tracking-[0.25em] uppercase text-[var(--accent-primary)] mb-3 block">
              PROGRAMMES &amp; SERVICES
            </span>
            <h2 className="font-display text-[32px] md:text-[48px] leading-[0.9] tracking-[2px] md:tracking-[4px] text-[var(--text-primary)]">
              WHAT WE OFFER
            </h2>
          </div>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 font-body text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors underline underline-offset-4 decoration-[var(--border-default)] hover:decoration-[var(--accent-primary)] self-start md:self-auto"
          >
            Get In Touch <ArrowRight size={14} />
          </a>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {services.map((service, i) => (
            <motion.a
              key={service.title}
              href={service.href}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 md:p-10 shadow-[var(--card-shadow)] hover:border-[var(--accent-primary)] hover:shadow-[var(--card-shadow-hover)] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative z-10">
                <h3 className="font-display text-2xl md:text-3xl tracking-[2px] text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent-primary)] transition-colors">
                  {service.title}
                </h3>
                <p className="font-body text-xs font-bold tracking-[0.15em] uppercase text-[var(--accent-primary)] mb-6">
                  {service.subtitle}
                </p>
                <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                  {service.desc}
                </p>
                <span className="inline-flex items-center gap-2 font-body text-xs font-bold tracking-[0.15em] uppercase text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                  Learn More{" "}
                  <ArrowRight
                    size={12}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </span>
              </div>
              {/* Decorative green glow on hover */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-brand-green/20 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}