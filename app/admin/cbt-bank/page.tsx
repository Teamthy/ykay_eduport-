"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import CbtQuestionManager from "@/components/admin/CbtQuestionManager";
import PortalTopbar from "@/components/PortalTopbar";
import { readJsonResponse } from "@/lib/api-response";
import { CBT_CLASS_LEVELS } from "@/lib/cbt-question-levels";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RotateCcw,
  Search,
  SearchCheck,
  Archive,
  Save,
} from "lucide-react";

type Question = {
  id: string;
  topic: string;
  difficulty: number;
  stem: string;
  options: unknown;
  correctIndex: number;
  explanation: string;
  source: string;
  status: string;
  reviewReference: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  subject: { name: string; slug: string; classLevel: string; department: string };
};

type ReviewForm = {
  reference: string;
  notes: string;
  topic: string;
  difficulty: number;
  stem: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  source: string;
};

function optionList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function canApprove(form: ReviewForm) {
  const options = form.options.map((option) => option.trim().toLowerCase());
  const explanation = form.explanation.toLowerCase();
  const genericPhrases = [
    "this sits in the nerdc scheme",
    "common distractor",
    "mixes a related but different idea",
    "not the required relationship",
    "does not satisfy the stem",
  ];
  return (
    form.topic.trim().length >= 2 &&
    form.stem.trim().length >= 5 &&
    options.length === 4 &&
    options.every(Boolean) &&
    new Set(options).size === 4 &&
    form.explanation.trim().length >= 40 &&
    !genericPhrases.some((phrase) => explanation.includes(phrase))
  );
}

export default function CbtBankReviewPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [forms, setForms] = useState<Record<string, ReviewForm>>({});
  const [status, setStatus] = useState<"draft" | "reviewed" | "archived">("draft");
  const [classLevel, setClassLevel] = useState("");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [totals, setTotals] = useState({ draft: 0, reviewed: 0, archived: 0 });
  const [batchReference, setBatchReference] = useState("");
  const [batchNotes, setBatchNotes] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ status });
    if (classLevel) params.set("classLevel", classLevel);
    if (search) params.set("q", search);
    if (cursor) params.set("cursor", cursor);
    return params.toString();
  }, [classLevel, cursor, search, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/cbt/questions?${query}`, { cache: "no-store" });
      const payload = await readJsonResponse<{
        questions?: Question[];
        nextCursor?: string | null;
        totals?: { draft: number; reviewed: number; archived: number };
        error?: string;
      }>(response);
      if (!response.ok) throw new Error(payload.error || "Unable to load CBT questions.");
      const rows = payload.questions ?? [];
      setQuestions(rows);
      setSelected([]);
      if (payload.totals) setTotals(payload.totals);
      setNextCursor(payload.nextCursor ?? null);
      setForms(
        Object.fromEntries(
          rows.map((question) => [
            question.id,
            {
              reference: question.reviewReference ?? "",
              notes: question.reviewNotes ?? "",
              topic: question.topic,
              difficulty: question.difficulty,
              stem: question.stem,
              options: optionList(question.options),
              correctIndex: question.correctIndex,
              explanation: question.explanation,
              source: question.source,
            },
          ]),
        ),
      );
    } catch (loadError) {
      setQuestions([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load CBT questions.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    // The loader synchronizes this component with the protected review API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function reviewQuestion(question: Question, decision: "APPROVE" | "RETURN") {
    const form = forms[question.id] ?? {
      reference: "",
      notes: "",
      topic: question.topic,
      difficulty: question.difficulty,
      stem: question.stem,
      options: optionList(question.options),
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      source: question.source,
    };
    setSavingId(question.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/cbt/questions/${question.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          ...(decision === "APPROVE"
            ? {
                reference: form.reference,
                question: {
                  topic: form.topic,
                  difficulty: form.difficulty,
                  stem: form.stem,
                  options: form.options,
                  correctIndex: form.correctIndex,
                  explanation: form.explanation,
                  source: form.source,
                },
              }
            : {}),
          notes: form.notes,
        }),
      });
      const payload = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(payload.error || "Unable to save the review decision.");
      setNotice(
        decision === "APPROVE"
          ? "Question approved with your reviewer attestation."
          : "Question returned to draft and removed from student practice.",
      );
      await load();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error ? reviewError.message : "Unable to save the review decision.",
      );
    } finally {
      setSavingId("");
    }
  }

  async function approveSelected() {
    if (!selected.length) return;
    if (
      !window.confirm(
        `Approve ${selected.length} selected question${selected.length === 1 ? "" : "s"} with this one citation and note? Only continue if you personally checked every selected item\u2019s answer key, options, explanation and class fit.`,
      )
    ) {
      return;
    }
    setBulkBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/cbt/questions/bulk-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selected,
          decision: "APPROVE",
          reference: batchReference,
          notes: batchNotes,
        }),
      });
      const payload = await readJsonResponse<{
        approved?: number;
        rejected?: Array<{ id: string; reason: string }>;
        skippedNotDraft?: string[];
        error?: string;
      }>(response);
      if (!response.ok) throw new Error(payload.error || "Unable to approve the selected items.");
      const rejected = payload.rejected ?? [];
      setNotice(
        `Approved ${payload.approved ?? 0} question${payload.approved === 1 ? "" : "s"}.` +
          (rejected.length
            ? ` ${rejected.length} item${rejected.length === 1 ? "" : "s"} need manual work (e.g. ${rejected[0].reason}).`
            : ""),
      );
      setSelected([]);
      await load();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Unable to approve the selection.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function saveDraft(question: Question) {
    const form = forms[question.id];
    if (!form) return;
    setSavingId(question.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/cbt/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: form.topic,
          difficulty: form.difficulty,
          stem: form.stem,
          options: form.options,
          correctIndex: form.correctIndex,
          explanation: form.explanation,
          source: form.source,
        }),
      });
      const payload = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(payload.error || "Unable to save the draft.");
      setNotice("Draft saved. It remains hidden from student practice.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save the draft.");
    } finally {
      setSavingId("");
    }
  }

  async function archiveQuestion(question: Question) {
    if (
      !window.confirm(
        "Archive this question? It will leave student practice, while historical attempt answers are preserved.",
      )
    ) {
      return;
    }
    setSavingId(question.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/cbt/questions/${question.id}`, { method: "DELETE" });
      const payload = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(payload.error || "Unable to archive the question.");
      setNotice("Question archived; historical practice records were preserved.");
      await load();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : "Unable to archive the question.",
      );
    } finally {
      setSavingId("");
    }
  }

  async function restoreQuestion(question: Question) {
    setSavingId(question.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/cbt/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESTORE" }),
      });
      const payload = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(payload.error || "Unable to restore the question.");
      setNotice("Question restored to draft; it must be reviewed before students can use it.");
      await load();
    } catch (restoreError) {
      setError(
        restoreError instanceof Error ? restoreError.message : "Unable to restore the question.",
      );
    } finally {
      setSavingId("");
    }
  }

  return (
    <>
      <PortalTopbar title="CBT question review" />
      <main className="flex w-full gap-8 px-4 py-6 sm:px-6">
        <AdminSidebar />
        <section className="min-w-0 flex-1 space-y-6">
          <header className="rounded-[2rem] bg-brand-navy p-7 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
              Quality gate · student practice
            </p>
            <h1 className="mt-2 font-display text-4xl">Curriculum question review</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
              Imported questions stay hidden until a reviewer checks the key, options, explanation
              and curriculum alignment. Approving an item records your account, date and cited
              source.
            </p>
          </header>

          <CbtQuestionManager
            onChanged={() => {
              setStatus("draft");
              setCursor("");
              setPreviousCursors([]);
            }}
          />

          <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
            <div className="flex flex-wrap gap-3">
              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  Review status
                </span>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as "draft" | "reviewed" | "archived");
                    setCursor("");
                    setPreviousCursors([]);
                  }}
                  className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
                >
                  <option value="draft">Draft · needs review</option>
                  <option value="reviewed">Reviewed · approved</option>
                  <option value="archived">Archived · removed from practice</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  Class
                </span>
                <select
                  value={classLevel}
                  onChange={(event) => {
                    setClassLevel(event.target.value);
                    setCursor("");
                    setPreviousCursors([]);
                  }}
                  className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
                >
                  <option value="">All classes</option>
                  {CBT_CLASS_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  Search
                </span>
                <input
                  value={searchText}
                  maxLength={120}
                  onChange={(event) => setSearchText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setSearch(searchText.trim());
                      setCursor("");
                      setPreviousCursors([]);
                    }
                  }}
                  placeholder="Stem, topic or subject"
                  className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setSearch(searchText.trim());
                  setCursor("");
                  setPreviousCursors([]);
                }}
                className="inline-flex items-center gap-2 self-end rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]"
              >
                <Search size={15} /> Search
              </button>
            </div>
            <div className="text-right text-xs text-[var(--text-muted)]">
              <p>
                Showing {questions.length} item{questions.length === 1 ? "" : "s"} on this page
              </p>
              <p className="mt-1 font-semibold text-[var(--text-primary)]">
                Bank: {totals.draft.toLocaleString()} draft · {totals.reviewed.toLocaleString()}{" "}
                reviewed · {totals.archived.toLocaleString()} archived
              </p>
            </div>
          </div>

          {status === "draft" && questions.length ? (
            <div className="space-y-3 rounded-2xl border border-brand-green/30 bg-brand-green/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={questions.length > 0 && selected.length === questions.length}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked ? questions.map((question) => question.id) : [],
                      )
                    }
                  />
                  Select all {questions.length} on this page
                </label>
                <span className="text-xs text-[var(--text-muted)]">
                  {selected.length} selected · batch limit 100
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  Source citation for this batch
                  <input
                    value={batchReference}
                    maxLength={500}
                    onChange={(event) => setBatchReference(event.target.value)}
                    placeholder="Document title, version, section / page or official URL"
                    className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  Review note for this batch
                  <textarea
                    value={batchNotes}
                    maxLength={2000}
                    rows={2}
                    onChange={(event) => setBatchNotes(event.target.value)}
                    placeholder="Describe how you checked the keys, distractors and class fit."
                    className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void approveSelected()}
                disabled={
                  bulkBusy ||
                  !selected.length ||
                  selected.length > 100 ||
                  batchReference.trim().length < 10 ||
                  batchNotes.trim().length < 20
                }
                className="rounded-full bg-brand-green px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {bulkBusy ? "Approving…" : `Approve ${selected.length || ""} selected as reviewed`}
              </button>
              <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                This records your account, date, citation and note on every selected item. Items
                that fail the structural check stay in the draft queue.
              </p>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600"
            >
              {error}
            </div>
          ) : null}
          {notice ? (
            <div
              role="status"
              className="rounded-xl border border-brand-green/30 bg-brand-green/5 p-4 text-sm text-brand-green"
            >
              {notice}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-10 text-sm text-[var(--text-muted)]">
              <LoaderCircle size={18} className="animate-spin" /> Loading CBT question bank…
            </div>
          ) : questions.length ? (
            <div className="space-y-4">
              {questions.map((question) => {
                const form = forms[question.id] ?? {
                  reference: "",
                  notes: "",
                  topic: question.topic,
                  difficulty: question.difficulty,
                  stem: question.stem,
                  options: optionList(question.options),
                  correctIndex: question.correctIndex,
                  explanation: question.explanation,
                  source: question.source,
                };
                return (
                  <article
                    key={question.id}
                    className="rounded-[1.7rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)] md:p-7"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {status === "draft" ? (
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selected.includes(question.id)}
                            onChange={(event) =>
                              setSelected((current) =>
                                event.target.checked
                                  ? [...current, question.id]
                                  : current.filter((id) => id !== question.id),
                              )
                            }
                            aria-label={`Select question ${question.stem.slice(0, 60)}`}
                          />
                        ) : null}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-green">
                            {question.subject.name} · {question.subject.classLevel.toUpperCase()} ·{" "}
                            {question.topic}
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                            Difficulty {question.difficulty}/3 · {question.source} ·{" "}
                            {question.status}
                          </p>
                        </div>
                      </div>
                      {question.reviewedAt ? (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          Reviewed {new Date(question.reviewedAt).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <label>
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                          Curriculum topic
                        </span>
                        <input
                          value={form.topic}
                          disabled={status !== "draft"}
                          onChange={(event) =>
                            setForms((current) => ({
                              ...current,
                              [question.id]: { ...form, topic: event.target.value },
                            }))
                          }
                          className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)] disabled:opacity-60"
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                          Difficulty
                        </span>
                        <select
                          value={form.difficulty}
                          disabled={status !== "draft"}
                          onChange={(event) =>
                            setForms((current) => ({
                              ...current,
                              [question.id]: { ...form, difficulty: Number(event.target.value) },
                            }))
                          }
                          className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)] disabled:opacity-60"
                        >
                          <option value={1}>Easy · 1</option>
                          <option value={2}>Medium · 2</option>
                          <option value={3}>Hard · 3</option>
                        </select>
                      </label>
                      <label>
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                          Content provenance
                        </span>
                        <input
                          value={form.source}
                          disabled={status !== "draft"}
                          onChange={(event) =>
                            setForms((current) => ({
                              ...current,
                              [question.id]: { ...form, source: event.target.value },
                            }))
                          }
                          className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)] disabled:opacity-60"
                        />
                      </label>
                      <label className="md:col-span-3">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                          Question stem
                        </span>
                        <textarea
                          value={form.stem}
                          disabled={status !== "draft"}
                          onChange={(event) =>
                            setForms((current) => ({
                              ...current,
                              [question.id]: { ...form, stem: event.target.value },
                            }))
                          }
                          rows={3}
                          className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)] disabled:opacity-60"
                        />
                      </label>
                    </div>
                    <fieldset className="mt-4 rounded-2xl border border-[var(--border-subtle)] p-4">
                      <legend className="px-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        Options · select the verified answer key
                      </legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {Array.from({ length: 4 }, (_, index) => (
                          <label
                            key={`${question.id}-option-${index}`}
                            className="flex items-center gap-2 rounded-xl bg-[var(--bg-secondary)] p-3"
                          >
                            <input
                              type="radio"
                              name={`correct-${question.id}`}
                              checked={form.correctIndex === index}
                              disabled={status !== "draft"}
                              onChange={() =>
                                setForms((current) => ({
                                  ...current,
                                  [question.id]: { ...form, correctIndex: index },
                                }))
                              }
                              className="accent-emerald-600"
                              aria-label={`Mark option ${String.fromCharCode(65 + index)} as correct`}
                            />
                            <span className="w-5 shrink-0 text-xs font-bold text-brand-green">
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <input
                              value={form.options[index] ?? ""}
                              disabled={status !== "draft"}
                              onChange={(event) =>
                                setForms((current) => {
                                  const options = [...form.options];
                                  while (options.length < 4) options.push("");
                                  options[index] = event.target.value;
                                  return { ...current, [question.id]: { ...form, options } };
                                })
                              }
                              className="min-w-0 flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-2 text-xs text-[var(--input-text)] disabled:opacity-60"
                            />
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <label className="mt-4 block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        Question-specific explanation · explain why the answer is correct
                      </span>
                      <textarea
                        value={form.explanation}
                        disabled={status !== "draft"}
                        onChange={(event) =>
                          setForms((current) => ({
                            ...current,
                            [question.id]: { ...form, explanation: event.target.value },
                          }))
                        }
                        rows={4}
                        className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm leading-relaxed text-[var(--input-text)] disabled:opacity-60"
                      />
                    </label>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <label>
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                          Official curriculum / exam reference{" "}
                          {status === "draft" ? "(required to approve)" : ""}
                        </span>
                        <input
                          value={form.reference}
                          onChange={(event) =>
                            setForms((current) => ({
                              ...current,
                              [question.id]: { ...form, reference: event.target.value },
                            }))
                          }
                          placeholder="Document title, version, section / page or official URL"
                          disabled={status !== "draft"}
                          className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)] disabled:opacity-60"
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                          Review notes {status === "draft" ? "(20+ characters to approve)" : ""}
                        </span>
                        <textarea
                          value={form.notes}
                          disabled={status === "archived"}
                          onChange={(event) =>
                            setForms((current) => ({
                              ...current,
                              [question.id]: { ...form, notes: event.target.value },
                            }))
                          }
                          placeholder="Explain how you verified the key, distractors and curriculum fit."
                          rows={2}
                          className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--input-text)]"
                        />
                      </label>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      {status === "draft" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void saveDraft(question)}
                            disabled={savingId === question.id}
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] disabled:opacity-50"
                          >
                            {savingId === question.id ? (
                              <LoaderCircle size={14} className="animate-spin" />
                            ) : (
                              <Save size={14} />
                            )}{" "}
                            Save draft
                          </button>
                          <button
                            type="button"
                            onClick={() => void reviewQuestion(question, "APPROVE")}
                            disabled={
                              savingId === question.id ||
                              form.reference.trim().length < 10 ||
                              form.notes.trim().length < 20 ||
                              !canApprove(form)
                            }
                            className="inline-flex items-center gap-2 rounded-full bg-brand-green px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                          >
                            {savingId === question.id ? (
                              <LoaderCircle size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}{" "}
                            Approve as reviewed
                          </button>
                        </>
                      ) : status === "reviewed" ? (
                        <button
                          type="button"
                          onClick={() => void reviewQuestion(question, "RETURN")}
                          disabled={savingId === question.id || form.notes.trim().length < 10}
                          className="inline-flex items-center gap-2 rounded-full border border-brand-orange/40 bg-brand-orange/5 px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] disabled:opacity-50"
                        >
                          {savingId === question.id ? (
                            <LoaderCircle size={14} className="animate-spin" />
                          ) : (
                            <RotateCcw size={14} />
                          )}{" "}
                          Revoke review · return to draft
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void restoreQuestion(question)}
                          disabled={savingId === question.id}
                          className="inline-flex items-center gap-2 rounded-full border border-brand-green/40 bg-brand-green/5 px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] disabled:opacity-50"
                        >
                          {savingId === question.id ? (
                            <LoaderCircle size={14} className="animate-spin" />
                          ) : (
                            <RotateCcw size={14} />
                          )}{" "}
                          Restore to draft
                        </button>
                      )}
                      {status !== "archived" ? (
                        <button
                          type="button"
                          onClick={() => void archiveQuestion(question)}
                          disabled={savingId === question.id}
                          className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-xs font-bold text-red-600 disabled:opacity-50"
                        >
                          {savingId === question.id ? (
                            <LoaderCircle size={14} className="animate-spin" />
                          ) : (
                            <Archive size={14} />
                          )}{" "}
                          Archive question
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-10 text-center">
              <SearchCheck size={26} className="mx-auto text-brand-green" />
              <p className="mt-3 font-semibold text-[var(--text-primary)]">
                No {status} questions on this page
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {status === "archived"
                  ? "Archived questions stay out of student practice and can be restored to the draft queue."
                  : status === "reviewed"
                    ? "Approved questions will appear here after a reviewer records a source citation and review notes."
                    : "Import or add questions as drafts, then fact-check and review each item before students see it."}
              </p>
            </div>
          )}

          <div className="flex justify-between gap-3">
            <button
              type="button"
              disabled={!previousCursors.length || loading}
              onClick={() => {
                setCursor(previousCursors.at(-1) ?? "");
                setPreviousCursors((stack) => stack.slice(0, -1));
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Previous page
            </button>
            <button
              type="button"
              disabled={!nextCursor || loading}
              onClick={() => {
                if (!nextCursor) return;
                setPreviousCursors((stack) => [...stack, cursor]);
                setCursor(nextCursor);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] disabled:opacity-40"
            >
              Next page <ChevronRight size={16} />
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
