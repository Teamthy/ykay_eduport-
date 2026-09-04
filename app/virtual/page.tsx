import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import {
  ArrowRight,
  Globe,
  Laptop,
  MessageSquare,
  MonitorSmartphone,
  Sparkles,
  Users,
} from "lucide-react";

const VIRTUAL_URL = process.env.NEXT_PUBLIC_VIRTUAL_URL || "https://virtual.ykaycollege.com";

export const metadata = {
  title: "Ykay Virtual — Learn Online Anywhere | Ykay College",
  description:
    "Ykay Virtual is the online arm of the Ykay family — live online classes, private 1-on-1 tuition, and UTME/WAEC/IELTS preparation you can join from anywhere.",
};

const FEATURES = [
  {
    icon: Laptop,
    title: "Live online classes",
    desc: "Real-time lessons with vetted teachers — ask questions, join discussions and learn with classmates from anywhere in Nigeria.",
  },
  {
    icon: Users,
    title: "Private 1-on-1 tuition",
    desc: "A tutor just for you or your child, with a personalised plan and flexible scheduling.",
  },
  {
    icon: Sparkles,
    title: "UTME · WAEC · IELTS prep",
    desc: "Structured revision, past-question practice and mock exams for the results that matter.",
  },
  {
    icon: MessageSquare,
    title: "Visible progress",
    desc: "Parents and learners see attendance, scores and feedback — the same transparency as the college.",
  },
];

export default function VirtualPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* Hero */}
        <Reveal>
          <section className="relative overflow-hidden border-b border-[var(--border-subtle)]">
            <div aria-hidden className="absolute inset-0 bg-[var(--gradient-banner)] opacity-90" />
            <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28 text-center">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-black/20 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white">
                <Globe size={14} className="text-brand-green" />
                The Ykay Family
              </p>
              <h1 className="mx-auto mb-6 max-w-3xl font-display text-4xl tracking-wide text-white md:text-6xl">
                YKAY <span className="text-brand-green">VIRTUAL</span>
              </h1>
              <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
                The same teachers and standards you trust at Ykay College — now online. Live
                classes, private tutors and exam preparation for learners anywhere in Nigeria, on
                any device.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href={VIRTUAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-green px-8 py-4 text-sm font-bold text-brand-navy shadow-lg transition-all hover:bg-brand-green-dark hover:scale-[1.02]"
                >
                  Continue to YK-Virtual
                  <ArrowRight size={18} />
                </a>
                <span className="text-xs text-white/60">
                  Opens {VIRTUAL_URL.replace(/^https?:\/\//, "")} in a new tab
                </span>
              </div>
            </div>
          </section>
        </Reveal>

        {/* Features */}
        <Reveal>
          <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
            <h2 className="mb-3 text-center font-display text-3xl tracking-wide md:text-4xl">
              What you can do on Ykay Virtual
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-sm leading-relaxed text-[var(--text-muted)] md:text-base">
              YK-Virtual is the home of Ykay Virtual — a full online school built by the same team,
              for learners who study best from home or need extra support.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 transition-all hover:border-[var(--card-border-hover)]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green text-brand-navy">
                    <f.icon size={22} />
                  </div>
                  <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Compare strip */}
        <Reveal>
          <section className="border-t border-[var(--section-divider)] bg-[var(--section-bg-alt)]">
            <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
              <div className="mb-10 text-center">
                <h2 className="mb-3 font-display text-3xl tracking-wide md:text-4xl">
                  Two schools · one family
                </h2>
                <p className="mx-auto max-w-xl text-sm text-[var(--text-muted)] md:text-base">
                  Learn on campus with Ykay College, or online with Ykay Virtual — whichever fits
                  your child.
                </p>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-7">
                  <div className="mb-1 flex items-center gap-2">
                    <MonitorSmartphone size={18} className="text-brand-green" />
                    <h3 className="font-display text-xl tracking-wide">Ykay Virtual</h3>
                  </div>
                  <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Online — learn from anywhere
                  </p>
                  <ul className="space-y-2.5 text-sm text-[var(--text-secondary)]">
                    <li>Live online classes and group cohorts</li>
                    <li>Private 1-on-1 tuition with flexible times</li>
                    <li>UTME, WAEC, IELTS and GMAT/GRE preparation</li>
                    <li>Works on phone, tablet or laptop</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-7">
                  <div className="mb-1 flex items-center gap-2">
                    <Sparkles size={18} className="text-brand-orange" />
                    <h3 className="font-display text-xl tracking-wide">Ykay College</h3>
                  </div>
                  <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Campus — Sango Ota, Ogun State
                  </p>
                  <ul className="space-y-2.5 text-sm text-[var(--text-secondary)]">
                    <li>Full day secondary school experience</li>
                    <li>Science laboratories, sports and clubs</li>
                    <li>IT academy built into the timetable</li>
                    <li>WAEC, NECO and JAMB excellence</li>
                  </ul>
                </div>
              </div>
              <div className="mt-10 text-center">
                <a
                  href={VIRTUAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-8 py-4 text-sm font-bold text-brand-navy shadow-lg transition-all hover:bg-brand-orange-dark hover:scale-[1.02]"
                >
                  Visit {VIRTUAL_URL.replace(/^https?:\/\//, "")}
                  <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </section>
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
