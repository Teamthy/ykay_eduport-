"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  LoaderCircle,
  PlayCircle,
  RotateCcw,
  Shield,
} from "lucide-react";

type ExamCard = {
  id: string;
  title: string;
  subjectName: string;
  teacherName: string;
  examType: string;
  durationMinutes: number;
  questionCount: number;
  totalMarks: number;
  passMark: number;
  hasEssay: boolean;
  status: string;
  instructions: string | null;
  canStart: boolean;
  canResume: boolean;
  attempt: {
    id: string;
    status: string;
    totalScore: number;
    submittedAt: string | null;
    scoreVisible: boolean;
    percent: number | null;
  } | null;
};

type Response = {
  student: { displayName: string; studentId: string };
  exams: ExamCard[];
};

export default function StudentExamsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/student/exams", { cache: "no-store" });
        const body = (await response.json()) as Response & { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load exams.");
        setData(body);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load exams.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pt-28 pb-14">
          <div className="mx-auto max-w-6xl">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-green/40 bg-brand-green/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
              <ClipboardCheck size={11} /> Computer-Based Tests
            </span>
            <h1 className="font-display text-4xl tracking-widest text-white md:text-6xl">
              MY <span className="text-brand-green">EXAMS</span>
            </h1>
            <p className="mt-3 max-w-2xl font-body text-sm text-white/60">
              Take published tests for your class. Your answers save automatically, and the timer submits for
              you when time runs out.
            </p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto max-w-6xl space-y-4">
            {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">{error}</div> : null}

            {loading ? (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-10 shadow-[var(--card-shadow)]">
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading your exams...
                </div>
              </div>
            ) : null}

            {!loading && data
              ? data.exams.map((exam) => (
                  <div key={exam.id} className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-xl text-[var(--text-primary)]">{exam.title}</h3>
                          <span className="rounded-full bg-brand-green/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand-green">
                            {exam.examType}
                          </span>
                          {exam.status === "CLOSED" ? (
                            <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-500">Closed</span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                          <span className="inline-flex items-center gap-1"><BookOpen size={11} /> {exam.subjectName} · {exam.teacherName}</span>
                          <span className="inline-flex items-center gap-1"><Clock size={11} /> {exam.durationMinutes} min</span>
                          <span>{exam.questionCount} questions · {exam.totalMarks} marks · pass {exam.passMark}%</span>
                          <span className="inline-flex items-center gap-1"><Shield size={11} /> Auto-save · Auto-submit{exam.hasEssay ? " · Essay included" : ""}</span>
                        </div>
                        {exam.instructions ? (
                          <p className="mt-2 text-xs text-[var(--text-secondary)]">{exam.instructions}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {exam.attempt?.scoreVisible ? (
                          <div className="text-right">
                            <div className={`font-display text-3xl ${exam.attempt.percent !== null && exam.attempt.percent >= exam.passMark ? "text-brand-green" : "text-red-500"}`}>
                              {exam.attempt.percent}%
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                              {exam.attempt.totalScore}/{exam.totalMarks} marks
                            </div>
                          </div>
                        ) : exam.attempt && exam.attempt.status !== "IN_PROGRESS" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-orange">
                            <CheckCircle2 size={12} /> Submitted — awaiting results
                          </span>
                        ) : null}
                        {exam.canResume ? (
                          <Link href={`/student/exams/${exam.id}`} className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:bg-brand-orange-dark">
                            <RotateCcw size={13} /> Resume Exam
                          </Link>
                        ) : exam.canStart ? (
                          <Link href={`/student/exams/${exam.id}`} className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:bg-brand-green-dark">
                            <PlayCircle size={13} /> Start Exam
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              : null}

            {!loading && data && !data.exams.length ? (
              <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-12 text-center shadow-[var(--card-shadow)]">
                <Award className="mx-auto mb-3 text-[var(--text-muted)]" size={32} />
                <p className="text-sm text-[var(--text-muted)]">No exams have been published for your class yet.</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
