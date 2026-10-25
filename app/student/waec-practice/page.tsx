"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PortalTopbar from "@/components/PortalTopbar";
import PortalSidebar from "@/components/PortalSidebar";
import StudentCbtNav from "@/components/student/StudentCbtNav";
import { STUDENT_SIDEBAR_ITEMS } from "@/components/student/sidebarItems";
import {
  ClipboardCheck,
  BookOpen,
  Award,
  Clock,
  PlayCircle,
  TrendingUp,
  RotateCcw,
  AlertCircle,
  Loader2,
} from "lucide-react";

const SIDEBAR_ITEMS = STUDENT_SIDEBAR_ITEMS;

type PracticeExam = {
  id: string;
  title: string;
  subjectName: string;
  teacherName: string;
  practiceCategory: "WAEC" | "JAMB" | "JUNIOR_WAEC" | "OTHER";
  className: string;
  isHistoricalClass: boolean;
  term: { id: string; label: string; sessionLabel: string } | null;
  durationMinutes: number;
  passMark: number;
  questionCount: number;
  totalMarks: number;
  canStart: boolean;
  canResume: boolean;
  attemptCount: number;
  bestPercent: number | null;
  lastPercent: number | null;
  lastAttemptAt: string | null;
};

type Subject = {
  name: string;
  examCount: number;
  questionCount: number;
  attemptCount: number;
  bestPercent: number | null;
};

type Payload = {
  currentTermId: string | null;
  terms: Array<{
    id: string;
    label: string;
    sessionLabel: string;
    index: number;
    isCurrent: boolean;
  }>;
  categories: Array<"WAEC" | "JAMB" | "JUNIOR_WAEC" | "OTHER">;
  subjects: Subject[];
  exams: PracticeExam[];
  summary: {
    testsTaken: number;
    questionsAnswered: number;
    averagePercent: number | null;
    bestPercent: number | null;
  };
};

function scoreTone(percent: number | null) {
  if (percent === null) return "text-[var(--text-muted)]";
  if (percent >= 70) return "text-brand-green";
  if (percent >= 50) return "text-brand-orange";
  return "text-red-500";
}

export default function ExamPracticePage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PracticeExam["practiceCategory"] | null>(
    null,
  );
  const [selectedTermId, setSelectedTermId] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedTermId) params.set("termId", selectedTermId);
      const response = await fetch(`/api/student/practice?${params.toString()}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to load practice exams.");
      setData(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load practice exams.");
    } finally {
      setLoading(false);
    }
  }, [selectedTermId]);

  useEffect(() => {
    // The async helper awaits fetch before changing React state; this is not a synchronous effect update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const retryLoad = useCallback(() => {
    setLoading(true);
    setError("");
    void load();
  }, [load]);

  const visibleExams = useMemo(() => {
    if (!data) return [];
    return data.exams.filter((exam) => {
      const categoryMatches = !selectedCategory || exam.practiceCategory === selectedCategory;
      const subjectMatches = !selectedSubject || exam.subjectName === selectedSubject;
      return categoryMatches && subjectMatches;
    });
  }, [data, selectedSubject, selectedCategory]);

  const summary = data?.summary;
  const hasAnyExam = Boolean(data?.exams.length);

  return (
    <>
      <PortalTopbar />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 bg-gradient-to-l from-brand-orange to-transparent" />
          <div className="w-full relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-[10px] font-bold uppercase tracking-widest mb-3">
              <Award size={11} /> Exam Practice
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              EXAM <span className="text-brand-orange">PRACTICE</span>
            </h1>
            <p className="text-white/60 text-sm">
              Practice sets published by your teachers. Retake them as often as you like — scores
              here never affect your report card.
            </p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="w-full flex flex-col lg:flex-row gap-8">
            <PortalSidebar portalName="Student" portalType="student" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <StudentCbtNav active="teacher-practice" />
                {data?.terms.length ? (
                  <label className="min-w-[15rem] flex-1 sm:flex-none">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      Term / session
                    </span>
                    <select
                      aria-label="Filter practice by term and session"
                      value={selectedTermId}
                      onChange={(event) => {
                        setLoading(true);
                        setError("");
                        setSelectedTermId(event.target.value);
                      }}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)] sm:min-w-[15rem]"
                    >
                      <option value="">All terms and sessions</option>
                      {data.terms.map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.sessionLabel} · {term.label}
                          {term.isCurrent ? " (current)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              {loading && (
                <div className="p-12 rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] flex flex-col items-center justify-center gap-3">
                  <Loader2 size={28} className="animate-spin text-[var(--text-accent-warm)]" />
                  <p className="text-sm text-[var(--text-muted)]">Loading your practice sets…</p>
                </div>
              )}

              {!loading && error && (
                <div className="p-8 rounded-[2rem] bg-red-500/5 border border-red-500/30 text-center">
                  <AlertCircle size={28} className="mx-auto mb-3 text-red-500" />
                  <p className="text-sm text-[var(--text-primary)] font-semibold mb-1">{error}</p>
                  <button
                    onClick={retryLoad}
                    className="mt-3 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-brand-orange text-brand-navy text-sm font-bold"
                  >
                    <RotateCcw size={14} /> Try again
                  </button>
                </div>
              )}

              {!loading && !error && !hasAnyExam && (
                <div className="p-12 rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] text-center">
                  <div className="w-16 h-16 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center mx-auto mb-4">
                    <Award size={28} />
                  </div>
                  <h2 className="font-display text-2xl text-[var(--text-primary)] mb-2">
                    No practice sets yet
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
                    Your teachers haven&apos;t published any practice exams for your class yet. When
                    they do, they&apos;ll appear here and you can attempt them as many times as you
                    want.
                  </p>
                  <Link
                    href="/student/exams"
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-navy text-white text-sm font-bold"
                  >
                    <ClipboardCheck size={14} /> View my CBT exams
                  </Link>
                </div>
              )}

              {!loading && !error && hasAnyExam && (
                <>
                  <div>
                    <h3 className="mb-3 font-display text-lg text-[var(--text-primary)]">
                      Choose practice programme
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(null)}
                        aria-pressed={selectedCategory === null}
                        className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest ${
                          selectedCategory === null
                            ? "bg-brand-orange text-brand-navy"
                            : "border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                        }`}
                      >
                        All programmes
                      </button>
                      {data!.categories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(category);
                            setSelectedSubject(null);
                          }}
                          aria-pressed={selectedCategory === category}
                          className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest ${
                            selectedCategory === category
                              ? "bg-brand-orange text-brand-navy"
                              : "border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                          }`}
                        >
                          {category.replaceAll("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {data!.subjects.length > 1 && (
                    <div>
                      <h3 className="font-display text-xl text-[var(--text-primary)] mb-4">
                        Choose subject
                      </h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <button
                          onClick={() => setSelectedSubject(null)}
                          className={`p-5 rounded-2xl bg-[var(--surface-card)] border text-left transition-all hover:-translate-y-1 ${
                            selectedSubject === null
                              ? "border-brand-orange shadow-[var(--card-shadow-hover)]"
                              : "border-[var(--border-subtle)] hover:border-brand-orange/30"
                          }`}
                        >
                          <div className="w-11 h-11 rounded-xl bg-brand-navy/10 text-brand-navy dark:text-white flex items-center justify-center mb-3">
                            <BookOpen size={20} />
                          </div>
                          <h4 className="font-bold text-[var(--text-primary)] mb-1">
                            All subjects
                          </h4>
                          <p className="text-xs text-[var(--text-muted)]">
                            {data!.exams.length} practice{" "}
                            {data!.exams.length === 1 ? "set" : "sets"}
                          </p>
                        </button>

                        {data!.subjects.map((subject) => (
                          <button
                            key={subject.name}
                            onClick={() => setSelectedSubject(subject.name)}
                            className={`p-5 rounded-2xl bg-[var(--surface-card)] border text-left transition-all hover:-translate-y-1 ${
                              selectedSubject === subject.name
                                ? "border-brand-orange shadow-[var(--card-shadow-hover)]"
                                : "border-[var(--border-subtle)] hover:border-brand-orange/30"
                            }`}
                          >
                            <div className="w-11 h-11 rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center mb-3">
                              <BookOpen size={20} />
                            </div>
                            <h4 className="font-bold text-[var(--text-primary)] mb-1">
                              {subject.name}
                            </h4>
                            <div className="text-xs text-[var(--text-muted)] space-y-1">
                              <div className="flex items-center gap-1">
                                <ClipboardCheck size={11} /> {subject.examCount}{" "}
                                {subject.examCount === 1 ? "set" : "sets"} · {subject.questionCount}{" "}
                                questions
                              </div>
                              {subject.bestPercent !== null && (
                                <div className="flex items-center gap-1 text-brand-green">
                                  <TrendingUp size={11} /> Best: {subject.bestPercent}%
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-display text-xl text-[var(--text-primary)] mb-4">
                      {selectedSubject ? `${selectedSubject} practice` : "Practice sets"}
                    </h3>
                    {!visibleExams.length ? (
                      <p className="rounded-2xl border border-dashed border-[var(--border-default)] p-8 text-center text-sm text-[var(--text-muted)]">
                        No practice sets match this programme, subject and term filter.
                      </p>
                    ) : null}
                    <div className="space-y-3">
                      {visibleExams.map((exam) => (
                        <div
                          key={exam.id}
                          className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] flex flex-col md:flex-row md:items-center gap-4"
                        >
                          <div className="w-12 h-12 rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0">
                            <Award size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-[var(--text-primary)]">{exam.title}</h4>
                              <span className="rounded-full bg-brand-orange/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand-orange">
                                {exam.practiceCategory.replaceAll("_", " ")}
                              </span>
                              {exam.isHistoricalClass ? (
                                <span className="rounded-full bg-[var(--surface-disabled)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                  Previous class
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)] mt-1">
                              <span className="flex items-center gap-1">
                                <BookOpen size={11} /> {exam.questionCount} Qs
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={11} /> {exam.durationMinutes} min
                              </span>
                              <span>
                                {exam.subjectName} · {exam.className} · {exam.teacherName}
                                {exam.term
                                  ? ` · ${exam.term.sessionLabel} ${exam.term.label}`
                                  : " · legacy term"}
                              </span>
                              {exam.attemptCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <RotateCcw size={11} /> {exam.attemptCount}{" "}
                                  {exam.attemptCount === 1 ? "attempt" : "attempts"}
                                </span>
                              )}
                            </div>
                            {exam.bestPercent !== null && (
                              <div className="flex flex-wrap gap-3 text-xs mt-2">
                                <span className={`font-bold ${scoreTone(exam.bestPercent)}`}>
                                  Best {exam.bestPercent}%
                                </span>
                                {exam.lastPercent !== null && (
                                  <span className="text-[var(--text-muted)]">
                                    Last {exam.lastPercent}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {exam.canResume ? (
                            <Link
                              href={`/student/waec-practice/${exam.id}`}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-navy text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg"
                            >
                              <PlayCircle size={14} /> Resume
                            </Link>
                          ) : exam.canStart ? (
                            <Link
                              href={`/student/waec-practice/${exam.id}`}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-orange text-brand-navy text-sm font-bold hover:bg-brand-orange-dark transition-all shadow-lg"
                            >
                              {exam.attemptCount > 0 ? (
                                <>
                                  <RotateCcw size={14} /> Retake
                                </>
                              ) : (
                                <>
                                  <PlayCircle size={14} /> Start
                                </>
                              )}
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--surface-disabled)] text-[var(--text-muted)] text-sm font-bold">
                              <Clock size={14} /> Closed
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {summary && summary.testsTaken > 0 && (
                    <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-brand-navy-light p-6 text-white">
                      <h3 className="font-display text-xl mb-4">Your practice summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-white/10 text-center">
                          <div className="font-display text-3xl text-brand-orange">
                            {summary.testsTaken}
                          </div>
                          <div className="text-[10px] uppercase tracking-widest text-white/60">
                            Tests taken
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/10 text-center">
                          <div className="font-display text-3xl text-brand-green">
                            {summary.averagePercent === null ? "—" : `${summary.averagePercent}%`}
                          </div>
                          <div className="text-[10px] uppercase tracking-widest text-white/60">
                            Avg score
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/10 text-center">
                          <div className="font-display text-3xl text-white">
                            {summary.questionsAnswered}
                          </div>
                          <div className="text-[10px] uppercase tracking-widest text-white/60">
                            Qs answered
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/10 text-center">
                          <div className="font-display text-3xl text-brand-green">
                            {summary.bestPercent === null ? "—" : `${summary.bestPercent}%`}
                          </div>
                          <div className="text-[10px] uppercase tracking-widest text-white/60">
                            Best score
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
