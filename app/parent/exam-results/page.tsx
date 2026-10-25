"use client";

import { useCallback, useEffect, useState } from "react";
import PortalTopbar from "@/components/PortalTopbar";
import PortalSidebar from "@/components/PortalSidebar";
import { PARENT_SIDEBAR_ITEMS } from "@/components/parent/sidebarItems";
import { Award, FileText, LoaderCircle, History } from "lucide-react";

type ExamResult = {
  id: string;
  examId: string;
  title: string;
  subjectName: string;
  teacherName: string;
  examType: string;
  className: string;
  isHistoricalClass: boolean;
  sessionLabel: string;
  termLabel: string;
  score: number;
  total: number;
  percent: number;
  attemptNumber: number;
  submittedAt: string | null;
};

type ResultsResponse = {
  parent: { displayName: string };
  children: Array<{
    id: string;
    studentId: string;
    displayName: string;
    className: string;
    relationship?: string | null;
    isPrimary: boolean;
  }>;
  selectedChild: {
    id: string;
    studentId: string;
    displayName: string;
    className: string;
    relationship?: string | null;
    isPrimary: boolean;
  } | null;
  results: ExamResult[];
};

const SIDEBAR_ITEMS = PARENT_SIDEBAR_ITEMS;

export default function ParentExamResultsPage() {
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadResults = useCallback(async (studentId?: string) => {
    const params = new URLSearchParams();
    if (studentId) params.set("studentId", studentId);
    try {
      const response = await fetch(`/api/parent/exam-results?${params.toString()}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as ResultsResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load released exam results.");
      setData(body);
      if (body.selectedChild?.id) setSelectedStudentId(body.selectedChild.id);
    } catch (loadError) {
      setData(null);
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load released exam results.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The async helper awaits fetch before changing React state; this is not a synchronous effect update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadResults();
  }, [loadResults]);

  return (
    <>
      <PortalTopbar />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pb-10 pt-24">
          <div className="w-full">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-green/40 bg-brand-green/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
              <Award size={12} /> Assessment history
            </span>
            <h1 className="font-display text-4xl tracking-widest text-white md:text-5xl">
              EXAM <span className="text-brand-green">RESULTS</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/60">
              Released, fully graded assessment results remain available here even after your child
              changes class.
            </p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="w-full flex flex-col gap-8 lg:flex-row">
            <PortalSidebar portalName="Parent" portalType="parent" items={SIDEBAR_ITEMS} />
            <div className="min-w-0 flex-1 space-y-6">
              {loading ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-sm text-[var(--text-secondary)] shadow-[var(--card-shadow)]">
                  <LoaderCircle size={18} className="animate-spin text-brand-green" /> Loading
                  released results…
                </div>
              ) : null}

              {!loading && error ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-600"
                >
                  {error}
                </div>
              ) : null}

              {!loading && data ? (
                <>
                  {data.children.length > 1 ? (
                    <label className="block max-w-xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-brand-green">
                        Child
                      </span>
                      <select
                        value={selectedStudentId}
                        onChange={(event) => {
                          setSelectedStudentId(event.target.value);
                          setLoading(true);
                          setError("");
                          void loadResults(event.target.value);
                        }}
                        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--input-text)] focus:border-brand-green focus:outline-none"
                      >
                        {data.children.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.displayName} · {child.className}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {data.selectedChild ? (
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)] md:p-8">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-green">
                            {data.selectedChild.studentId} · Current class{" "}
                            {data.selectedChild.className}
                          </p>
                          <h2 className="mt-2 font-display text-2xl text-[var(--text-primary)]">
                            {data.selectedChild.displayName}
                          </h2>
                        </div>
                        <div className="rounded-full bg-[var(--surface-disabled)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                          {data.results.length} released attempt
                          {data.results.length === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {data.results.length ? (
                    <div className="space-y-3">
                      {data.results.map((result) => (
                        <article
                          key={result.id}
                          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] md:p-6"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                              <Award size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-[var(--text-primary)]">
                                  {result.title}
                                </h3>
                                <span className="rounded-full bg-brand-green/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-brand-green">
                                  {result.examType}
                                </span>
                                {result.isHistoricalClass ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-disabled)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                    <History size={10} /> Previous class
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                {result.subjectName} · {result.className} · {result.teacherName} ·{" "}
                                {result.sessionLabel} {result.termLabel}
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-muted)]">
                                Attempt {result.attemptNumber}
                                {result.submittedAt
                                  ? ` · ${new Date(result.submittedAt).toLocaleDateString()}`
                                  : ""}
                              </p>
                            </div>
                            <div className="min-w-24 text-left sm:text-right">
                              <div className="font-display text-2xl text-[var(--text-primary)]">
                                {result.score}/{result.total}
                              </div>
                              <div className="text-sm font-bold text-brand-green">
                                {result.percent}%
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] p-10 text-center">
                      <FileText className="mx-auto mb-3 text-[var(--text-muted)]" size={24} />
                      <h3 className="font-semibold text-[var(--text-primary)]">
                        No released exam results yet
                      </h3>
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        Fully graded exam results appear here after the assessment is closed and
                        released by the school.
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
