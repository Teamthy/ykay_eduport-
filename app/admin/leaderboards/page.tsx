"use client";

import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import PortalTopbar from "@/components/PortalTopbar";
import { readJsonResponse } from "@/lib/api-response";
import type { LeaderboardCategory, LeaderboardScope } from "@/lib/leaderboards";
import { LoaderCircle, Medal, Star, Trophy, Users } from "lucide-react";

type Learner = {
  id: string;
  studentId: string;
  displayName: string;
  rank: number;
  stars: number;
};

type AdminLeaderboardData = {
  classroom: { id: string; displayName: string; level: string };
  classOptions: Array<{ id: string; displayName: string; level: string }>;
  periodLabel: string;
  subjectOptions: Array<{ id: string; name: string }>;
  selectedSubject: { id: string; name: string } | null;
  cohortSize: number;
  learners: Learner[];
};

type ApiPayload = AdminLeaderboardData & { error?: string };

const CATEGORIES: Array<{ value: LeaderboardCategory; label: string }> = [
  { value: "CA", label: "CA tests" },
  { value: "EXAM", label: "Exams" },
  { value: "OVERALL", label: "Overall" },
];

function StarRating({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${count} stars`}>
      {Array.from({ length: count }, (_, index) => (
        <Star key={index} size={14} fill="currentColor" aria-hidden="true" />
      ))}
    </span>
  );
}

export default function AdminLeaderboardsPage() {
  const [category, setCategory] = useState<LeaderboardCategory>("OVERALL");
  const [scope, setScope] = useState<LeaderboardScope>("CLASS");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [data, setData] = useState<AdminLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const url = useMemo(() => {
    const params = new URLSearchParams({ category, scope });
    if (classId) params.set("classId", classId);
    if (subjectId) params.set("subjectId", subjectId);
    return `/api/admin/leaderboards?${params.toString()}`;
  }, [category, scope, classId, subjectId]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readJsonResponse<ApiPayload>(response);
        if (!response.ok) throw new Error(payload.error || "Unable to load school standings.");
        if (controller.signal.aborted) return;
        setData(payload);
        if (!classId && payload.classroom?.id) setClassId(payload.classroom.id);
        if (payload.selectedSubject?.id && payload.selectedSubject.id !== subjectId) {
          setSubjectId(payload.selectedSubject.id);
        }
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setData(null);
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load school standings.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [url, classId, subjectId]);

  const classOptions = data?.classOptions ?? [];
  const subjectOptions = data?.subjectOptions ?? [];

  return (
    <>
      <PortalTopbar title="School leaderboards" />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-4 pb-10 pt-24 text-white sm:px-6 sm:pb-14 sm:pt-28">
          <div className="w-full">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-green/40 bg-brand-green/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
              <Trophy size={12} /> Academic performance
            </span>
            <h1 className="font-display text-3xl tracking-widest text-white sm:text-5xl md:text-6xl">
              SCHOOL <span className="text-brand-green">LEADERBOARDS</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/75">
              Compare active learners using only assessments that are closed, graded and released.
              Scores and percentages are not shown here.
            </p>
          </div>
        </section>

        <section className="px-4 py-6 sm:px-6 sm:py-10">
          <div className="w-full flex flex-col gap-6 lg:flex-row lg:gap-8">
            <AdminSidebar />
            <div className="min-w-0 flex-1 space-y-6">
              <div className="rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] sm:rounded-[2rem] sm:p-7">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      Assessment
                    </span>
                    <select
                      aria-label="Leaderboard assessment"
                      value={category}
                      onChange={(event) => setCategory(event.target.value as LeaderboardCategory)}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)]"
                    >
                      {CATEGORIES.map((option) => (
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
                      onChange={(event) => {
                        setScope(event.target.value as LeaderboardScope);
                        setSubjectId("");
                      }}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)]"
                    >
                      <option value="CLASS">Class</option>
                      <option value="SUBJECT" disabled={!subjectOptions.length}>
                        Subject
                      </option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      Class
                    </span>
                    <select
                      aria-label="Leaderboard class"
                      value={classId || data?.classroom.id || ""}
                      onChange={(event) => {
                        setClassId(event.target.value);
                        setSubjectId("");
                      }}
                      disabled={!classOptions.length}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)] disabled:opacity-50"
                    >
                      {classOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.displayName}
                        </option>
                      ))}
                    </select>
                  </label>

                  {scope === "SUBJECT" ? (
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        Subject
                      </span>
                      <select
                        aria-label="Leaderboard subject"
                        value={subjectId || data?.selectedSubject?.id || ""}
                        onChange={(event) => setSubjectId(event.target.value)}
                        disabled={!subjectOptions.length}
                        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)] disabled:opacity-50"
                      >
                        {subjectOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="flex items-end">
                      <p className="w-full rounded-xl bg-[var(--bg-secondary)] px-4 py-3 text-xs text-[var(--text-muted)]">
                        {data?.periodLabel || "Current term"}
                      </p>
                    </div>
                  )}
                </div>
                {scope === "SUBJECT" ? (
                  <p className="mt-3 text-xs text-[var(--text-muted)]">{data?.periodLabel}</p>
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
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-sm text-[var(--text-muted)]">
                  <LoaderCircle className="animate-spin text-brand-green" size={18} /> Loading
                  released standings…
                </div>
              ) : null}

              {!loading && !error && data ? (
                <section className="overflow-hidden rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--card-shadow)] sm:rounded-[2rem]">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] p-5 sm:p-7">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        {data.classroom.displayName} ·{" "}
                        {scope === "CLASS" ? "class standings" : data.selectedSubject?.name}
                      </p>
                      <h2 className="mt-1 font-display text-2xl text-[var(--text-primary)] sm:text-3xl">
                        {data.cohortSize} ranked learner{data.cohortSize === 1 ? "" : "s"}
                      </h2>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-brand-green/10 px-4 py-2 text-xs font-bold text-brand-green">
                      <Users size={15} /> Active cohort
                    </div>
                  </div>

                  {data.learners.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[620px] text-left text-sm">
                        <thead className="bg-[var(--bg-secondary)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                          <tr>
                            <th className="px-5 py-3 font-bold sm:px-7">Rank</th>
                            <th className="px-5 py-3 font-bold">Learner</th>
                            <th className="px-5 py-3 font-bold">Student ID</th>
                            <th className="px-5 py-3 font-bold">Stars</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                          {data.learners.map((learner) => (
                            <tr key={learner.id} className="hover:bg-[var(--bg-secondary)]/60">
                              <td className="px-5 py-4 font-display text-lg text-[var(--text-primary)] sm:px-7">
                                #{learner.rank}
                              </td>
                              <td className="px-5 py-4 font-semibold text-[var(--text-primary)]">
                                {learner.displayName}
                              </td>
                              <td className="px-5 py-4 text-[var(--text-muted)]">
                                {learner.studentId}
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-flex items-center gap-2">
                                  <StarRating count={learner.stars} />
                                  <span className="text-xs text-[var(--text-muted)]">
                                    {learner.stars}/5
                                  </span>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-sm text-[var(--text-muted)]">
                      <div className="flex items-center gap-3 font-semibold text-[var(--text-primary)]">
                        <Medal className="text-brand-green" size={20} /> No released standings yet
                      </div>
                      <p className="mt-2 max-w-2xl leading-relaxed">
                        {scope === "SUBJECT" && !data.subjectOptions.length
                          ? "No active subjects are configured for this class level yet. Choose another class or add subjects in the school setup."
                          : "This cohort will appear after at least one assessment is closed, graded and released for the selected term."}
                      </p>
                    </div>
                  )}
                </section>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
