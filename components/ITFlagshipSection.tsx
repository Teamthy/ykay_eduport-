"use client";

import Link from "next/link";
import { ArrowRight, Award, Code2, Shield, Sparkles } from "lucide-react";

const TRACKS = [
  { title: "Python", href: "/it-education/python", blurb: "Programming foundations to automation" },
  { title: "Artificial Intelligence", href: "/it-education/ai", blurb: "Practical AI literacy for students" },
  { title: "Cybersecurity", href: "/it-education/cybersecurity", blurb: "Defend systems and data" },
  { title: "Microsoft Office", href: "/it-education/microsoft-excel", blurb: "Word, Excel, PowerPoint pathways" },
  { title: "Digital Literacy", href: "/it-education/digital-literacy", blurb: "Essential computing for every learner" },
  { title: "Excel Expert", href: "/it-education/excel-expert", blurb: "Advanced analysis and dashboards" },
];

export default function ITFlagshipSection() {
  return (
    <section className="section-padding relative overflow-hidden bg-[var(--bg-primary)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-green/5 via-transparent to-brand-orange/5" />
      <div className="container-content relative">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
              <Sparkles size={12} /> Flagship programme
            </span>
            <h2 className="mt-4 font-display text-4xl tracking-widest text-[var(--text-primary)] md:text-5xl">
              IT EDUCATION FOR THE{" "}
              <span className="text-brand-green">NEXT GENERATION</span>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
              Ykay College is not only a secondary school — it is a digital learning brand. Students build certification-ready
              skills in programming, AI, cybersecurity, and Microsoft Office, with a dedicated IT portal for progress and
              credentials.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/it-education"
                className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg transition hover:bg-brand-green-dark"
              >
                Explore IT programmes <ArrowRight size={14} />
              </Link>
              <Link
                href="/it-portal/auth"
                className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--text-primary)] px-6 py-3 text-xs font-bold uppercase tracking-widest text-[var(--text-primary)] transition hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)]"
              >
                Open IT portal
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { icon: Code2, label: "Coding & AI" },
                { icon: Shield, label: "Cybersecurity" },
                { icon: Award, label: "Certificates" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 text-center"
                >
                  <item.icon className="mx-auto mb-2 text-brand-green" size={18} />
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {TRACKS.map((track) => (
              <Link
                key={track.href}
                href={track.href}
                className="group rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-sm transition hover:-translate-y-1 hover:border-brand-green/40 hover:shadow-lg"
              >
                <div className="font-display text-lg tracking-wide text-[var(--text-primary)] group-hover:text-brand-green">
                  {track.title}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{track.blurb}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
                  View track <ArrowRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
