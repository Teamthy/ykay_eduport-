"use client";

import Link from "next/link";
import { ArrowRight, Award, Code2, Shield, Sparkles } from "lucide-react";

const TRACKS = [
  {
    title: "Python",
    href: "/it-education/python",
    blurb: "Programming foundations to automation",
    image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Artificial Intelligence",
    href: "/it-education/ai",
    blurb: "Practical AI literacy for students",
    image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Cybersecurity",
    href: "/it-education/cybersecurity",
    blurb: "Defend systems and data",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Microsoft Office",
    href: "/it-education/microsoft-excel",
    blurb: "Word, Excel, PowerPoint pathways",
    image: "https://images.unsplash.com/photo-1543286386-713bdd548da4?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Digital Literacy",
    href: "/it-education/digital-literacy",
    blurb: "Essential computing for every learner",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Excel Expert",
    href: "/it-education/excel-expert",
    blurb: "Advanced analysis and dashboards",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
  },
];

export default function ITFlagshipSection() {
  return (
    <section className="home-section relative overflow-hidden bg-[var(--bg-primary)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-green/10 via-transparent to-brand-orange/5" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/40 bg-brand-green/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
              <Sparkles size={12} /> Flagship programme
            </span>
            <h2 className="mt-4 font-display text-4xl tracking-widest text-[var(--text-primary)] md:text-5xl">
              IT EDUCATION FOR THE <span className="text-brand-green">NEXT GENERATION</span>
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
              Ykay College is not only a secondary school — it is a digital learning brand. Students build
              certification-ready skills in programming, AI, cybersecurity, and Microsoft Office, with a dedicated
              IT portal for progress and credentials.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/it-education"
                className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:bg-brand-green-dark"
              >
                Explore programmes <ArrowRight size={14} />
              </Link>
              <Link
                href="/it-portal/auth"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--text-primary)] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-[var(--bg-primary)] shadow-lg hover:opacity-90"
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
                <div key={item.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 text-center">
                  <item.icon className="mx-auto mb-2 text-brand-green" size={18} />
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {TRACKS.map((track) => (
              <Link
                key={track.href}
                href={track.href}
                className="group relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] min-h-[140px] shadow-sm transition hover:-translate-y-1 hover:border-brand-green/50 hover:shadow-xl"
              >
                <img src={track.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/80 to-brand-navy/30" />
                <div className="relative z-10 flex h-full flex-col justify-end p-4">
                  <div className="font-display text-lg tracking-wide text-white">{track.title}</div>
                  <p className="mt-1 text-xs text-white/80">{track.blurb}</p>
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-brand-green">
                    View track →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
