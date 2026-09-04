"use client";

import { Clock, MapPin } from "lucide-react";

import { AnimatedText } from "@/components/AnimatedText";
export default function ServiceInfo() {
  return (
    <section className="relative mx-4 max-w-5xl px-6 pt-16 md:mx-auto md:px-10 md:pt-24">
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[2rem] p-8 md:p-10 shadow-[var(--card-shadow-hover)] backdrop-blur-md theme-transition">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex-1">
            <h2 className="font-display text-[clamp(1.5rem,2.4vw,2.25rem)] leading-[0.95] tracking-[-0.01em] text-[var(--text-primary)] mb-1">
              <AnimatedText heavy stagger={0.03} text="School Hours & Location" delay={0.0} />
            </h2>
            <p className="font-body text-sm text-[var(--text-muted)]">
              Ykay College &amp; Leadership Academy — Sango Ota, Ogun State
            </p>
          </div>

          <div className="flex flex-wrap gap-6 md:gap-10 w-full md:w-auto">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
                <Clock size={18} className="text-[var(--accent-primary)]" />
              </div>
              <div>
                <p className="font-body text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--accent-primary)] mb-1">
                  School Days
                </p>
                <p className="font-body text-sm font-medium text-[var(--text-primary)]">
                  Monday — Friday
                </p>
                <p className="font-body text-sm text-[var(--text-secondary)]">7:30 AM — 2:30 PM</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
                <MapPin size={18} className="text-[var(--accent-primary)]" />
              </div>
              <div>
                <p className="font-body text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--accent-primary)] mb-1">
                  Location
                </p>
                <a
                  href="https://www.google.com/maps/search/Km+38,+Lagos-Abeokuta+Expressway,+Sango+Ota"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-sm text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors underline underline-offset-4 decoration-[var(--border-default)] hover:decoration-[var(--accent-primary)]"
                >
                  Km 38, Lagos-Abeokuta Expressway, Sango Ota
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
