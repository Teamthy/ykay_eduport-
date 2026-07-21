"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function About() {
  return (
    <section id="about" className="w-full bg-[var(--bg-primary)] pt-16 md:pt-24 pb-8 md:pb-12 theme-transition">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Text Column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="font-body text-[10px] font-bold tracking-[0.25em] uppercase text-[var(--accent-primary)] mb-4 block">
              ABOUT US
            </span>
            <h2 className="font-display text-[32px] md:text-[48px] lg:text-[56px] leading-[0.95] tracking-[2px] md:tracking-[4px] text-[var(--text-primary)] mb-8">
              RAISING LEADERS THROUGH EXCELLENCE IN EDUCATION
            </h2>
            <p className="font-body text-base md:text-lg text-[var(--text-secondary)] leading-relaxed mb-4">
              Ykay College &amp; Leadership Academy is a premium day secondary school located in Sango Ota, Ogun State. Established in 2012, the school provides a rigorous NERDC-aligned curriculum for students in JSS1 through SS3, enhanced with digital literacy, STEM education, and leadership formation.
            </p>
            <p className="font-body text-sm md:text-base text-[var(--text-secondary)] leading-relaxed mb-6">
              Our approach combines academic rigor with character development and future-ready skills. Under the leadership of Mr. Adeyinka Oladimeji, MSc, we prepare students not just for exams but for life — as thinkers, innovators, and ethical leaders.
            </p>
            <div className="flex flex-wrap gap-3">
              {["NERDC Aligned", "JSS1 — SS3", "Day School", "Digital Learning", "Leadership Training", "WAEC / BECE Ready"].map(tag => (
                <span key={tag} className="px-3 py-1.5 rounded-full bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--text-secondary)]">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Director Photo Column — CLEAN, NO BOOKS */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            {/* Single director photo with accent */}
            <div className="relative group max-w-md mx-auto">
              {/* Green offset accent behind image */}
              <div className="absolute inset-0 bg-brand-green rounded-[2.5rem] rotate-3 group-hover:rotate-0 transition-transform duration-500" />

              {/* Director photo */}
              <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-[var(--surface-card)]">
                <Image
                  src="/director-adeyinka.jpg"
                  alt="Mr. Adeyinka Oladimeji, MSc — Director"
                  width={600}
                  height={800}
                  className="w-full h-auto object-cover"
                  priority
                />
              </div>
            </div>

            {/* Director Card */}
            <Link href="/director" className="block mt-8 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-[var(--card-shadow)] hover:border-brand-green hover:shadow-[var(--card-shadow-hover)] transition-all group">
              <h3 className="font-display text-xl tracking-[2px] text-[var(--text-primary)] mb-2 group-hover:text-brand-green transition-colors">
                Mr. Adeyinka Oladimeji, MSc
              </h3>
              <p className="font-body text-xs text-[var(--accent-primary)] font-bold tracking-[0.2em] uppercase mb-3">
                Director & Proprietor
              </p>
              <blockquote className="font-body text-sm text-[var(--text-secondary)] leading-relaxed italic border-l-2 border-[var(--accent-primary)] pl-4 mb-4">
                &ldquo;Our mission is not just to teach — it is to build leaders who will transform their communities, their nation, and the world.&rdquo;
              </blockquote>
              <span className="inline-flex items-center gap-2 text-xs font-bold text-brand-green group-hover:gap-3 transition-all">
                Read Director&apos;s Message <ArrowRight size={12} />
              </span>
            </Link>
          </motion.div>
        </div>

        {/* Vision / Mission / Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-16 md:mt-24 grid md:grid-cols-3 gap-6"
        >
          {[
            { title: "Our Vision", body: "To be the leading secondary school in Ogun State, recognized for academic excellence, digital innovation, and the development of ethical, future-ready leaders." },
            { title: "Our Mission", body: "To provide rigorous, technology-enhanced education that develops the intellectual, moral, and leadership capacity of every student — preparing them for success in higher education, professional life, and citizenship." },
            { title: "Core Values", body: "Excellence in all things. Integrity without compromise. Leadership through service. Innovation through digital literacy. Community through collaboration." },
          ].map(card => (
            <div key={card.title} className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 md:p-10 shadow-[var(--card-shadow)] hover:border-brand-green hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-1 transition-all duration-300">
              <h3 className="font-display text-xl md:text-2xl tracking-[2px] text-[var(--text-primary)] mb-4">{card.title}</h3>
              <p className="font-body text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">{card.body}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
