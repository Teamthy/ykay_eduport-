import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, ListChecks } from "lucide-react";
import { prisma } from "@/lib/prisma";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "CBT Practice — real exam-style questions",
  description:
    "Free computer-based testing practice for Ykay students: timed JAMB/WAEC-style exams and instant-feedback practice across JSS and SS subjects.",
};

export const dynamic = "force-dynamic";

const LEVEL_LABELS: Record<string, string> = {
  jss1: "Junior — JSS1",
  jss2: "Junior — JSS2",
  jss3: "Junior — JSS3",
  ss1: "Senior — SS1",
  ss2: "Senior — SS2",
  ss3: "Senior — SS3",
};

/** /cbt — the subject picker. Counts are live from the question bank. */
export default async function CbtPage() {
  const subjects = await prisma.cbtSubject.findMany({
    where: { questions: { some: { status: "published" } } },
    orderBy: [{ classLevel: "asc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      classLevel: true,
      _count: { select: { questions: { where: { status: "published" } } } },
    },
  });

  const total = subjects.reduce((n, s) => n + s._count.questions, 0);
  const groups = Object.entries(
    subjects.reduce<Record<string, typeof subjects>>((acc, s) => {
      (acc[s.classLevel] ??= []).push(s);
      return acc;
    }, {}),
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] pb-20">
        {/* Header band */}
        <section className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 pb-12 pt-28 md:px-10 md:pt-32">
          <div className="mx-auto w-full max-w-6xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-green/40 bg-brand-green/15 px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
              <ListChecks size={11} /> CBT Practice
            </p>
            <h1 className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-[0.86] tracking-[-0.015em] text-[var(--text-primary)]">
              PRACTICE LIKE
              <span className="block text-brand-green">IT'S THE EXAM.</span>
            </h1>
            <p className="mt-5 max-w-2xl font-body text-base leading-relaxed text-[var(--text-secondary)]">
              {total} curriculum questions and counting — timed JAMB/WAEC-style papers with the
              navigation grid and flag-for-review, or calm practice with an explanation after every
              answer. Free for every Ykay student.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-body text-xs font-semibold text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-2">
                <Clock size={13} className="text-brand-green" /> 45s per question in exam mode
              </span>
              <span className="inline-flex items-center gap-2">
                <BookOpen size={13} className="text-brand-green" /> Every answer explained
              </span>
            </div>
          </div>
        </section>

        {/* Subject cards grouped by class level */}
        <section className="mx-auto w-full max-w-6xl px-6 pt-12 md:px-10">
          {groups.map(([level, list]) => (
            <div key={level} className="mb-12">
              <h2 className="mb-5 font-display text-2xl tracking-wide text-[var(--text-primary)]">
                {LEVEL_LABELS[level] ?? level.toUpperCase()}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((s, i) => (
                  <Reveal key={s.slug} variant={i % 2 === 0 ? "up" : "zoom"} delay={i * 40}>
                    <Link
                      href={`/cbt/${s.slug}`}
                      className="group flex h-full flex-col justify-between rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)] transition-all hover:-translate-y-1 hover:border-brand-green/50"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-display text-sm tracking-widest text-brand-green">
                            ({String(i + 1).padStart(2, "0")})
                          </span>
                          <span className="rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 font-body text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            {s._count.questions} questions
                          </span>
                        </div>
                        <h3 className="mt-4 font-display text-2xl tracking-wide text-[var(--text-primary)]">
                          {s.name.toUpperCase()}
                        </h3>
                      </div>
                      <span className="mt-6 inline-flex items-center gap-2 font-body text-xs font-bold uppercase tracking-widest text-brand-green">
                        Start practicing
                        <ArrowRight
                          size={13}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          ))}

          {subjects.length === 0 ? (
            <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-center font-body text-sm text-[var(--text-secondary)]">
              The question bank is empty. Seed it with <code>npm run cbt:seed</code>.
            </p>
          ) : null}
        </section>
      </main>
      <Footer />
    </>
  );
}
