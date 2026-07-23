"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Code,
  Cpu,
  FileText,
  Globe,
  LoaderCircle,
  Presentation,
  Shield,
  Sparkles,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type CatalogCourse = {
  id?: string;
  slug: string;
  title: string;
  tagline?: string;
  shortDesc?: string;
  certification: string;
  level?: string;
  durationWeeks?: number;
  moduleCount?: number;
  enrollmentCount?: number;
  href: string;
  category?: string;
};

const FALLBACK: CatalogCourse[] = [
  { slug: "python", title: "Python Programming", certification: "IT Specialist – Python", shortDesc: "From basics to automation and problem-solving.", href: "/it-education/python", category: "Programming" },
  { slug: "ai", title: "Artificial Intelligence", certification: "IT Specialist – AI", shortDesc: "Practical AI literacy and responsible use.", href: "/it-education/ai", category: "Programming" },
  { slug: "cybersecurity", title: "Cybersecurity", certification: "IT Specialist – Cybersecurity", shortDesc: "Protect systems, accounts, and data.", href: "/it-education/cybersecurity", category: "Security" },
  { slug: "digital-literacy", title: "Digital Literacy", certification: "Ykay Digital Literacy Certificate", shortDesc: "Essential computing for every student.", href: "/it-education/digital-literacy", category: "Foundation" },
  { slug: "microsoft-word", title: "Microsoft Word", certification: "Microsoft Office Specialist", shortDesc: "Professional documents and reports.", href: "/it-education/microsoft-word", category: "Office" },
  { slug: "microsoft-excel", title: "Microsoft Excel", certification: "Microsoft Office Specialist", shortDesc: "Spreadsheets, charts, and analysis.", href: "/it-education/microsoft-excel", category: "Office" },
  { slug: "microsoft-powerpoint", title: "Microsoft PowerPoint", certification: "Microsoft Office Specialist", shortDesc: "Confident presentations that persuade.", href: "/it-education/microsoft-powerpoint", category: "Office" },
  { slug: "excel-expert", title: "Excel Expert", certification: "Microsoft Office Expert", shortDesc: "Advanced formulas, pivots, and dashboards.", href: "/it-education/excel-expert", category: "Office" },
];

const ICON_FOR: Record<string, typeof Code> = {
  python: Code,
  ai: Cpu,
  cybersecurity: Shield,
  "digital-literacy": Globe,
  "microsoft-word": FileText,
  "microsoft-excel": BarChart3,
  "microsoft-powerpoint": Presentation,
  "excel-expert": BookOpen,
};

export default function ITEducationHubPage() {
  const [courses, setCourses] = useState<CatalogCourse[]>(FALLBACK);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/it/catalog", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled && r.ok && Array.isArray(j.courses) && j.courses.length) {
          setCourses(
            j.courses.map((c: CatalogCourse) => ({
              ...c,
              shortDesc: c.tagline || c.shortDesc,
              href: c.href || `/it-education/${c.slug}`,
            }))
          );
          setLive(true);
        }
      } catch {
        /* keep fallback */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(
    () => [
      { label: "Learning tracks", value: String(courses.length) },
      { label: "Certification paths", value: "MOS + IT Specialist" },
      { label: "Student portal", value: "Progress + certificates" },
    ],
    [courses.length]
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="relative overflow-hidden bg-brand-navy px-6 pb-16 pt-28 text-white">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-green/10 via-transparent to-brand-orange/10" />
          <div className="relative mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/40 bg-brand-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
              <Sparkles size={12} /> Flagship digital academy
            </span>
            <h1 className="mt-4 max-w-4xl font-display text-5xl tracking-widest md:text-6xl">
              IT EDUCATION AT{" "}
              <span className="text-brand-green">YKAY COLLEGE</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
              Industry-aligned pathways in programming, AI, cybersecurity, digital literacy, and Microsoft Office — with a
              dedicated IT portal for enrollment, module progress, and certificates.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/it-portal/auth"
                className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:bg-brand-green-dark"
              >
                Start free IT portal <ArrowRight size={14} />
              </Link>
              <a
                href="#programmes"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/10"
              >
                Browse programmes
              </a>
              <Link
                href="/admissions"
                className="inline-flex items-center gap-2 rounded-full border border-brand-orange/50 px-6 py-3 text-xs font-bold uppercase tracking-widest text-brand-orange hover:bg-brand-orange/10"
              >
                Apply to Ykay College
              </Link>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="font-display text-2xl tracking-wide text-brand-green">{s.value}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/50">{s.label}</div>
                </div>
              ))}
            </div>
            {live && (
              <p className="mt-4 text-[10px] uppercase tracking-widest text-brand-green/80">
                Live catalog connected · {courses.reduce((n, c) => n + (c.enrollmentCount || 0), 0)} portal enrollments
              </p>
            )}
          </div>
        </section>

        <section id="programmes" className="px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-green">Programmes</p>
                <h2 className="mt-2 font-display text-4xl tracking-widest text-[var(--text-primary)]">
                  CHOOSE YOUR <span className="text-brand-green">TRACK</span>
                </h2>
              </div>
              {loading && (
                <span className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <LoaderCircle className="animate-spin" size={14} /> Syncing catalog…
                </span>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {courses.map((course) => {
                const Icon = ICON_FOR[course.slug] || Award;
                return (
                  <Link
                    key={course.slug}
                    href={course.href}
                    className="group flex h-full flex-col rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand-green/40 hover:shadow-xl"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green transition group-hover:bg-brand-green group-hover:text-white">
                      <Icon size={22} />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">
                      {course.level || course.category || "Programme"}
                    </div>
                    <h3 className="mt-2 font-display text-2xl tracking-wide text-[var(--text-primary)]">{course.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {course.shortDesc || course.tagline}
                    </p>
                    <div className="mt-4 rounded-xl bg-[var(--surface-disabled)] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      {course.certification}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>
                        {course.durationWeeks ? `${course.durationWeeks} wks` : "Self-paced"}
                        {course.moduleCount ? ` · ${course.moduleCount} modules` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-brand-green">
                        Details <ArrowRight size={12} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[var(--section-bg-alt)] px-6 py-16">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8">
              <Award className="text-brand-green" size={28} />
              <h2 className="mt-4 font-display text-3xl tracking-widest">HOW IT WORKS</h2>
              <ol className="mt-6 space-y-4 text-sm text-[var(--text-secondary)]">
                <li>
                  <b className="text-[var(--text-primary)]">1. Explore</b> — pick a track on this hub.
                </li>
                <li>
                  <b className="text-[var(--text-primary)]">2. Create IT portal access</b> — new IT learners sign up at the IT
                  portal (school staff/students use school accounts where issued).
                </li>
                <li>
                  <b className="text-[var(--text-primary)]">3. Enroll & learn</b> — complete modules and track progress.
                </li>
                <li>
                  <b className="text-[var(--text-primary)]">4. Earn recognition</b> — finish pathways toward Ykay and industry-aligned
                  certificates.
                </li>
              </ol>
            </div>
            <div className="rounded-[2rem] bg-brand-navy p-8 text-white">
              <h2 className="font-display text-3xl tracking-widest">
                READY TO <span className="text-brand-green">BEGIN?</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/70">
                Parents enrolling for secondary school can highlight IT interest during admissions. Community learners can
                start immediately in the IT portal.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/it-portal/auth"
                  className="rounded-full bg-brand-green px-6 py-3 text-xs font-bold uppercase tracking-widest text-white"
                >
                  IT portal signup
                </Link>
                <Link
                  href="/contact"
                  className="rounded-full border border-white/30 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white"
                >
                  Talk to admissions
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
