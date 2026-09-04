import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { AnimatedText } from "@/components/AnimatedText";
import { ArrowRight, Globe, Laptop, MapPin, Sparkles, Users } from "lucide-react";

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
    icon: Globe,
    title: "Visible progress",
    desc: "Parents and learners see attendance, scores and feedback — the same transparency as the college.",
  },
];

/**
 * The gateway between the two Ykay schools.
 *
 * A full-viewport split screen: college on one side, virtual on the other.
 * CSS-only hover expansion (no JS) — hovering a side grows it so choosing
 * feels physical. On mobile the two halves stack. Below the split: what
 * Ykay Virtual offers, then the side-by-side comparison.
 */
export default function VirtualPage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* ── The split gateway ── */}
        <section className="flex min-h-[calc(100vh-5rem)] w-full flex-col md:flex-row">
          {/* College half — you are already here */}
          <div className="group relative flex min-h-[42vh] flex-1 flex-col justify-between overflow-hidden bg-brand-navy-dark p-8 transition-[flex-grow] duration-500 md:p-12 md:hover:flex-[1.35]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-brand-green/10 blur-3xl"
            />
            <div className="relative">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                <MapPin size={11} className="text-brand-green" /> You are here
              </p>
              <h2 className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-[0.86] tracking-[-0.015em] text-white">
                YKAY
                <span className="block text-brand-orange">COLLEGE</span>
              </h2>
              <p className="mt-4 max-w-md font-body text-sm leading-relaxed text-white/75">
                The campus school in Sango Ota — JSS1 to SS3, laboratories, sports, clubs and a full
                IT academy built into the timetable.
              </p>
            </div>
            <div className="relative mt-8 flex flex-wrap items-center gap-4">
              <a
                href="/admissions"
                className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-7 py-3.5 font-body text-xs font-bold uppercase tracking-[0.15em] text-brand-navy shadow-lg transition-all duration-300 hover:scale-[1.03] hover:bg-brand-orange-dark active:scale-[0.97]"
              >
                Apply to the college <ArrowRight size={14} />
              </a>
              <span className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                ykaycollege.com
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="relative h-px w-full md:h-auto md:w-px">
            <div className="absolute inset-0 bg-[var(--border-subtle)]" />
            <span className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-2 font-body text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">
              or
            </span>
          </div>

          {/* Virtual half — the destination */}
          <div className="group relative flex min-h-[42vh] flex-1 flex-col justify-between overflow-hidden bg-brand-navy p-8 transition-[flex-grow] duration-500 md:p-12 md:hover:flex-[1.35]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-brand-green/15 blur-3xl"
            />
            <div className="relative">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-green/40 bg-brand-green/15 px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
                <Globe size={11} /> Online · anywhere
              </p>
              <h2 className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-[0.86] tracking-[-0.015em] text-white">
                YKAY
                <span className="block text-brand-green">VIRTUAL</span>
              </h2>
              <p className="mt-4 max-w-md font-body text-sm leading-relaxed text-white/75">
                The same teachers and standards — online. Live classes, private 1-on-1 tuition and
                exam preparation on any device, anywhere in Nigeria.
              </p>
            </div>
            <div className="relative mt-8 flex flex-wrap items-center gap-4">
              <a
                href={VIRTUAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-brand-green px-7 py-3.5 font-body text-xs font-bold uppercase tracking-[0.15em] text-brand-navy shadow-lg transition-all duration-300 hover:scale-[1.03] hover:bg-brand-green-dark active:scale-[0.97]"
              >
                Continue to Ykay Virtual <ArrowRight size={14} />
              </a>
              <span className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                {VIRTUAL_URL.replace(/^https?:\/\//, "")}
              </span>
            </div>
          </div>
        </section>

        {/* ── What you can do on Ykay Virtual ── */}
        <Reveal>
          <section className="w-full py-16 md:py-24">
            <div className="mx-auto w-full max-w-7xl px-6 md:px-10">
              <AnimatedText
                as="h2"
                className="mb-3 font-display text-3xl tracking-wide md:text-4xl"
                text="What you can do on Ykay Virtual"
              />
              <p className="mb-12 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)] md:text-base">
                YK-Virtual is the home of Ykay Virtual — a full online school built by the same
                team, for learners who study best from home or need extra support.
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
            </div>
          </section>
        </Reveal>

        {/* ── Two schools · one family ── */}
        <Reveal>
          <section className="w-full border-t border-[var(--section-divider)] bg-[var(--section-bg-alt)]">
            <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-10 md:py-20">
              <div className="mb-10">
                <AnimatedText
                  as="h2"
                  className="mb-3 font-display text-3xl tracking-wide md:text-4xl"
                  text="Two schools · one family"
                />
                <p className="max-w-xl text-sm text-[var(--text-muted)] md:text-base">
                  Learn on campus with Ykay College, or online with Ykay Virtual — whichever fits
                  your child.
                </p>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-7">
                  <div className="mb-1 flex items-center gap-2">
                    <Laptop size={18} className="text-brand-green" />
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
              <div className="mt-10">
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
