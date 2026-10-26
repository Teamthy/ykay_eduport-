"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PortalTopbar from "@/components/PortalTopbar";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  Clock3,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type SubjectRow = {
  name: string;
  slug: string;
  classLevel: string;
  total: number;
  draft: number;
  reviewed: number;
  archived: number;
  eligibleForPractice: number;
};

type BankStatus = {
  readiness: "EMPTY" | "NEEDS_REVIEW" | "READY";
  counts: {
    total: number;
    draft: number;
    reviewed: number;
    archived: number;
    eligibleForPractice: number;
  };
  practiceAttemptsLast30Days: number;
  byClassLevel: Array<{
    classLevel: string;
    subjects: number;
    total: number;
    eligibleForPractice: number;
  }>;
  subjects: SubjectRow[];
  studentPracticePath: string;
  adminReviewPath: string;
  updatedAt: string;
};

const SEED_WORKFLOW =
  "https://github.com/Teamthy/ykay_eduport-/actions/workflows/seed-cbt-bank-staging.yml";

const LEVEL_LABELS: Record<string, string> = {
  jss1: "JSS 1",
  jss2: "JSS 2",
  jss3: "JSS 3",
  ss1: "SS 1",
  ss2: "SS 2",
  ss3: "SS 3",
};

function count(value: number) {
  return value.toLocaleString("en-NG");
}

function ReadinessBadge({ readiness }: { readiness: BankStatus["readiness"] }) {
  const ready = readiness === "READY";
  const title =
    readiness === "READY"
      ? "Student practice has eligible reviewed questions"
      : readiness === "NEEDS_REVIEW"
        ? "Questions exist, but none are eligible for student practice"
        : "No questions are loaded in this database";
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
        ready ? "bg-brand-green/15 text-brand-green" : "bg-brand-orange/15 text-brand-orange"
      }`}
    >
      {ready ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
      {readiness.replaceAll("_", " ")}
    </span>
  );
}

export default function SuperAdminQuestionBankPage() {
  const [data, setData] = useState<BankStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/super-admin/question-bank", { cache: "no-store" });
      const payload = (await response.json()) as BankStatus & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to load question-bank status.");
      setData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load question-bank status.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Fetch is asynchronous; the helper owns loading state around the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data?.subjects ?? [];
    return (data?.subjects ?? []).filter((subject) =>
      `${subject.classLevel} ${subject.name} ${subject.slug}`.toLowerCase().includes(query),
    );
  }, [data?.subjects, search]);

  const readySubjects =
    data?.subjects.filter((subject) => subject.eligibleForPractice > 0).length ?? 0;

  return (
    <>
      <PortalTopbar title="Question bank operations" />
      <main className="w-full space-y-6 px-4 py-7 sm:px-6 xl:px-8">
        <section className="rounded-[2rem] bg-brand-navy p-6 text-white md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/35 bg-brand-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
                <BookOpenCheck size={13} /> CBT bank · shared content
              </span>
              <h1 className="mt-4 font-display text-4xl tracking-widest md:text-5xl">
                QUESTION <span className="text-brand-green">BANK OPS</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                Live counts for the question bank and the exact number of attested questions the
                student practice API can serve. This page is read-only; use the review console to
                make content changes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh counts
            </button>
          </div>
        </section>

        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-[var(--text-primary)]"
          >
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-sm text-[var(--text-secondary)]">
            <LoaderCircle size={18} className="animate-spin text-brand-green" /> Reading bank
            counts…
          </div>
        ) : null}

        {data ? (
          <>
            <section
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
              aria-label="Question bank totals"
            >
              {[
                { label: "Total questions", value: data.counts.total, icon: BookOpenCheck },
                {
                  label: "Draft · not available to students",
                  value: data.counts.draft,
                  icon: Clock3,
                },
                { label: "Marked reviewed", value: data.counts.reviewed, icon: ShieldCheck },
                {
                  label: "Eligible for practice",
                  value: data.counts.eligibleForPractice,
                  icon: CheckCircle2,
                },
                { label: "Archived", value: data.counts.archived, icon: XCircle },
              ].map((metric) => (
                <article
                  key={metric.label}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)]"
                >
                  <metric.icon size={18} className="text-brand-green" />
                  <p className="mt-4 font-display text-3xl text-[var(--text-primary)]">
                    {loading ? "…" : count(metric.value)}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {metric.label}
                  </p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
              <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl text-[var(--text-primary)]">
                      Practice coverage
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Questions grouped by class level; only eligible reviewed items count toward
                      student access.
                    </p>
                  </div>
                  <ReadinessBadge readiness={data.readiness} />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {data.byClassLevel.map((level) => {
                    const label = LEVEL_LABELS[level.classLevel] ?? level.classLevel.toUpperCase();
                    const percent = level.total
                      ? Math.round((level.eligibleForPractice / level.total) * 100)
                      : 0;
                    return (
                      <div
                        key={level.classLevel}
                        className="rounded-xl bg-[var(--surface-disabled)] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-display text-lg text-[var(--text-primary)]">
                            {label}
                          </span>
                          <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                            {level.subjects} subjects
                          </span>
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-2">
                          <span className="font-display text-2xl text-brand-green">
                            {count(level.eligibleForPractice)}
                          </span>
                          <span className="text-right text-[10px] text-[var(--text-muted)]">
                            eligible of {count(level.total)} loaded
                          </span>
                        </div>
                        <div
                          className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-card)]"
                          role="progressbar"
                          aria-label={`${label} reviewed practice coverage`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={percent}
                        >
                          <div
                            className="h-full rounded-full bg-brand-green"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {!data.byClassLevel.length ? (
                    <p className="rounded-xl bg-[var(--surface-disabled)] p-5 text-sm text-[var(--text-muted)]">
                      No class-level subjects are defined in this database.
                    </p>
                  ) : null}
                </div>
              </article>

              <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] md:p-6">
                <h2 className="font-display text-2xl text-[var(--text-primary)]">Availability</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Current database truth, not a seed-file estimate.
                </p>
                <div className="mt-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-disabled)] p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                    {data.readiness === "READY" ? (
                      <CheckCircle2 size={16} className="text-brand-green" />
                    ) : (
                      <AlertTriangle size={16} className="text-brand-orange" />
                    )}
                    {data.readiness === "EMPTY"
                      ? "This database has no questions"
                      : data.readiness === "NEEDS_REVIEW"
                        ? "Questions exist but are not available yet"
                        : `${count(data.counts.eligibleForPractice)} questions are available to practice`}
                  </div>
                  {data.readiness === "NEEDS_REVIEW" ? (
                    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                      {count(data.counts.draft)} draft question(s) need review. The student API
                      intentionally excludes them until reviewed with a reviewer and citation.
                    </p>
                  ) : null}
                  {data.readiness === "EMPTY" ? (
                    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                      Run the protected Staging seed-and-attest workflow after its environment and
                      target variables are configured.
                    </p>
                  ) : null}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-[var(--surface-disabled)] p-3">
                    <dt className="text-[var(--text-muted)]">Subjects with practice questions</dt>
                    <dd className="mt-1 font-bold text-[var(--text-primary)]">
                      {readySubjects} / {data.subjects.length}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-disabled)] p-3">
                    <dt className="text-[var(--text-muted)]">Practice attempts · 30 days</dt>
                    <dd className="mt-1 font-bold text-[var(--text-primary)]">
                      {count(data.practiceAttemptsLast30Days)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-[10px] text-[var(--text-muted)]">
                  Updated {new Date(data.updatedAt).toLocaleString()}
                </p>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl text-[var(--text-primary)]">
                      Subject inventory
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Draft, reviewed and actually practice-eligible counts per subject.
                    </p>
                  </div>
                  <label className="relative block w-full sm:w-64">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Find class or subject"
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-2.5 pl-9 pr-3 text-sm text-[var(--input-text)]"
                    />
                  </label>
                </div>
                <div className="mt-4 max-h-[32rem] overflow-auto rounded-xl border border-[var(--border-subtle)]">
                  <table className="w-full min-w-[650px] text-left text-xs">
                    <thead className="sticky top-0 bg-[var(--surface-disabled)] text-[9px] uppercase tracking-widest text-[var(--text-muted)]">
                      <tr>
                        <th className="p-3">Class / subject</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-right">Draft</th>
                        <th className="p-3 text-right">Reviewed</th>
                        <th className="p-3 text-right">Eligible</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjects.map((subject) => (
                        <tr key={subject.slug} className="border-t border-[var(--border-subtle)]">
                          <td className="p-3">
                            <span className="font-bold text-[var(--text-primary)]">
                              {subject.name}
                            </span>
                            <span className="ml-2 text-[var(--text-muted)]">
                              {LEVEL_LABELS[subject.classLevel] ?? subject.classLevel.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-right text-[var(--text-secondary)]">
                            {count(subject.total)}
                          </td>
                          <td className="p-3 text-right text-brand-orange">
                            {count(subject.draft)}
                          </td>
                          <td className="p-3 text-right text-[var(--text-secondary)]">
                            {count(subject.reviewed)}
                          </td>
                          <td className="p-3 text-right font-bold text-brand-green">
                            {count(subject.eligibleForPractice)}
                          </td>
                        </tr>
                      ))}
                      {!filteredSubjects.length ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-[var(--text-muted)]">
                            {data.subjects.length
                              ? "No subjects match this search."
                              : "No subjects are loaded."}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-2xl border border-brand-green/25 bg-brand-green/5 p-5 shadow-[var(--card-shadow)] md:p-6">
                <div className="flex items-center gap-2">
                  <CircleHelp size={17} className="text-brand-green" />
                  <h2 className="font-display text-2xl text-[var(--text-primary)]">
                    Make the 10k available
                  </h2>
                </div>
                <ol className="mt-4 space-y-3 text-xs leading-5 text-[var(--text-secondary)]">
                  <li>
                    <strong className="text-[var(--text-primary)]">1 · Configure GitHub.</strong>{" "}
                    Create the protected `staging-seeds` environment. Add secret
                    `STAGING_DIRECT_DATABASE_URL` (direct, unpooled Neon Staging URL) and variables
                    `STAGING_DATABASE_HOST`, `PRODUCTION_DATABASE_STATUS`, and
                    `PRODUCTION_DATABASE_HOST`.
                  </li>
                  <li>
                    <strong className="text-[var(--text-primary)]">
                      2 · Run the workflow on `main`.
                    </strong>{" "}
                    Select `seed-and-attest`, bank file `cbt-bank-10k-draft.csv`, confirmation `SEED
                    STAGING`, the active reviewer’s account email, and the source reference used to
                    check the bank.
                  </li>
                  <li>
                    <strong className="text-[var(--text-primary)]">3 · Verify availability.</strong>{" "}
                    Wait for a successful run, refresh these counts, and confirm the expected
                    subjects have an eligible count. The reviewer email must belong to an active
                    SUPER_ADMIN, ADMIN, DIRECTOR or HOD account; the cited source reference must be
                    at least 10 characters. Students practise at Personal Practice.
                  </li>
                </ol>
                <p className="mt-4 rounded-xl border border-brand-orange/25 bg-brand-orange/10 p-3 text-[11px] leading-5 text-[var(--text-secondary)]">
                  This workflow is Staging-only and validates the database host against the
                  configured Staging host and Production host before writing. Do not point a public
                  deployment at the Staging branch.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href={SEED_WORKFLOW}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-brand-green px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-brand-navy"
                  >
                    Open Staging seed workflow <ExternalLink size={12} />
                  </a>
                  <Link
                    href="/admin/cbt-bank"
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)]"
                  >
                    Review questions <ArrowUpRight size={12} />
                  </Link>
                  <Link
                    href="/student/personal-practice"
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)]"
                  >
                    Student practice route <ArrowUpRight size={12} />
                  </Link>
                </div>
              </article>
            </section>
          </>
        ) : null}
      </main>
    </>
  );
}
