"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Clock3,
  History,
  LoaderCircle,
  RefreshCw,
  Target,
  Trophy,
} from "lucide-react";

type HistoryItem = {
  id: string;
  classLevel: string | null;
  practiceMode: string | null;
  topic: string | null;
  term: string | null;
  subjectNames: string[];
  total: number;
  correct: number;
  skipped: number;
  scorePct: number;
  durationSeconds: number;
  isTimed: boolean;
  completedAt: string;
};

type HistoryPayload = {
  items: HistoryItem[];
  summary: {
    attempts: number;
    averageScorePct: number;
    bestScorePct: number;
    questions: number;
    correct: number;
    practiceSeconds: number;
  };
  pagination: { page: number; pageSize: number; total: number; pages: number };
  error?: string;
};

type Props = { onReview: (_attemptId: string) => void };
type Period = "all" | "30" | "90" | "365";
type ClassFilter = "all" | "jss1" | "jss2" | "jss3" | "ss1" | "ss2" | "ss3";
type ModeFilter = "all" | "topic" | "subject" | "mixed";

const classOptions: Array<{ value: ClassFilter; label: string }> = [
  { value: "all", label: "All classes" },
  { value: "jss1", label: "JSS 1" },
  { value: "jss2", label: "JSS 2" },
  { value: "jss3", label: "JSS 3" },
  { value: "ss1", label: "SS 1" },
  { value: "ss2", label: "SS 2" },
  { value: "ss3", label: "SS 3" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatClass(value: string | null) {
  return value ? value.replace(/(\D)(\d)$/, "$1 $2").toUpperCase() : "Class not recorded";
}

function modeName(mode: string | null) {
  if (mode === "topic") return "Topic focus";
  if (mode === "mixed") return "Mixed practice";
  if (mode === "subject") return "Subject focus";
  return "Personal practice";
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof History;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {label}
        </span>
        <span className="rounded-xl bg-brand-green/10 p-2 text-brand-green">
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl leading-none text-[var(--text-primary)]">{value}</p>
      <p className="mt-2 text-xs text-[var(--text-muted)]">{detail}</p>
    </article>
  );
}

export default function PersonalPracticeHistory({ onReview }: Props) {
  const [page, setPage] = useState(1);
  const [classLevel, setClassLevel] = useState<ClassFilter>("all");
  const [practiceMode, setPracticeMode] = useState<ModeFilter>("all");
  const [period, setPeriod] = useState<Period>("all");
  const [payload, setPayload] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestControllerRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async () => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setLoading(true);
    setError("");
    const query = new URLSearchParams({
      page: String(page),
      classLevel,
      practiceMode,
      period,
    });
    try {
      const response = await fetch(`/api/cbt/history?${query.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = (await response.json()) as HistoryPayload;
      if (!response.ok) throw new Error(data.error || "Unable to load your practice history.");
      setPayload(data);
      if (data.pagination.page !== page) setPage(data.pagination.page);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load your practice history.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [classLevel, page, practiceMode, period]);

  useEffect(() => {
    // Synchronize the list with the selected server-side filters and page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHistory();
    return () => requestControllerRef.current?.abort();
  }, [loadHistory]);

  const updateFilter = (update: () => void) => {
    update();
    setPage(1);
  };
  const summary = payload?.summary;
  const hasFilters = classLevel !== "all" || practiceMode !== "all" || period !== "all";

  return (
    <section aria-labelledby="practice-history-heading" className="space-y-6">
      <header className="rounded-[1.8rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
              Your progress, at a glance
            </p>
            <h2
              id="practice-history-heading"
              className="mt-2 font-display text-3xl text-[var(--text-primary)] sm:text-4xl"
            >
              Practice history
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
              Review completed sets, track your scores over time, and revisit explanations whenever
              you need a refresher.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadHistory()}
            disabled={loading}
            aria-label="Refresh practice history"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)] transition hover:border-brand-green/40 hover:text-brand-green disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Completed sets"
          value={summary ? summary.attempts.toLocaleString() : "—"}
          detail="Matches your selected filters"
          icon={History}
        />
        <StatCard
          label="Average score"
          value={summary ? `${summary.averageScorePct}%` : "—"}
          detail={
            summary
              ? `${summary.correct.toLocaleString()} correct answers total`
              : "Across completed sets"
          }
          icon={Target}
        />
        <StatCard
          label="Personal best"
          value={summary ? `${summary.bestScorePct}%` : "—"}
          detail={
            summary
              ? `${summary.questions.toLocaleString()} questions practised`
              : "Your highest set score"
          }
          icon={Trophy}
        />
        <StatCard
          label="Practice time"
          value={summary ? formatDuration(summary.practiceSeconds) : "—"}
          detail="Total time in completed sets"
          icon={Clock3}
        />
      </div>

      <div className="rounded-[1.6rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)] sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-xl text-[var(--text-primary)]">Completed sets</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {payload
                ? `${payload.pagination.total.toLocaleString()} result${payload.pagination.total === 1 ? "" : "s"}`
                : "Loading results…"}
            </p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Class
              <select
                value={classLevel}
                onChange={(event) =>
                  updateFilter(() => setClassLevel(event.target.value as ClassFilter))
                }
                className="mt-1 block min-w-32 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-[var(--input-text)]"
              >
                {classOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Practice type
              <select
                value={practiceMode}
                onChange={(event) =>
                  updateFilter(() => setPracticeMode(event.target.value as ModeFilter))
                }
                className="mt-1 block min-w-36 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-[var(--input-text)]"
              >
                <option value="all">All types</option>
                <option value="topic">Topic focus</option>
                <option value="subject">Subject focus</option>
                <option value="mixed">Mixed practice</option>
              </select>
            </label>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Time range
              <select
                value={period}
                onChange={(event) => updateFilter(() => setPeriod(event.target.value as Period))}
                className="mt-1 block min-w-36 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-[var(--input-text)]"
              >
                <option value="all">Any time</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/5 p-4" role="alert">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="mt-3 rounded-full bg-brand-navy px-4 py-2 text-xs font-bold text-white"
            >
              Try again
            </button>
          </div>
        ) : loading && !payload ? (
          <div
            className="flex items-center justify-center gap-3 py-16 text-sm text-[var(--text-muted)]"
            role="status"
          >
            <LoaderCircle size={20} className="animate-spin text-brand-green" /> Loading your sets…
          </div>
        ) : payload?.items.length ? (
          <div className={`mt-4 space-y-3 ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            {payload.items.map((item) => {
              const incorrect = Math.max(0, item.total - item.correct - item.skipped);
              const scoreColor =
                item.scorePct >= 80
                  ? "bg-brand-green/10 text-brand-green"
                  : item.scorePct >= 60
                    ? "bg-brand-orange/15 text-brand-orange"
                    : "bg-red-500/10 text-red-500";
              return (
                <article
                  key={item.id}
                  className="grid gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-[var(--text-primary)]">
                        {item.topic ||
                          (item.subjectNames.length
                            ? item.subjectNames.join(", ")
                            : "Personal practice")}
                      </h4>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${scoreColor}`}
                      >
                        {item.scorePct}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {formatClass(item.classLevel)} · {modeName(item.practiceMode)}
                      {item.subjectNames.length ? ` · ${item.subjectNames.join(", ")}` : ""}
                      {item.term ? ` · ${item.term} term` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-secondary)]">
                      <span>
                        {item.correct}/{item.total} correct
                      </span>
                      <span>{incorrect} to review</span>
                      <span>{item.skipped} skipped</span>
                      <span>{formatDuration(item.durationSeconds)}</span>
                      <span>{item.isTimed ? "Timed" : "Untimed"}</span>
                      <time dateTime={item.completedAt}>{formatDate(item.completedAt)}</time>
                    </div>
                    <div
                      className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]"
                      role="progressbar"
                      aria-label={`${item.scorePct}% score`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={item.scorePct}
                    >
                      <div
                        className={`h-full rounded-full ${item.scorePct >= 60 ? "bg-brand-green" : "bg-red-500"}`}
                        style={{ width: `${Math.max(0, Math.min(100, item.scorePct))}%` }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onReview(item.id)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-navy px-5 py-2.5 text-xs font-bold text-white transition hover:bg-brand-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
                  >
                    <BookOpenCheck size={15} /> Review answers
                  </button>
                </article>
              );
            })}
          </div>
        ) : !loading ? (
          <div className="my-4 rounded-2xl border border-dashed border-[var(--border-subtle)] px-5 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green">
              <History size={22} />
            </span>
            <h4 className="mt-4 font-display text-xl text-[var(--text-primary)]">
              {hasFilters ? "No sets match these filters" : "Your story starts here"}
            </h4>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--text-muted)]">
              {hasFilters
                ? "Try a different class, practice type, or time range to find your completed sets."
                : "Complete your first personal practice set and you’ll find scores, progress, and answer explanations here."}
            </p>
          </div>
        ) : null}

        {payload && payload.pagination.pages > 1 ? (
          <nav
            aria-label="Practice history pages"
            className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4"
          >
            <button
              type="button"
              disabled={payload.pagination.page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] disabled:opacity-40"
            >
              <ArrowLeft size={14} /> Previous
            </button>
            <span className="text-xs text-[var(--text-muted)]">
              Page {payload.pagination.page} of {payload.pagination.pages}
            </span>
            <button
              type="button"
              disabled={payload.pagination.page >= payload.pagination.pages || loading}
              onClick={() => setPage((value) => Math.min(payload.pagination.pages, value + 1))}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] disabled:opacity-40"
            >
              Next <ArrowRight size={14} />
            </button>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
