import type { ReactNode } from "react";
import { BookOpen, Medal, Star, Trophy, Users } from "lucide-react";
import type { LeaderboardCategory, LeaderboardScope, Standing } from "@/lib/leaderboards";

export type LeaderboardSubjectOption = { id: string; name: string };

type Props = {
  category: LeaderboardCategory;
  onCategoryChange: (_value: LeaderboardCategory) => void;
  scope: LeaderboardScope;
  onScopeChange: (_value: LeaderboardScope) => void;
  subjectOptions: LeaderboardSubjectOption[];
  selectedSubjectId: string;
  onSubjectChange: (_value: string) => void;
  className: string;
  periodLabel: string;
  cohortSize: number;
  myRank: number | null;
  myStars: number | null;
  topStandings: Standing[];
  loading: boolean;
  error: string;
  childSelector?: ReactNode;
};

const CATEGORY_LABELS: Array<{ value: LeaderboardCategory; label: string }> = [
  { value: "CA", label: "CA tests" },
  { value: "EXAM", label: "Exams" },
  { value: "OVERALL", label: "Overall" },
];

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${count} stars`}>
      {Array.from({ length: count }, (_, index) => (
        <Star key={index} size={14} fill="currentColor" aria-hidden="true" />
      ))}
    </span>
  );
}

export default function LeaderboardView({
  category,
  onCategoryChange,
  scope,
  onScopeChange,
  subjectOptions,
  selectedSubjectId,
  onSubjectChange,
  className,
  periodLabel,
  cohortSize,
  myRank,
  myStars,
  topStandings,
  loading,
  error,
  childSelector,
}: Props) {
  return (
    <div className="min-w-0 flex-1 space-y-6">
      {childSelector}

      <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] md:p-7">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.3fr]">
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Assessment
            </span>
            <select
              aria-label="Leaderboard assessment"
              value={category}
              onChange={(event) => onCategoryChange(event.target.value as LeaderboardCategory)}
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)]"
            >
              {CATEGORY_LABELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Cohort
            </span>
            <select
              aria-label="Leaderboard cohort"
              value={scope}
              onChange={(event) => onScopeChange(event.target.value as LeaderboardScope)}
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)]"
            >
              <option value="CLASS">My class</option>
              <option value="SUBJECT" disabled={!subjectOptions.length}>
                My subject cohort
              </option>
            </select>
          </label>

          {scope === "SUBJECT" ? (
            <label className="block">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Subject
              </span>
              <select
                aria-label="Leaderboard subject"
                value={selectedSubjectId}
                onChange={(event) => onSubjectChange(event.target.value)}
                disabled={!subjectOptions.length}
                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)] disabled:opacity-50"
              >
                {subjectOptions.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="flex items-end gap-2 rounded-xl bg-[var(--bg-secondary)] px-4 py-3 text-xs text-[var(--text-muted)]">
              <BookOpen size={15} className="text-brand-green" />
              {className} · {periodLabel}
            </div>
          )}
        </div>

        {scope === "SUBJECT" ? (
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {className} · {periodLabel}
          </p>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-600"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-sm text-[var(--text-muted)]">
          Loading released standings…
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <section className="rounded-[2rem] border border-brand-green/30 bg-gradient-to-br from-brand-green/10 via-[var(--surface-card)] to-[var(--surface-card)] p-7 shadow-[var(--card-shadow)] md:p-9">
            <div className="flex items-center gap-2 text-brand-green">
              <Trophy size={18} />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Your standing</p>
            </div>
            {myRank === null ? (
              <div className="mt-7">
                <p className="font-display text-3xl tracking-wide text-[var(--text-primary)]">
                  No rank yet
                </p>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--text-muted)]">
                  Rankings appear after at least one CA test or exam has been closed, graded and
                  released for this cohort.
                </p>
              </div>
            ) : (
              <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-display text-6xl leading-none text-[var(--text-primary)]">
                    #{myRank}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-widest text-[var(--text-muted)]">
                    of {cohortSize} ranked learner{cohortSize === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
                  <Stars count={myStars ?? 1} />
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Star standing
                  </p>
                </div>
              </div>
            )}
            <p className="mt-7 text-xs leading-relaxed text-[var(--text-muted)]">
              {category === "CA"
                ? "CA standings use released CA tests."
                : category === "EXAM"
                  ? "Exam standings use released midterm and terminal exams."
                  : "Overall standings combine released CA, midterm and terminal assessments."}{" "}
              Only closed, graded and released results count.
            </p>
          </section>

          <section className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)] md:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  Cohort standings
                </p>
                <h2 className="mt-1 font-display text-2xl text-[var(--text-primary)]">
                  {scope === "CLASS" ? "Class" : "Subject"} stars
                </h2>
              </div>
              <Users size={18} className="text-brand-green" />
            </div>
            {topStandings.length ? (
              <ol className="mt-5 space-y-2">
                {topStandings.map((standing) => (
                  <li
                    key={standing.rank}
                    className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      Rank #{standing.rank}
                    </span>
                    <Stars count={standing.stars} />
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-5 rounded-xl bg-[var(--bg-secondary)] p-5 text-sm text-[var(--text-muted)]">
                No released results are available for this cohort yet.
              </div>
            )}
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
              <Medal size={14} className="mt-0.5 shrink-0 text-brand-orange" />
              Other learners remain anonymous. No names, raw marks or percentages are shared here.
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
