"use client";

import { useEffect, useMemo, useState } from "react";
import PortalTopbar from "@/components/PortalTopbar";
import TeacherSidebar from "@/components/TeacherSidebar";
import { useToast } from "@/components/Toast";
import { BookOpen, Check, LoaderCircle, Search, Send, Users } from "lucide-react";

type ResultStudent = {
  profileId: string;
  studentId: string;
  studentName: string;
  score: number;
  total: number;
  percent: number;
  grade: string;
  attemptNumber: number;
  submittedAt: string | null;
};

type ReleasedExam = {
  id: string;
  title: string;
  subjectName: string;
  examType: string;
  className: string;
  termLabel: string;
  sessionLabel: string;
  totalMarks: number;
  students: ResultStudent[];
};

type ResultsResponse = { exams: ReleasedExam[] };

type SendResponse = {
  ok?: boolean;
  sent?: number;
  notifications?: number;
  withoutParent?: number;
  withoutPortalAccount?: number;
  message?: string;
  error?: string;
};

export default function SendResultsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<SendResponse | null>(null);

  async function loadReleasedResults() {
    try {
      const response = await fetch("/api/teacher/send-results", { cache: "no-store" });
      const body = (await response.json()) as ResultsResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load released results.");
      setData(body);
      setSelectedExamId((current) =>
        body.exams.some((exam) => exam.id === current) ? current : body.exams[0]?.id || "",
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load released results.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // The async helper awaits fetch before changing React state; this is not a synchronous effect update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReleasedResults();
  }, []);

  const selectedExam = data?.exams.find((exam) => exam.id === selectedExamId) ?? null;
  const visibleStudents = useMemo(() => {
    if (!selectedExam) return [];
    const query = search.trim().toLowerCase();
    if (!query) return selectedExam.students;
    return selectedExam.students.filter((student) =>
      `${student.studentName} ${student.studentId}`.toLowerCase().includes(query),
    );
  }, [selectedExam, search]);
  const selectedCount = selectedExam
    ? selectedExam.students.filter((student) => selectedStudentIds.has(student.profileId)).length
    : 0;
  const allVisibleSelected =
    visibleStudents.length > 0 &&
    visibleStudents.every((student) => selectedStudentIds.has(student.profileId));

  function toggleStudent(profileId: string) {
    setSelectedStudentIds((previous) => {
      const next = new Set(previous);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
    setLastResult(null);
  }

  function toggleVisibleStudents() {
    setSelectedStudentIds((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) {
        for (const student of visibleStudents) next.delete(student.profileId);
      } else {
        for (const student of visibleStudents) next.add(student.profileId);
      }
      return next;
    });
    setLastResult(null);
  }

  async function handleSend() {
    if (!selectedExam || !selectedCount || sending) return;
    setSending(true);
    setLastResult(null);
    try {
      const response = await fetch("/api/teacher/send-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExam.id,
          studentProfileIds: selectedExam.students
            .filter((student) => selectedStudentIds.has(student.profileId))
            .map((student) => student.profileId),
        }),
      });
      const body = (await response.json()) as SendResponse;
      if (!response.ok) throw new Error(body.error || "Could not announce these results.");
      setLastResult(body);
      toast(body.message || "Result notifications created.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not announce these results.";
      toast(message, "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PortalTopbar />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pb-10 pt-24">
          <div className="w-full">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-green/40 bg-brand-green/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
              <Send size={11} /> Results announcements
            </span>
            <h1 className="font-display text-4xl tracking-widest text-white md:text-5xl">
              SEND <span className="text-brand-green">RESULTS</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/60">
              Announce scores from closed assessments whose results have been released. Scores and
              totals are loaded from graded exam records, not entered in this page.
            </p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="w-full flex flex-col gap-8 lg:flex-row">
            <TeacherSidebar />

            <div className="min-w-0 flex-1 space-y-6">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)] md:p-8">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl text-[var(--text-primary)]">
                      Released assessments
                    </h2>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      Only results for your assigned subject/class pairs are available. An
                      assessment must be closed and its results released.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      setLoadError("");
                      void loadReleasedResults();
                    }}
                    disabled={loading}
                    className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:border-brand-green disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-disabled)] p-5 text-sm text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={18} /> Loading
                    released assessments…
                  </div>
                ) : null}

                {!loading && loadError ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-600"
                  >
                    {loadError}
                  </div>
                ) : null}

                {!loading && !loadError && data?.exams.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--border-default)] p-8 text-center">
                    <BookOpen className="mx-auto mb-3 text-[var(--text-muted)]" size={22} />
                    <p className="font-semibold text-[var(--text-primary)]">
                      No released results available
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Close an assessment, grade outstanding essays, then release its results from
                      the exam centre.
                    </p>
                  </div>
                ) : null}

                {!loading && data?.exams.length ? (
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-brand-green">
                      Assessment
                    </span>
                    <select
                      value={selectedExamId}
                      onChange={(event) => {
                        setSelectedExamId(event.target.value);
                        setSelectedStudentIds(new Set());
                        setLastResult(null);
                      }}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-[var(--input-text)] focus:border-brand-green focus:outline-none"
                    >
                      {data.exams.map((exam) => (
                        <option key={exam.id} value={exam.id}>
                          {exam.className} · {exam.subjectName} · {exam.title} · {exam.sessionLabel}{" "}
                          {exam.termLabel}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              {selectedExam ? (
                <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--card-shadow)]">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] p-6 md:p-8">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-green">
                        <span>{selectedExam.examType}</span>
                        <span className="text-[var(--text-muted)]">·</span>
                        <span>
                          {selectedExam.sessionLabel} {selectedExam.termLabel}
                        </span>
                      </div>
                      <h2 className="mt-2 font-display text-xl text-[var(--text-primary)]">
                        {selectedExam.title}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {selectedExam.subjectName} · {selectedExam.className} ·{" "}
                        {selectedExam.totalMarks} marks
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-brand-green/10 px-4 py-2 text-sm font-bold text-brand-green">
                      <Users size={15} /> {selectedCount} selected
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:p-8">
                    <div className="relative min-w-0 flex-1">
                      <Search
                        size={16}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search students…"
                        aria-label="Search students"
                        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-3 pl-11 pr-4 text-sm text-[var(--input-text)] focus:border-brand-green focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={toggleVisibleStudents}
                      className="rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:border-brand-green"
                    >
                      {allVisibleSelected ? "Deselect visible" : "Select visible"}
                    </button>
                  </div>

                  <div className="mx-6 max-h-[30rem] overflow-y-auto rounded-xl border border-[var(--border-subtle)] md:mx-8">
                    {visibleStudents.map((student) => {
                      const checked = selectedStudentIds.has(student.profileId);
                      return (
                        <label
                          key={student.profileId}
                          className={`flex cursor-pointer items-center gap-4 border-b border-[var(--border-subtle)] p-4 last:border-0 ${checked ? "bg-brand-green/5" : "hover:bg-[var(--surface-disabled)]"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStudent(student.profileId)}
                            className="h-4 w-4 accent-brand-green"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[var(--text-primary)]">
                              {student.studentName}
                            </div>
                            <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                              {student.studentId} · Attempt {student.attemptNumber}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-[var(--text-primary)]">
                              {student.score}/{student.total}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {student.percent}% · {student.grade}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                    {!visibleStudents.length ? (
                      <p className="p-8 text-center text-sm text-[var(--text-muted)]">
                        No students match this search.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
                    <p className="max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
                      Sending creates a durable in-app result notice for each linked parent and the
                      student account, when active. SMS, WhatsApp, and email are not sent by this
                      action.
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={!selectedCount || sending}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand-green px-7 py-3 text-sm font-bold uppercase tracking-widest text-brand-navy shadow-lg transition-colors hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sending ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Send size={15} />
                      )}
                      {sending
                        ? "Sending…"
                        : `Notify ${selectedCount} student${selectedCount === 1 ? "" : "s"}`}
                    </button>
                  </div>
                </div>
              ) : null}

              {lastResult ? (
                <div
                  role="status"
                  className="rounded-2xl border border-brand-green/30 bg-brand-green/10 p-6 text-sm text-[var(--text-secondary)]"
                >
                  <div className="flex items-start gap-3">
                    <Check className="mt-0.5 shrink-0 text-brand-green" size={18} />
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{lastResult.message}</p>
                      <p className="mt-1">
                        {lastResult.notifications ?? 0} new portal notification(s) ·{" "}
                        {lastResult.withoutParent ?? 0} student(s) without an active linked parent
                        account · {lastResult.withoutPortalAccount ?? 0} with no active portal
                        recipient.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
