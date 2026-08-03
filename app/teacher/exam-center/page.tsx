"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PortalTopbar from "@/components/PortalTopbar";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { useToast } from "@/components/Toast";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  LoaderCircle,
  Plus,
  Send,
  Upload,
  Users,
} from "lucide-react";

/**
 * Exam Management Center.
 *
 * Midterm tests and final exams were manageable only by hunting through
 * separate pages — create here, upload questions there, check results
 * elsewhere. This is one board: every paper a teacher owns, what state it is
 * in, and the action it needs next.
 *
 * The scheduling fields (scheduledFor / availableUntil / theoryMinutes) went
 * into the schema in an earlier drop but the create endpoint never accepted
 * them, so no teacher could actually set an exam date. This is the first
 * screen that can.
 */

type Exam = {
  id: string;
  title: string;
  subjectName: string;
  subjectLabel: string;
  className: string;
  examType: string;
  durationMinutes: number;
  theoryMinutes: number;
  totalMarks: number;
  passMark: number;
  questionCount: number;
  essayCount: number;
  status: string;
  statusLabel: string;
  resultsReleased: boolean;
  attemptCount: number;
  submittedCount: number;
  inProgressCount: number;
  scheduledFor: string | null;
  availableUntil: string | null;
  readiness: "NO_QUESTIONS" | "UNPUBLISHED" | "READY";
};

type Assignment = {
  id: string;
  subjectName: string;
  className: string;
  classId: string;
};

type Payload = {
  teacher: { displayName: string };
  assignments: Assignment[];
  exams: Exam[];
};

const TYPES = [
  { value: "CA", label: "CA" },
  { value: "MIDTERM", label: "Midterm test" },
  { value: "EXAM", label: "Final exam" },
  { value: "PRACTICE", label: "Practice" },
];

function when(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** datetime-local wants "YYYY-MM-DDTHH:mm" with no zone. */
function toIsoOrNull(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function ExamCenterPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"MIDTERM" | "EXAM" | "ALL">("ALL");

  const [form, setForm] = useState({
    assignmentId: "",
    title: "",
    examType: "MIDTERM",
    durationMinutes: 45,
    theoryMinutes: 0,
    passMark: 40,
    scheduledFor: "",
    availableUntil: "",
    instructions: "",
    bulkQuestions: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/exams", { cache: "no-store" });
      const body = (await response.json()) as Payload & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load exams.");
      setData(body);
      setForm((f) => ({ ...f, assignmentId: f.assignmentId || body.assignments[0]?.id || "" }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load exams.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!form.assignmentId || !form.title.trim()) return;
    setCreating(true);
    try {
      const response = await fetch("/api/teacher/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: form.assignmentId,
          title: form.title.trim(),
          examType: form.examType,
          durationMinutes: Number(form.durationMinutes),
          theoryMinutes: Number(form.theoryMinutes) || 0,
          passMark: Number(form.passMark),
          scheduledFor: toIsoOrNull(form.scheduledFor),
          availableUntil: toIsoOrNull(form.availableUntil),
          instructions: form.instructions.trim() || undefined,
          bulkQuestions: form.bulkQuestions.trim() || undefined,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to create the exam.");
      toast(`${form.title.trim()} created.`, "success");
      setShowForm(false);
      setForm((f) => ({
        ...f,
        title: "",
        bulkQuestions: "",
        scheduledFor: "",
        availableUntil: "",
      }));
      await load();
    } catch (createError) {
      toast(
        createError instanceof Error ? createError.message : "Unable to create the exam.",
        "error",
      );
    } finally {
      setCreating(false);
    }
  }

  async function publish(exam: Exam) {
    try {
      const response = await fetch("/api/teacher/exams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: exam.id, action: "PUBLISH" }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to publish.");
      toast(`${exam.title} published.`, "success");
      await load();
    } catch (publishError) {
      toast(publishError instanceof Error ? publishError.message : "Unable to publish.", "error");
    }
  }

  const shown = useMemo(() => {
    const all = data?.exams ?? [];
    if (tab === "ALL") return all;
    return all.filter((exam) => exam.examType === tab);
  }, [data, tab]);

  const needsAttention = (data?.exams ?? []).filter((e) => e.readiness !== "READY");

  return (
    <>
      <PortalTopbar title="Exam centre" />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pt-28 pb-14">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-green/40 bg-brand-green/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
              <ClipboardList size={11} /> Assessments
            </span>
            <h1 className="mt-3 font-display text-4xl tracking-widest text-white md:text-6xl">
              EXAM <span className="text-brand-green">CENTRE</span>
            </h1>
            <p className="mt-3 max-w-2xl font-body text-sm text-white/60">
              Midterm tests and final exams in one place. Set the sitting window, paste or upload
              questions, publish, then release results.
            </p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <TeacherSidebar />

            <div className="min-w-0 flex-1 space-y-6">
              {error ? (
                <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button
                    onClick={() => void load()}
                    className="font-bold uppercase tracking-widest"
                  >
                    Retry
                  </button>
                </div>
              ) : null}

              {loading ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-10">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading…
                  </div>
                </div>
              ) : null}

              {!loading && data ? (
                <>
                  {/* Papers that will not work as they stand. Publishing an
                      exam with no questions is the single most common mistake,
                      and it only surfaces when a student opens it. */}
                  {needsAttention.length ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-brand-orange/30 bg-brand-orange/10 p-4 text-sm text-brand-orange">
                      <AlertCircle size={18} className="mt-0.5 shrink-0" />
                      <span>
                        {needsAttention.length} paper
                        {needsAttention.length === 1 ? "" : "s"} need attention —{" "}
                        {needsAttention.filter((e) => e.readiness === "NO_QUESTIONS").length} with
                        no questions,{" "}
                        {needsAttention.filter((e) => e.readiness === "UNPUBLISHED").length} not yet
                        published.
                      </span>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    {(["ALL", "MIDTERM", "EXAM"] as const).map((key) => (
                      <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                          tab === key
                            ? "bg-brand-green text-white"
                            : "bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)]"
                        }`}
                      >
                        {key === "ALL"
                          ? "All"
                          : key === "MIDTERM"
                            ? "Midterm tests"
                            : "Final exams"}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowForm((v) => !v)}
                      className="ml-auto inline-flex items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white"
                    >
                      <Plus size={13} /> New paper
                    </button>
                  </div>

                  {showForm ? (
                    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
                      <h2 className="font-display text-2xl tracking-widest text-[var(--text-primary)]">
                        NEW PAPER
                      </h2>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label>
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            Subject · class
                          </span>
                          <select
                            value={form.assignmentId}
                            onChange={(e) => setForm({ ...form, assignmentId: e.target.value })}
                            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--input-text)]"
                          >
                            {data.assignments.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.subjectName} · {a.className}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            Type
                          </span>
                          <select
                            value={form.examType}
                            onChange={(e) => setForm({ ...form, examType: e.target.value })}
                            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--input-text)]"
                          >
                            {TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="sm:col-span-2">
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            Title
                          </span>
                          <input
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g. Biology Midterm Test"
                            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--input-text)]"
                          />
                        </label>

                        {/* The sitting window. Students see this as
                            "Not yet open" / "Ready to take" / "Missed". */}
                        <label>
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            Opens
                          </span>
                          <input
                            type="datetime-local"
                            value={form.scheduledFor}
                            onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
                            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--input-text)]"
                          />
                        </label>
                        <label>
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            Closes
                          </span>
                          <input
                            type="datetime-local"
                            value={form.availableUntil}
                            onChange={(e) => setForm({ ...form, availableUntil: e.target.value })}
                            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--input-text)]"
                          />
                        </label>

                        <label>
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            Objective minutes
                          </span>
                          <input
                            type="number"
                            min={5}
                            max={240}
                            value={form.durationMinutes}
                            onChange={(e) =>
                              setForm({ ...form, durationMinutes: Number(e.target.value) })
                            }
                            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--input-text)]"
                          />
                        </label>
                        <label>
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            Theory minutes (0 if none)
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={240}
                            value={form.theoryMinutes}
                            onChange={(e) =>
                              setForm({ ...form, theoryMinutes: Number(e.target.value) })
                            }
                            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--input-text)]"
                          />
                        </label>
                      </div>

                      <label className="mt-3 block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                          Paste questions (optional — blank line between each)
                        </span>
                        <textarea
                          value={form.bulkQuestions}
                          onChange={(e) => setForm({ ...form, bulkQuestions: e.target.value })}
                          rows={7}
                          placeholder={`Q: What is the capital of Nigeria?\nA) Lagos\nB) Abuja\nC) Kano\nANSWER: B\nMarks: 2\n\nQ: Water boils at ___ degrees Celsius.\nFILL: 100`}
                          className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 font-mono text-xs text-[var(--input-text)] placeholder:text-[var(--input-placeholder)]"
                        />
                        <span className="mt-1 block text-xs text-[var(--text-muted)]">
                          Questions are validated before the paper is created — a format error
                          rejects the whole batch rather than saving half of it.
                        </span>
                      </label>

                      <div className="mt-5 flex gap-2">
                        <button
                          onClick={() => setShowForm(false)}
                          className="rounded-full border border-[var(--border-default)] px-5 py-2.5 text-sm text-[var(--text-secondary)]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => void create()}
                          disabled={creating || !form.title.trim() || !form.assignmentId}
                          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-green py-2.5 text-sm font-bold text-white disabled:opacity-60"
                        >
                          {creating ? (
                            <LoaderCircle size={15} className="animate-spin" />
                          ) : (
                            <Plus size={15} />
                          )}
                          Create paper
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {shown.map((exam) => (
                      <div
                        key={exam.id}
                        className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <b className="text-[var(--text-primary)]">{exam.title}</b>
                              <span className="rounded-full bg-[var(--surface-disabled)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                {exam.examType}
                              </span>
                              {exam.readiness === "NO_QUESTIONS" ? (
                                <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-500">
                                  No questions
                                </span>
                              ) : exam.readiness === "UNPUBLISHED" ? (
                                <span className="rounded-full bg-brand-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-orange">
                                  Draft
                                </span>
                              ) : (
                                <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-green">
                                  {exam.statusLabel}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              {exam.subjectLabel} · {exam.className} · {exam.questionCount} question
                              {exam.questionCount === 1 ? "" : "s"} · {exam.totalMarks} marks ·{" "}
                              {exam.durationMinutes} min
                              {exam.theoryMinutes > 0 ? ` + ${exam.theoryMinutes} theory` : ""}
                            </p>
                            {when(exam.scheduledFor) ? (
                              <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                                <CalendarClock size={12} className="text-brand-green" />
                                {when(exam.scheduledFor)}
                                {when(exam.availableUntil) ? ` — ${when(exam.availableUntil)}` : ""}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-[var(--text-muted)]">
                                No sitting window set — students can take it any time.
                              </p>
                            )}
                            {exam.essayCount > 0 ? (
                              <p className="mt-1 text-xs text-brand-orange">
                                {exam.essayCount} essay question
                                {exam.essayCount === 1 ? "" : "s"} — needs manual marking before
                                results can be released.
                              </p>
                            ) : null}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                              <Users size={12} /> {exam.submittedCount} submitted
                              {exam.inProgressCount > 0
                                ? ` · ${exam.inProgressCount} in progress`
                                : ""}
                            </span>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Link
                                href={`/teacher/upload-questions?examId=${encodeURIComponent(exam.id)}`}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-card-hover)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-brand-green"
                              >
                                <Upload size={12} /> Questions
                              </Link>
                              <Link
                                href={`/teacher/grade-exams?examId=${encodeURIComponent(exam.id)}`}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-card-hover)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-brand-green"
                              >
                                <FileText size={12} /> Results
                              </Link>
                              {exam.readiness === "UNPUBLISHED" && exam.questionCount > 0 ? (
                                <button
                                  onClick={() => void publish(exam)}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-green px-4 py-2 text-xs font-bold text-white"
                                >
                                  <Send size={12} /> Publish
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {!shown.length ? (
                      <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] p-12 text-center">
                        <CheckCircle2 className="mx-auto mb-3 text-[var(--text-muted)]" size={28} />
                        <p className="text-sm text-[var(--text-muted)]">
                          No{" "}
                          {tab === "ALL" ? "papers" : tab === "MIDTERM" ? "midterm tests" : "exams"}{" "}
                          yet. Create one above.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
