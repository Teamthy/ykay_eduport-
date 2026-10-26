"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  LogOut,
  RotateCcw,
  XCircle,
} from "lucide-react";

type Option = { key: string; text: string };

type Question = {
  id: string;
  type: string;
  questionText: string;
  marks: number;
  options: Option[] | null;
  savedResponse: string | null;
};

type ReviewRow = {
  id: string;
  questionText: string;
  type: string;
  marks: number;
  options: Option[] | null;
  yourResponse: string | null;
  isCorrect: boolean | null;
  awardedMarks: number | null;
  correctKey: string | null;
  correctText: string | null;
};

type Result = {
  totalScore: number;
  totalMarks: number;
  percent: number;
  passMark: number;
  attemptNumber: number;
};

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function PracticeRunnerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const examId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exam, setExam] = useState<{
    title: string;
    subjectName: string;
    instructions: string | null;
    durationMinutes: number;
    totalMarks: number;
  } | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, string | null>>({});
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [review, setReview] = useState<ReviewRow[]>([]);
  const [checkedQuestions, setCheckedQuestions] = useState<Set<string>>(new Set());
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const submittedRef = useRef(false);
  const clientSequenceRef = useRef(0);

  const start = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    setError("");
    setResult(null);
    setReview([]);
    setCheckedQuestions(new Set());
    setIndex(0);
    submittedRef.current = false;
    try {
      const response = await fetch(`/api/student/practice/${examId}/attempt`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to start this practice set.");
      setExam(body.exam);
      setAttemptId(body.attempt.id);
      clientSequenceRef.current = body.attempt.lastClientSequence ?? 0;
      setQuestions(body.questions);
      setResponses(
        Object.fromEntries(body.questions.map((q: Question) => [q.id, q.savedResponse])),
      );
      setSecondsLeft(body.attempt.secondsLeft);
      setIndex(0);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start.");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    void start();
  }, [start]);

  const submit = useCallback(async () => {
    if (!attemptId || !examId || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/student/practice/${examId}/attempt`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          action: "SUBMIT",
          clientSequence: ++clientSequenceRef.current,
          answers: Object.entries(responses).map(([questionId, value]) => ({
            questionId,
            response: value,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to submit.");
      setResult(body.result);
      setReview(body.review || []);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit.");
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [attemptId, examId, responses]);

  // Countdown — auto-submits when the clock runs out.
  useEffect(() => {
    if (!attemptId || result) return;
    if (secondsLeft <= 0) {
      void submit();
      return;
    }
    const timer = setInterval(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [attemptId, secondsLeft, result, submit]);

  // Periodic save so a refresh or dropped connection doesn't lose answers.
  useEffect(() => {
    if (!attemptId || !examId || result) return;
    const timer = setInterval(() => {
      void fetch(`/api/student/practice/${examId}/attempt`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          action: "SAVE",
          clientSequence: ++clientSequenceRef.current,
          answers: Object.entries(responses).map(([questionId, value]) => ({
            questionId,
            response: value,
          })),
        }),
      })
        .then(async (response) => {
          const body = await response.json();
          if (typeof body.lastClientSequence === "number") {
            clientSequenceRef.current = Math.max(
              clientSequenceRef.current,
              body.lastClientSequence,
            );
          }
        })
        .catch(() => {});
    }, 20_000);
    return () => clearInterval(timer);
  }, [attemptId, examId, responses, result]);

  async function exitPractice(destination: "/student/waec-practice" | "/student/exams") {
    if (attemptId && examId && !result && typeof navigator !== "undefined" && navigator.onLine) {
      try {
        await fetch(`/api/student/practice/${examId}/attempt`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId,
            action: "SAVE",
            clientSequence: ++clientSequenceRef.current,
            answers: Object.entries(responses).map(([questionId, response]) => ({
              questionId,
              response,
            })),
          }),
        });
      } catch {
        // The normal timed save remains the recovery path if connectivity drops here.
      }
    }
    router.replace(destination);
  }

  const current = questions[index];
  const answeredCount = Object.values(responses).filter(
    (value) => value !== null && value !== "",
  ).length;

  if (loading) {
    return (
      <>
        <main className="h-[100dvh] bg-[var(--bg-primary)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={30} className="animate-spin text-brand-orange" />
            <p className="text-sm text-[var(--text-muted)]">Preparing your practice set…</p>
          </div>
        </main>
      </>
    );
  }

  if (error && !result) {
    return (
      <>
        <main className="h-[100dvh] bg-[var(--bg-primary)] px-6 flex items-center justify-center">
          <div className="mx-auto max-w-xl p-8 rounded-[2rem] bg-red-500/5 border border-red-500/30 text-center">
            <AlertCircle size={30} className="mx-auto mb-3 text-red-500" />
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">{error}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => void start()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-orange text-brand-navy text-sm font-bold"
              >
                <RotateCcw size={14} /> Try again
              </button>
              <Link
                href="/student/waec-practice"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--surface-disabled)] text-[var(--text-primary)] text-sm font-bold"
              >
                <ArrowLeft size={14} /> Back to practice
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  // ── Results + instant review ──
  if (result) {
    const passed = result.percent >= result.passMark;
    return (
      <>
        <main className="min-h-[100dvh] bg-[var(--bg-primary)] py-6 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <div
              className={`p-8 rounded-[2rem] text-center border ${
                passed
                  ? "bg-brand-green/5 border-brand-green/40"
                  : "bg-brand-orange/5 border-brand-orange/40"
              }`}
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                  passed
                    ? "bg-brand-green/15 text-brand-green"
                    : "bg-brand-orange/15 text-brand-orange"
                }`}
              >
                {passed ? <CheckCircle2 size={30} /> : <RotateCcw size={30} />}
              </div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Attempt {result.attemptNumber} · practice only
              </p>
              <h1 className="font-display text-5xl text-[var(--text-primary)] mb-1">
                {result.percent}%
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                {result.totalScore} of {result.totalMarks} marks · pass mark {result.passMark}%
              </p>
              <div className="flex flex-wrap gap-3 justify-center mt-5">
                <button
                  onClick={() => void start()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-orange text-brand-navy text-sm font-bold"
                >
                  <RotateCcw size={14} /> Try again
                </button>
                <button
                  onClick={() => router.push("/student/waec-practice")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-navy text-white text-sm font-bold"
                >
                  <ArrowLeft size={14} /> Back to practice
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-xl text-[var(--text-primary)]">Review answers</h2>
              {review.map((row, rowIndex) => {
                const correctLabel =
                  row.correctKey ??
                  row.correctText ??
                  (row.type === "ESSAY" ? "Marked by your teacher" : "—");
                return (
                  <div
                    key={row.id}
                    className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 mt-0.5">
                        {row.isCorrect === true ? (
                          <CheckCircle2 size={18} className="text-brand-green" />
                        ) : row.isCorrect === false ? (
                          <XCircle size={18} className="text-red-500" />
                        ) : (
                          <Clock size={18} className="text-[var(--text-muted)]" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                          {rowIndex + 1}. {row.questionText}
                        </p>
                        <div className="text-xs space-y-1">
                          <p className="text-[var(--text-muted)]">
                            Your answer:{" "}
                            <span className="font-semibold text-[var(--text-primary)]">
                              {row.yourResponse || "Not answered"}
                            </span>
                          </p>
                          {row.isCorrect === false && (
                            <p className="text-brand-green">
                              Correct answer: <span className="font-semibold">{correctLabel}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-[var(--text-muted)]">
                        {row.awardedMarks ?? 0}/{row.marks}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </>
    );
  }

  // ── Full-screen practice runner ──
  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--bg-primary)]">
      <header className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-green">
              Personal practice
            </p>
            <h1 className="truncate text-sm font-bold text-[var(--text-primary)] sm:text-base">
              {exam?.title}
            </h1>
            <p className="hidden text-xs text-[var(--text-muted)] sm:block">
              {exam?.subjectName} · {answeredCount}/{questions.length} answered · answers are
              reviewed at the end
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 font-mono text-sm font-bold ${secondsLeft <= 60 ? "bg-red-500/15 text-red-500" : "bg-brand-green/10 text-brand-green"}`}
            >
              <Clock size={14} /> {formatClock(Math.max(0, secondsLeft))}
            </span>
            <button
              onClick={() => setShowExitConfirm(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:border-brand-green/40 hover:text-brand-green"
              aria-label="Exit practice"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>
      <div className="h-1 shrink-0 bg-[var(--surface-disabled)]">
        <div
          className="h-full bg-brand-green transition-all"
          style={{ width: `${questions.length ? ((index + 1) / questions.length) * 100 : 0}%` }}
        />
      </div>
      <section className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 space-y-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>
                Question {index + 1} of {questions.length}
              </span>
              <span>
                {current?.marks ?? 0} {current?.marks === 1 ? "mark" : "marks"}
              </span>
            </div>
            {current && (
              <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] sm:rounded-[2rem] sm:p-8">
                <p className="mb-6 text-lg font-semibold leading-relaxed text-[var(--text-primary)] sm:text-xl">
                  {current.questionText}
                </p>
                {current.options ? (
                  <div className="space-y-3">
                    {current.options.map((option) => {
                      const selected = responses[current.id] === option.key;
                      const locked =
                        responses[current.id] !== null &&
                        responses[current.id] !== undefined &&
                        responses[current.id] !== "";
                      return (
                        <button
                          key={option.key}
                          type="button"
                          disabled={locked}
                          onClick={() => {
                            if (!locked)
                              setResponses((previous) => ({
                                ...previous,
                                [current.id]: option.key,
                              }));
                          }}
                          className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left text-sm transition-colors sm:px-5 ${selected ? "border-brand-green bg-brand-green/10 font-semibold text-[var(--text-primary)]" : "border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-brand-green/50"} ${locked && !selected ? "cursor-not-allowed opacity-55" : ""}`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${selected ? "bg-brand-green text-brand-navy" : "bg-[var(--surface-disabled)] text-[var(--text-muted)]"}`}
                          >
                            {option.key}
                          </span>
                          <span>{option.text}</span>
                          {selected ? (
                            <CheckCircle2 size={17} className="ml-auto shrink-0 text-brand-green" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    value={responses[current.id] ?? ""}
                    disabled={checkedQuestions.has(current.id)}
                    onChange={(event) =>
                      setResponses((previous) => ({
                        ...previous,
                        [current.id]: event.target.value,
                      }))
                    }
                    rows={current.type === "ESSAY" ? 8 : 3}
                    placeholder="Type your answer…"
                    className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-input)] px-4 py-4 text-sm text-[var(--text-primary)] outline-none focus:border-brand-green disabled:opacity-65"
                  />
                )}
                {checkedQuestions.has(current.id) ? (
                  <p className="mt-4 rounded-xl bg-brand-green/10 px-4 py-3 text-xs font-medium text-brand-green">
                    Response locked. Correct answers and explanations will appear after you finish.
                  </p>
                ) : null}
              </article>
            )}
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 sm:p-4">
              <button
                type="button"
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
                disabled={index === 0}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-disabled)] disabled:opacity-40 sm:px-5"
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  current && setCheckedQuestions((previous) => new Set(previous).add(current.id))
                }
                disabled={!current || checkedQuestions.has(current.id) || !responses[current.id]}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green px-4 py-2.5 text-xs font-bold text-brand-navy disabled:cursor-not-allowed disabled:opacity-45 sm:px-6"
              >
                <CheckCircle2 size={15} />{" "}
                {current && checkedQuestions.has(current.id) ? "Checked" : "Check answer"}
              </button>
              {index < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-disabled)] sm:px-5"
                >
                  Next <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50 sm:px-5"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : null} Finish &
                  review
                </button>
              )}
            </div>
          </div>
          <aside className="hidden h-fit rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 lg:block">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Your progress
            </p>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((question, questionIndex) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setIndex(questionIndex)}
                  className={`h-10 rounded-xl text-xs font-bold ${questionIndex === index ? "bg-brand-green text-brand-navy" : responses[question.id] ? "bg-brand-green/15 text-brand-green" : "bg-[var(--surface-disabled)] text-[var(--text-muted)]"}`}
                  aria-label={`Go to question ${questionIndex + 1}`}
                >
                  {questionIndex + 1}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-[var(--text-muted)]">
              {answeredCount} of {questions.length} answered. Your selected multiple-choice response
              locks immediately. No solutions are shown until you finish.
            </p>
          </aside>
        </div>
      </section>
      <ConfirmDialog
        open={showExitConfirm}
        title="Leave this practice set?"
        message="Your saved progress will remain available. You can return to practice or switch to the exam catalogue."
        confirmText="Switch to exams"
        cancelText="Keep practicing"
        variant="warning"
        onConfirm={() => void exitPractice("/student/exams")}
        onCancel={() => setShowExitConfirm(false)}
      />
    </main>
  );
}
