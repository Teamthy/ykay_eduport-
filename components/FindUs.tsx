"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MapPin, ArrowRight, Play } from "lucide-react";

import { AnimatedText } from "@/components/AnimatedText";
export default function FindUs() {
  return (
    <section id="find-us" className="w-full bg-[var(--bg-primary)] py-16 md:py-24 theme-transition">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Find Us */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-body text-[10px] font-bold tracking-[0.25em] uppercase text-brand-green mb-4 block">
              FIND US
            </span>
            <h2 className="font-display text-[clamp(2.25rem,6.5vw,5.5rem)] leading-[0.86] tracking-[-0.015em] text-[var(--text-primary)] mb-8">
              <AnimatedText heavy stagger={0.03} text="YKAY" delay={0.0} className="block" />
              <span className="block text-brand-green">
                <AnimatedText heavy stagger={0.03} text="COLLEGE" delay={0.1} />
              </span>
            </h2>

            {/* Map */}
            <div className="rounded-3xl overflow-hidden border border-[var(--border-subtle)] mb-6 aspect-[4/3] shadow-lg">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3963.5!2d3.1!3d6.75!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sSango%20Ota%2C%20Ogun%20State!5e0!3m2!1sen!2sng!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              />
            </div>

            {/* Address Card */}
            <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                  <MapPin size={22} />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-brand-green font-bold mb-1">
                    Our Campus Address
                  </div>
                  <div className="text-[var(--text-primary)] font-medium leading-relaxed">
                    Km 38, Lagos-Abeokuta Expressway,
                    <br />
                    Sango Ota, Ogun State
                  </div>
                  <a
                    href="https://maps.google.com/?q=Sango+Ota+Ogun+State"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-sm text-brand-green font-bold hover:underline"
                  >
                    Get Directions <ArrowRight size={12} />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Latest News */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <span className="font-body text-[10px] font-bold tracking-[0.25em] uppercase text-brand-green mb-4 block">
              FEATURED NEWS
            </span>
            <h2 className="font-display text-[clamp(2.25rem,6.5vw,5.5rem)] leading-[0.86] tracking-[-0.015em] text-[var(--text-primary)] mb-8">
              <AnimatedText heavy stagger={0.03} text="LATEST FROM" delay={0.0} className="block" />
              <span className="block text-brand-green">
                <AnimatedText heavy stagger={0.03} text="THE SCHOOL" delay={0.275} />
              </span>
            </h2>

            {/* Featured News Card */}
            <Link href="/news-events" className="block group">
              <div className="relative rounded-3xl overflow-hidden aspect-[16/10] mb-4 shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80"
                  alt="School event"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-green transition-all">
                    <Play size={24} className="text-white ml-1" fill="white" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)] group-hover:border-brand-green transition-all">
                <div className="text-[10px] uppercase tracking-widest text-[var(--text-accent)] font-bold mb-2">
                  Admissions News · March 15, 2025
                </div>
                <h3 className="font-display text-[clamp(1.5rem,2.4vw,2.25rem)] leading-[0.95] tracking-[-0.01em] text-[var(--text-primary)] mb-3 group-hover:text-[var(--text-accent)] transition-colors">
                  Ykay College Opens 2025 / 2026 Admissions
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                  Applications are now open for JSS1 through SS3. Apply online and track your
                  application status in real time.
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-accent)] group-hover:gap-3 transition-all">
                  Read More <ArrowRight size={14} />
                </span>
              </div>
            </Link>

            <Link
              href="/news-events"
              className="inline-flex items-center gap-2 mt-6 text-sm text-[var(--text-primary)] hover:text-brand-green transition-colors font-bold uppercase tracking-widest"
            >
              View All News <ArrowRight size={14} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
