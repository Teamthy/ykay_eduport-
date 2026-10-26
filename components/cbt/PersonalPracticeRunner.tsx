"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  LogOut,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";

type PracticeQuestion = {
  id: string;
  subjectName: string;
  topic: string;
  difficulty: number;
  stem: string;
  options: string[];
};

type PracticeAnswer = {
  questionId: string;
  selectedIndex: number;
  check: { correct: boolean; correctIndex: number; explanation: string };
};

type ReviewQuestion = {
  questionId: string;
  subjectName: string;
  topic: string;
  stem: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
  explanation: string;
};

type Result = {
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  scorePct: number;
  byTopic: Record<string, { correct: number; total: number }>;
};

type SessionPayload = {
  session: {
    id: string;
    status: string;
    classLevel: string | null;
    practiceMode: string | null;
    topic: string | null;
    isTimed: boolean;
    deadlineAt: string | null;
    secondsLeft: number | null;
    durationSeconds?: number;
  };
  questions: PracticeQuestion[];
  answers: PracticeAnswer[];
  result?: Result;
  review?: ReviewQuestion[];
  error?: string;
};

type Props = {
  sessionId: string;
  onExit: () => void;
};

function formatTime(seconds: number | null) {
  if (seconds === null) return "Untimed";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
}

function formatLabel(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "";
}

export default function PersonalPracticeRunner({ sessionId, onExit }: Props) {
  const [session, setSession] = useState<SessionPayload["session"] | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, PracticeAnswer>>({});
  const [review, setReview] = useState<ReviewQuestion[] | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [draftSelections, setDraftSelections] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const submitRef = useRef<(_automatic?: boolean) => Promise<void>>(async () => {});
  const attemptedAutoSubmit = useRef(false);
  const timerSecondsRef = useRef<number | null>(null);

  const currentQuestion = questions[questionIndex] ?? null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const selectedIndex =
    currentAnswer?.selectedIndex ??
    (currentQuestion ? (draftSelections[currentQuestion.id] ?? null) : null);
  const answeredCount = Object.keys(answers).length;

  const applyPayload = useCallback((payload: SessionPayload) => {
    setSession(payload.session);
    setQuestions(payload.questions);
    setAnswers(Object.fromEntries(payload.answers.map((answer) => [answer.questionId, answer])));
    setSecondsLeft(payload.session.secondsLeft);
    timerSecondsRef.current = payload.session.secondsLeft;
    if (payload.session.status === "IN_PROGRESS") attemptedAutoSubmit.current = false;
    if (payload.result) setResult(payload.result);
    if (payload.review) setReview(payload.review);
    setLoaded(true);
  }, []);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/cbt/sessions/${sessionId}`, { cache: "no-store" });
      const payload = (await response.json()) as SessionPayload;
      if (!response.ok) throw new Error(payload.error || "Unable to load this practice set.");
      applyPayload(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load this practice set.",
      );
    } finally {
      setLoading(false);
    }
  }, [applyPayload, sessionId]);

  useEffect(() => {
    // Load the persisted server session so refreshes resume at the saved answers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSession();
  }, [loadSession]);

  const submit = useCallback(
    async (automatic = false) => {
      if (saving || !session || session.status === "COMPLETED") return;
      setSaving(true);
      setError("");
      try {
        const response = await fetch(`/api/cbt/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "SUBMIT" }),
        });
        const payload = (await response.json()) as SessionPayload;
        if (!response.ok) throw new Error(payload.error || "Unable to submit this practice set.");
        applyPayload(payload);
        if (automatic) setSecondsLeft(0);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Unable to submit this set.");
      } finally {
        setSaving(false);
      }
    },
    [applyPayload, saving, session, sessionId],
  );
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  useEffect(() => {
    if (!session?.isTimed || session.status !== "IN_PROGRESS" || timerSecondsRef.current === null)
      return;
    const timer = window.setInterval(() => {
      const remaining = timerSecondsRef.current;
      if (remaining === null) return;
      const next = Math.max(0, remaining - 1);
      timerSecondsRef.current = next;
      setSecondsLeft(next);
      if (next === 0 && !attemptedAutoSubmit.current) {
        attemptedAutoSubmit.current = true;
        window.clearInterval(timer);
        void submitRef.current(true);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [session?.id, session?.isTimed, session?.status]);

  const saveAnswer = useCallback(async () => {
    if (!currentQuestion || selectedIndex === null || currentAnswer || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/cbt/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHECK",
          questionId: currentQuestion.id,
          selectedIndex,
        }),
      });
      const payload = (await response.json()) as PracticeAnswer & SessionPayload;
      if (payload.session?.status === "COMPLETED") {
        applyPayload(payload);
        return;
      }
      if (!response.ok) throw new Error(payload.error || "Unable to check this answer.");
      const answer: PracticeAnswer = {
        questionId: payload.questionId,
        selectedIndex: payload.selectedIndex,
        check: payload.check,
      };
      setAnswers((previous) => ({ ...previous, [answer.questionId]: answer }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to check this answer.");
    } finally {
      setSaving(false);
    }
  }, [applyPayload, currentAnswer, currentQuestion, saving, selectedIndex, sessionId]);

  if (loading || !loaded) {
    return (
      <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-12 text-center">
        <LoaderCircle size={26} className="mx-auto animate-spin text-brand-green" />
        <p className="mt-3 text-sm text-[var(--text-muted)]">Loading your saved practice set…</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="rounded-[2rem] border border-red-500/30 bg-red-500/5 p-7">
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
        <button
          type="button"
          onClick={() => void loadSession()}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-navy px-4 py-2 text-sm font-bold text-white"
        >
          <RotateCcw size={14} /> Try again
        </button>
      </div>
    );
  }

  if (review && result && session?.status === "COMPLETED") {
    return (
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-brand-green/30 bg-gradient-to-br from-brand-green/10 to-[var(--surface-card)] p-7 shadow-[var(--card-shadow)] md:p-9">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
            Practice complete
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h2 className="font-display text-5xl text-[var(--text-primary)]">
                {result.scorePct}%
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {result.correct} correct · {result.wrong} incorrect · {result.skipped} skipped ·{" "}
                {result.total} questions
              </p>
            </div>
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-5 py-3 text-sm font-bold text-white"
            >
              <RotateCcw size={15} /> Start another set
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {review.map((item, index) => {
            const correct = item.selectedIndex === item.correctIndex;
            return (
              <article
                key={item.questionId}
                className="rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] md:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  <span>
                    Question {index + 1} · {item.subjectName} · {item.topic}
                  </span>
                  <span
                    className={
                      item.selectedIndex === null
                        ? "text-[var(--text-muted)]"
                        : correct
                          ? "text-brand-green"
                          : "text-red-500"
                    }
                  >
                    {item.selectedIndex === null ? "Skipped" : correct ? "Correct" : "Review this"}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-[var(--text-primary)]">
                  {item.stem}
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {item.options.map((option, optionIndex) => (
                    <li
                      key={`${item.questionId}-${optionIndex}`}
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        optionIndex === item.correctIndex
                          ? "border-brand-green/40 bg-brand-green/10 text-[var(--text-primary)]"
                          : optionIndex === item.selectedIndex
                            ? "border-red-500/40 bg-red-500/5 text-[var(--text-primary)]"
                            : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                      }`}
                    >
                      {String.fromCharCode(65 + optionIndex)}. {option}
                      {optionIndex === item.correctIndex ? " · Correct answer" : ""}
                      {optionIndex === item.selectedIndex && optionIndex !== item.correctIndex
                        ? " · Your answer"
                        : ""}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 rounded-xl bg-[var(--bg-secondary)] p-4 text-xs leading-relaxed text-[var(--text-muted)]">
                  <strong className="text-[var(--text-primary)]">Explanation: </strong>
                  {item.explanation}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  if (!session || !currentQuestion) {
    return (
      <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8">
        <p className="text-sm text-[var(--text-muted)]">This set has no available questions.</p>
        <button type="button" onClick={onExit} className="mt-4 text-sm font-bold text-brand-green">
          Back to practice setup
        </button>
      </div>
    );
  }

  const timerIsLow = secondsLeft !== null && secondsLeft <= 60;
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">
            {formatLabel(session.classLevel)} · {formatLabel(session.practiceMode)} practice
          </p>
          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
            {session.topic || questions[0]?.subjectName} · {answeredCount} of {questions.length}{" "}
            checked
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${timerIsLow ? "bg-red-500/10 text-red-500" : "bg-[var(--bg-secondary)] text-[var(--text-primary)]"}`}
          >
            <Clock3 size={15} /> {formatTime(secondsLeft)}
          </div>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Answers save as you go"
          >
            <LogOut size={14} /> Save & exit
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <article className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)] md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-brand-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
                Question {questionIndex + 1} of {questions.length}
              </span>
              <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                {currentQuestion.subjectName} · {currentQuestion.topic}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Difficulty {currentQuestion.difficulty}/3
            </span>
          </div>
          <h2 className="mt-6 whitespace-pre-line text-base font-semibold leading-relaxed text-[var(--text-primary)] md:text-lg">
            {currentQuestion.stem}
          </h2>

          <fieldset className="mt-6 grid gap-3">
            <legend className="sr-only">Choose an answer</legend>
            {currentQuestion.options.map((option, optionIndex) => {
              const isSelected = (currentAnswer?.selectedIndex ?? selectedIndex) === optionIndex;
              const wasChecked = Boolean(currentAnswer);
              const isCorrect = currentAnswer?.check.correctIndex === optionIndex;
              const isWrongSelection = wasChecked && isSelected && !currentAnswer?.check.correct;
              return (
                <label
                  key={`${currentQuestion.id}-${optionIndex}`}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                    isCorrect
                      ? "border-brand-green/40 bg-brand-green/10"
                      : isWrongSelection
                        ? "border-red-500/40 bg-red-500/5"
                        : isSelected
                          ? "border-brand-green/50 bg-brand-green/5"
                          : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-brand-green/30"
                  } ${wasChecked ? "cursor-default" : ""}`}
                >
                  <input
                    type="radio"
                    name={`answer-${currentQuestion.id}`}
                    value={optionIndex}
                    checked={isSelected}
                    disabled={wasChecked || saving}
                    onChange={() =>
                      setDraftSelections((previous) => ({
                        ...previous,
                        [currentQuestion.id]: optionIndex,
                      }))
                    }
                    className="mt-0.5 accent-emerald-600"
                  />
                  <span className="font-bold text-brand-green">
                    {String.fromCharCode(65 + optionIndex)}.
                  </span>
                  <span className="flex-1 text-[var(--text-primary)]">{option}</span>
                  {isCorrect ? <CheckCircle2 size={17} className="text-brand-green" /> : null}
                  {isWrongSelection ? <XCircle size={17} className="text-red-500" /> : null}
                </label>
              );
            })}
          </fieldset>

          {currentAnswer ? (
            <div
              className={`mt-5 rounded-2xl border p-4 ${currentAnswer.check.correct ? "border-brand-green/30 bg-brand-green/5" : "border-brand-orange/30 bg-brand-orange/5"}`}
            >
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {currentAnswer.check.correct
                  ? "Correct — well done!"
                  : "Not quite. Review the explanation."}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                {currentAnswer.check.explanation}
              </p>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-4 text-sm text-red-500">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
              disabled={questionIndex === 0 || saving}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] disabled:opacity-40"
            >
              <ArrowLeft size={15} /> Previous
            </button>
            {!currentAnswer ? (
              <button
                type="button"
                onClick={() => void saveAnswer()}
                disabled={selectedIndex === null || saving}
                className="inline-flex items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-sm font-bold text-brand-navy disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                Check answer
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setQuestionIndex((index) => Math.min(questions.length - 1, index + 1))
                }
                disabled={questionIndex >= questions.length - 1 || saving}
                className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
              >
                Next <ArrowRight size={15} />
              </button>
            )}
          </div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Question map
            </p>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {questions.map((question, index) => {
                const answer = answers[question.id];
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setQuestionIndex(index)}
                    aria-label={`Go to question ${index + 1}${answer ? (answer.check.correct ? ", correct" : ", checked") : ", unanswered"}`}
                    className={`flex aspect-square items-center justify-center rounded-lg border text-xs font-bold ${
                      index === questionIndex
                        ? "border-brand-green bg-brand-green text-brand-navy"
                        : answer?.check.correct
                          ? "border-brand-green/40 bg-brand-green/10 text-brand-green"
                          : answer
                            ? "border-brand-orange/40 bg-brand-orange/10 text-brand-orange"
                            : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-[var(--text-muted)]">
              {questions.length - answeredCount} still to check
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-brand-orange/30 bg-brand-orange/5 p-5">
            <p className="text-sm font-bold text-[var(--text-primary)]">Ready to finish?</p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
              You can submit with unanswered questions. Your saved answers and explanations stay
              with this session.
            </p>
            <button
              type="button"
              onClick={() => void submit(false)}
              disabled={saving}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-orange px-4 py-2.5 text-sm font-bold text-brand-navy disabled:opacity-50"
            >
              {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
              Submit set
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
