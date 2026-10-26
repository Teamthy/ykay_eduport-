"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Clock3,
  LoaderCircle,
  Map,
  RotateCcw,
  Send,
  X,
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
  check?: { correct: boolean; correctIndex: number; explanation: string };
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

function calculatePracticeValue(left: number, right: number, operation: "+" | "−" | "×" | "÷") {
  if (operation === "+") return left + right;
  if (operation === "−") return left - right;
  if (operation === "×") return left * right;
  return right === 0 ? Number.NaN : left / right;
}

function formatCalculatorValue(value: number) {
  return String(Number(value.toPrecision(10)));
}

function QuestionMapPanel({
  questions,
  answers,
  draftSelections,
  questionIndex,
  onSelect,
  answeredCount,
}: {
  questions: PracticeQuestion[];
  answers: Record<string, PracticeAnswer>;
  draftSelections: Record<string, number>;
  questionIndex: number;
  onSelect: (_index: number) => void;
  answeredCount: number;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Question map
        </p>
        <span className="text-[10px] font-semibold text-[var(--text-muted)]">
          {answeredCount}/{questions.length}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {questions.map((question, index) => {
          const answered =
            draftSelections[question.id] !== undefined || Boolean(answers[question.id]);
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onSelect(index)}
              aria-label={`Go to question ${index + 1}, ${answered ? "answered" : "unanswered"}`}
              aria-current={index === questionIndex ? "step" : undefined}
              className={`flex aspect-square items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                index === questionIndex
                  ? "border-brand-green bg-brand-green text-brand-navy"
                  : answered
                    ? "border-brand-green/35 bg-brand-green/10 text-brand-green"
                    : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:border-brand-green/40"
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-[var(--text-muted)]">
        {questions.length - answeredCount} unanswered
      </p>
    </div>
  );
}

function FinishPanel({
  answeredCount,
  questionCount,
  saving,
  onSubmit,
}: {
  answeredCount: number;
  questionCount: number;
  saving: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-brand-orange/30 bg-brand-orange/5 p-5">
      <p className="text-sm font-bold text-[var(--text-primary)]">Ready to finish?</p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
        Answers and explanations stay hidden until you submit. You may finish with unanswered
        questions.
      </p>
      <p className="mt-3 text-xs font-semibold text-[var(--text-secondary)]">
        {answeredCount} of {questionCount} answered
      </p>
      <button
        type="button"
        onClick={onSubmit}
        disabled={saving}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-orange px-4 py-2.5 text-sm font-bold text-brand-navy disabled:opacity-50"
      >
        <Send size={15} /> Submit set
      </button>
    </div>
  );
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
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [showQuestionMap, setShowQuestionMap] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [calculatorDisplay, setCalculatorDisplay] = useState("0");
  const [calculatorStoredValue, setCalculatorStoredValue] = useState<number | null>(null);
  const [calculatorOperation, setCalculatorOperation] = useState<"+" | "−" | "×" | "÷" | null>(
    null,
  );
  const [calculatorReplaceDisplay, setCalculatorReplaceDisplay] = useState(false);
  const draftSelectionsRef = useRef<Record<string, number>>({});
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const submitRef = useRef<(_automatic?: boolean) => Promise<void>>(async () => {});
  const attemptedAutoSubmit = useRef(false);
  const timerSecondsRef = useRef<number | null>(null);

  const currentQuestion = questions[questionIndex] ?? null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const selectedIndex = currentQuestion
    ? (draftSelections[currentQuestion.id] ?? currentAnswer?.selectedIndex ?? null)
    : null;
  const answeredCount = Object.keys(draftSelections).length;

  const applyPayload = useCallback((payload: SessionPayload) => {
    setSession(payload.session);
    setQuestions(payload.questions);
    const answerMap = Object.fromEntries(
      payload.answers.map((answer) => [answer.questionId, answer]),
    );
    const selectionMap = Object.fromEntries(
      payload.answers.map((answer) => [answer.questionId, answer.selectedIndex]),
    );
    setAnswers(answerMap);
    setDraftSelections(selectionMap);
    draftSelectionsRef.current = selectionMap;
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
        await saveQueueRef.current.catch(() => undefined);
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

  const saveSelection = useCallback(
    (questionId: string, selectedIndex: number) => {
      const nextDraft = { ...draftSelectionsRef.current, [questionId]: selectedIndex };
      draftSelectionsRef.current = nextDraft;
      setDraftSelections(nextDraft);
      setSavingAnswers(true);
      setError("");

      const queued = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const latestSelection = draftSelectionsRef.current[questionId];
          if (latestSelection === undefined) return;
          const response = await fetch(`/api/cbt/sessions/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "SAVE",
              questionId,
              selectedIndex: latestSelection,
            }),
          });
          const payload = (await response.json()) as SessionPayload & {
            ok?: boolean;
            saved?: boolean;
            questionId?: string;
            selectedIndex?: number;
          };
          if (!response.ok) throw new Error(payload.error || "Unable to save this response.");
          if ("session" in payload && payload.session?.status === "COMPLETED") {
            applyPayload(payload);
            return;
          }
          if (payload.saved && typeof payload.selectedIndex === "number") {
            setAnswers((previous) => ({
              ...previous,
              [questionId]: { questionId, selectedIndex: payload.selectedIndex! },
            }));
          }
        })
        .catch((saveError: unknown) => {
          setError(
            saveError instanceof Error ? saveError.message : "Unable to save this response.",
          );
        })
        .finally(() => setSavingAnswers(false));
      saveQueueRef.current = queued;
      return queued;
    },
    [applyPayload, sessionId],
  );

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

  function calculatorDigit(digit: string) {
    if (calculatorReplaceDisplay || calculatorDisplay === "0" || calculatorDisplay === "Error") {
      setCalculatorDisplay(digit);
      setCalculatorReplaceDisplay(false);
      return;
    }
    if (calculatorDisplay.length < 14) setCalculatorDisplay((value) => value + digit);
  }

  function calculatorDecimal() {
    if (calculatorReplaceDisplay || calculatorDisplay === "Error") {
      setCalculatorDisplay("0.");
      setCalculatorReplaceDisplay(false);
    } else if (!calculatorDisplay.includes(".")) {
      setCalculatorDisplay((value) => `${value}.`);
    }
  }

  function calculatorOperator(operation: "+" | "−" | "×" | "÷") {
    const current = Number(calculatorDisplay);
    if (!Number.isFinite(current)) return;
    if (calculatorStoredValue !== null && calculatorOperation && !calculatorReplaceDisplay) {
      const next = calculatePracticeValue(calculatorStoredValue, current, calculatorOperation);
      setCalculatorDisplay(formatCalculatorValue(next));
      setCalculatorStoredValue(next);
    } else {
      setCalculatorStoredValue(current);
    }
    setCalculatorOperation(operation);
    setCalculatorReplaceDisplay(true);
  }

  function calculatorEquals() {
    if (calculatorStoredValue === null || !calculatorOperation) return;
    const next = calculatePracticeValue(
      calculatorStoredValue,
      Number(calculatorDisplay),
      calculatorOperation,
    );
    setCalculatorDisplay(Number.isFinite(next) ? formatCalculatorValue(next) : "Error");
    setCalculatorStoredValue(null);
    setCalculatorOperation(null);
    setCalculatorReplaceDisplay(true);
  }

  function resetCalculator() {
    setCalculatorDisplay("0");
    setCalculatorStoredValue(null);
    setCalculatorOperation(null);
    setCalculatorReplaceDisplay(false);
  }

  async function returnToSetup() {
    await saveQueueRef.current.catch(() => undefined);
    onExit();
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4">
      <header className="sticky top-0 z-30 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 p-3 shadow-[var(--card-shadow)] backdrop-blur-xl sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => void returnToSetup()}
              disabled={saving}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:border-brand-green/50 hover:text-brand-green disabled:opacity-50"
              title="Return to setup and choose a different set"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Change set</span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)] sm:text-xs">
                {formatLabel(session.classLevel)} · {formatLabel(session.practiceMode)} practice
              </p>
              <p className="truncate text-[11px] text-[var(--text-muted)] sm:text-xs">
                {session.topic || questions[0]?.subjectName} · {answeredCount} of {questions.length}{" "}
                answered
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold tabular-nums ${timerIsLow ? "bg-red-500/10 text-red-500" : "bg-[var(--bg-secondary)] text-[var(--text-primary)]"}`}
            >
              <Clock3 size={14} /> {formatTime(secondsLeft)}
            </span>
            <span
              aria-live="polite"
              className={`hidden min-w-16 text-[10px] font-semibold sm:inline ${error ? "text-red-500" : "text-[var(--text-muted)]"}`}
            >
              {savingAnswers ? "Saving…" : error ? "Needs attention" : "Saved"}
            </span>
            <button
              type="button"
              onClick={() => setShowQuestionMap(true)}
              aria-expanded={showQuestionMap}
              aria-label="Open question map"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:border-brand-green/50 hover:text-brand-green"
            >
              <Map size={15} />
              <span className="hidden sm:inline">Questions</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCalculator(true)}
              aria-label="Open calculator"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:border-brand-green/50 hover:text-brand-green"
            >
              <Calculator size={15} />
              <span className="hidden sm:inline">Calculator</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmSubmit(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-3 py-2 text-xs font-bold text-brand-navy hover:bg-brand-orange-dark disabled:opacity-50 sm:px-4"
            >
              <Send size={14} />
              <span className="hidden sm:inline">Finish set</span>
            </button>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--surface-disabled)]">
          <div
            className="h-full rounded-full bg-brand-green transition-all"
            style={{
              width: `${questions.length ? ((questionIndex + 1) / questions.length) * 100 : 0}%`,
            }}
          />
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <article className="min-w-0 rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)] sm:p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-brand-green/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-green">
                Question {questionIndex + 1} of {questions.length}
              </span>
              <span className="max-w-full rounded-full bg-[var(--bg-secondary)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                {currentQuestion.subjectName} · {currentQuestion.topic}
              </span>
            </div>
            <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Difficulty {currentQuestion.difficulty}/3
            </span>
          </div>
          <h2 className="mt-5 whitespace-pre-line text-base font-semibold leading-relaxed text-[var(--text-primary)] sm:mt-7 sm:text-lg">
            {currentQuestion.stem}
          </h2>

          <fieldset className="mt-5 grid gap-2.5 sm:mt-7 sm:gap-3">
            <legend className="sr-only">Choose an answer</legend>
            {currentQuestion.options.map((option, optionIndex) => {
              const isSelected = selectedIndex === optionIndex;
              return (
                <label
                  key={`${currentQuestion.id}-${optionIndex}`}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm transition-colors sm:px-5 sm:py-4 ${isSelected ? "border-brand-green/60 bg-brand-green/10" : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-brand-green/40"} ${saving ? "cursor-wait opacity-70" : ""}`}
                >
                  <input
                    type="radio"
                    name={`answer-${currentQuestion.id}`}
                    value={optionIndex}
                    checked={isSelected}
                    disabled={saving || session.status !== "IN_PROGRESS"}
                    onChange={() => saveSelection(currentQuestion.id, optionIndex)}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <span className="font-bold text-brand-green">
                    {String.fromCharCode(65 + optionIndex)}.
                  </span>
                  <span className="flex-1 text-[var(--text-primary)]">{option}</span>
                </label>
              );
            })}
          </fieldset>

          {error ? (
            <p role="alert" className="mt-4 text-sm text-red-500">
              {error}
            </p>
          ) : null}

          <nav
            aria-label="Practice question navigation"
            className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4"
          >
            <button
              type="button"
              onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
              disabled={questionIndex === 0 || saving}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] disabled:opacity-40"
            >
              <ArrowLeft size={15} /> Previous
            </button>
            <span className="text-xs font-semibold tabular-nums text-[var(--text-muted)]">
              {questionIndex + 1} / {questions.length}
            </span>
            <button
              type="button"
              onClick={() => setQuestionIndex((index) => Math.min(questions.length - 1, index + 1))}
              disabled={questionIndex >= questions.length - 1 || saving}
              className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              Next <ArrowRight size={15} />
            </button>
          </nav>
        </article>

        <aside className="hidden h-fit space-y-4 xl:block">
          <QuestionMapPanel
            questions={questions}
            answers={answers}
            draftSelections={draftSelections}
            questionIndex={questionIndex}
            onSelect={setQuestionIndex}
            answeredCount={answeredCount}
          />
          <FinishPanel
            answeredCount={answeredCount}
            questionCount={questions.length}
            saving={saving}
            onSubmit={() => setConfirmSubmit(true)}
          />
        </aside>
      </div>

      {showQuestionMap ? (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setShowQuestionMap(false)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="practice-question-map-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2
                  id="practice-question-map-title"
                  className="font-display text-xl text-[var(--text-primary)]"
                >
                  Question map
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Jump to a question. Answers stay hidden until you finish.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuestionMap(false)}
                aria-label="Close question map"
                className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--surface-card-hover)]"
              >
                <X size={18} />
              </button>
            </div>
            <QuestionMapPanel
              questions={questions}
              answers={answers}
              draftSelections={draftSelections}
              questionIndex={questionIndex}
              onSelect={(index) => {
                setQuestionIndex(index);
                setShowQuestionMap(false);
              }}
              answeredCount={answeredCount}
            />
          </div>
        </div>
      ) : null}

      {showCalculator ? (
        <div
          className="fixed inset-0 z-[145] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setShowCalculator(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="practice-calculator-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator size={18} className="text-brand-green" />
                <h2
                  id="practice-calculator-title"
                  className="font-display text-xl text-[var(--text-primary)]"
                >
                  Calculator
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCalculator(false)}
                aria-label="Close calculator"
                className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--surface-card-hover)]"
              >
                <X size={18} />
              </button>
            </div>
            <output
              aria-live="polite"
              className="mb-3 flex h-16 items-center justify-end overflow-hidden rounded-2xl bg-[var(--bg-secondary)] px-4 font-mono text-2xl font-bold text-[var(--text-primary)]"
            >
              {calculatorDisplay}
            </output>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "AC", action: resetCalculator, style: "text-brand-orange" },
                {
                  label: "±",
                  action: () =>
                    setCalculatorDisplay((value) =>
                      value === "0" || value === "Error" ? value : String(-Number(value)),
                    ),
                  style: "",
                },
                {
                  label: "%",
                  action: () =>
                    setCalculatorDisplay((value) =>
                      Number.isFinite(Number(value))
                        ? formatCalculatorValue(Number(value) / 100)
                        : "Error",
                    ),
                  style: "",
                },
                { label: "÷", action: () => calculatorOperator("÷"), style: "text-brand-green" },
                ...["7", "8", "9"].map((label) => ({
                  label,
                  action: () => calculatorDigit(label),
                  style: "",
                })),
                { label: "×", action: () => calculatorOperator("×"), style: "text-brand-green" },
                ...["4", "5", "6"].map((label) => ({
                  label,
                  action: () => calculatorDigit(label),
                  style: "",
                })),
                { label: "−", action: () => calculatorOperator("−"), style: "text-brand-green" },
                ...["1", "2", "3"].map((label) => ({
                  label,
                  action: () => calculatorDigit(label),
                  style: "",
                })),
                { label: "+", action: () => calculatorOperator("+"), style: "text-brand-green" },
                { label: "0", action: () => calculatorDigit("0"), style: "col-span-2" },
                { label: ".", action: calculatorDecimal, style: "" },
                { label: "=", action: calculatorEquals, style: "bg-brand-green text-brand-navy" },
              ].map((key) => (
                <button
                  key={key.label}
                  type="button"
                  onClick={key.action}
                  className={`min-h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] text-sm font-bold text-[var(--text-primary)] hover:border-brand-green/40 ${key.style}`}
                >
                  {key.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmSubmit}
        title="Finish this practice set?"
        message={`You have answered ${answeredCount} of ${questions.length} questions. Your answers and explanations will be revealed after you submit.`}
        confirmText="Submit and review"
        cancelText="Keep practising"
        variant="warning"
        busy={saving}
        onConfirm={() => {
          setConfirmSubmit(false);
          void submit(false);
        }}
        onCancel={() => setConfirmSubmit(false)}
      />
    </section>
  );
}
