"use client";

import { useRef, useState, type FormEvent } from "react";
import Papa from "papaparse";
import { readJsonResponse } from "@/lib/api-response";
import { CBT_CLASS_LEVELS } from "@/lib/cbt-question-levels";

type ImportPayload = {
  imported?: number;
  skipped?: number;
  errors?: string[];
  maxRowsPerRequest?: number;
  error?: string;
};

type QuestionDraft = {
  subjectSlug: string;
  subjectName: string;
  classLevel: (typeof CBT_CLASS_LEVELS)[number];
  department: string;
  topic: string;
  term: "" | "first" | "second" | "third";
  difficulty: number;
  stem: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  source: string;
};

const blankDraft = (): QuestionDraft => ({
  subjectSlug: "",
  subjectName: "",
  classLevel: "jss1",
  department: "general",
  topic: "",
  term: "",
  difficulty: 2,
  stem: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
  source: "original-draft",
});

const CSV_COLUMNS = [
  "subjectSlug",
  "subjectName",
  "classLevel",
  "topic",
  "term",
  "difficulty",
  "stem",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctIndex",
  "explanation",
];
const IMPORT_BATCH_SIZE = 200;
const MAX_FILE_ROWS = 25_000;

export default function CbtQuestionManager({ onChanged }: { onChanged: () => void }) {
  const [draft, setDraft] = useState<QuestionDraft>(blankDraft);
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function createQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/cbt/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, term: draft.term || null }),
      });
      const payload = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(payload.error || "Unable to add the question.");
      setDraft(blankDraft());
      setNotice("Question added to the draft review queue. It is not visible to students yet.");
      onChanged();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to add the question.");
    } finally {
      setSaving(false);
    }
  }

  async function importCsv() {
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }
    setImporting(true);
    setError("");
    setNotice("");
    setProgress("Reading CSV…");
    let imported = 0;
    let skipped = 0;
    try {
      const parsed = Papa.parse<Record<string, string>>(await file.text(), {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (header) => header.trim(),
      });
      if (parsed.errors.length) {
        throw new Error(`CSV parsing failed near row ${parsed.errors[0]?.row ?? "?"}.`);
      }
      const fields = parsed.meta.fields ?? [];
      const missing = CSV_COLUMNS.filter((column) => column !== "term" && !fields.includes(column));
      if (missing.length) throw new Error(`CSV is missing columns: ${missing.join(", ")}.`);
      const rows = parsed.data.filter((row) => Object.values(row).some((value) => value?.trim()));
      if (!rows.length) throw new Error("The CSV has no question rows.");
      if (rows.length > MAX_FILE_ROWS) {
        throw new Error(`Upload at most ${MAX_FILE_ROWS.toLocaleString()} questions at a time.`);
      }
      if (
        !window.confirm(
          `Import ${rows.length.toLocaleString()} candidate questions into this database as drafts? They will remain hidden from students until individually reviewed and approved. Confirm this is the intended database before continuing.`,
        )
      ) {
        setProgress("");
        return;
      }

      const rowErrors: string[] = [];
      const batches = Math.ceil(rows.length / IMPORT_BATCH_SIZE);
      for (let start = 0; start < rows.length; start += IMPORT_BATCH_SIZE) {
        const batch = rows.slice(start, start + IMPORT_BATCH_SIZE);
        setProgress(`Importing batch ${Math.floor(start / IMPORT_BATCH_SIZE) + 1} of ${batches}…`);
        const response = await fetch("/api/admin/cbt/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch }),
        });
        const payload = await readJsonResponse<ImportPayload>(response);
        if (!response.ok) throw new Error(payload.error || "The question import failed.");
        imported += payload.imported ?? 0;
        skipped += payload.skipped ?? 0;
        for (const message of payload.errors ?? []) {
          if (rowErrors.length < 12) {
            rowErrors.push(`Batch ${Math.floor(start / IMPORT_BATCH_SIZE) + 1}: ${message}`);
          }
        }
      }
      setProgress("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setNotice(
        `Import finished: ${imported.toLocaleString()} added as drafts; ${skipped.toLocaleString()} skipped.` +
          (rowErrors.length ? ` ${rowErrors.join(" ")}` : ""),
      );
      onChanged();
    } catch (importError) {
      setProgress("");
      const detail =
        importError instanceof Error ? importError.message : "The question import failed.";
      const partial = imported
        ? `${imported.toLocaleString()} questions were already added as drafts; you can retry the file because matching stems are skipped. `
        : "";
      setError(`${partial}${detail}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <form
        onSubmit={(event) => void createQuestion(event)}
        className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-green">
            Add a question
          </p>
          <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)]">Create draft</h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            New questions are drafts. Students cannot practice them until a reviewer verifies the
            answer and records a source citation.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            Subject name
            <input
              required
              minLength={2}
              value={draft.subjectName}
              onChange={(event) => setDraft({ ...draft, subjectName: event.target.value })}
              placeholder="Mathematics"
              className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
            />
          </label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            Subject slug
            <input
              required
              pattern="[A-Za-z0-9]+(-[A-Za-z0-9]+)*"
              value={draft.subjectSlug}
              onChange={(event) => setDraft({ ...draft, subjectSlug: event.target.value })}
              placeholder="mathematics-jss1"
              className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
            />
          </label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            Class level
            <select
              value={draft.classLevel}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  classLevel: event.target.value as QuestionDraft["classLevel"],
                })
              }
              className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
            >
              {CBT_CLASS_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            Difficulty
            <select
              value={draft.difficulty}
              onChange={(event) => setDraft({ ...draft, difficulty: Number(event.target.value) })}
              className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
            >
              <option value={1}>Easy · 1</option>
              <option value={2}>Medium · 2</option>
              <option value={3}>Hard · 3</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            Term
            <select
              value={draft.term}
              onChange={(event) =>
                setDraft({ ...draft, term: event.target.value as QuestionDraft["term"] })
              }
              className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
            >
              <option value="">Unassigned</option>
              <option value="first">First term</option>
              <option value="second">Second term</option>
              <option value="third">Third term</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">
            Topic
            <input
              required
              minLength={2}
              maxLength={240}
              value={draft.topic}
              onChange={(event) => setDraft({ ...draft, topic: event.target.value })}
              className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
            />
          </label>
        </div>
        <label className="block text-xs font-semibold text-[var(--text-muted)]">
          Question stem
          <textarea
            required
            minLength={5}
            rows={2}
            value={draft.stem}
            onChange={(event) => setDraft({ ...draft, stem: event.target.value })}
            className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
          />
        </label>
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-2 text-xs font-semibold text-[var(--text-muted)]">
            Answer choices (select the proposed answer)
          </legend>
          {draft.options.map((option, index) => (
            <label
              key={index}
              className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] p-2"
            >
              <input
                type="radio"
                name="new-question-correct-index"
                checked={draft.correctIndex === index}
                onChange={() => setDraft({ ...draft, correctIndex: index })}
                aria-label={`Mark option ${String.fromCharCode(65 + index)} as the answer`}
              />
              <span className="text-xs font-bold text-brand-green">
                {String.fromCharCode(65 + index)}.
              </span>
              <input
                required
                value={option}
                onChange={(event) => {
                  const options = [...draft.options];
                  options[index] = event.target.value;
                  setDraft({ ...draft, options });
                }}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--input-text)] outline-none"
              />
            </label>
          ))}
        </fieldset>
        <label className="block text-xs font-semibold text-[var(--text-muted)]">
          Explanation
          <textarea
            required
            minLength={40}
            rows={3}
            value={draft.explanation}
            onChange={(event) => setDraft({ ...draft, explanation: event.target.value })}
            className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="text-sm text-brand-green">
            {notice}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-green px-4 py-2 text-xs font-bold text-brand-navy disabled:opacity-50"
        >
          {saving ? "Saving draft…" : "Add to draft queue"}
        </button>
      </form>

      <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-green">
            Bulk question bank
          </p>
          <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)]">
            Import CSV in batches
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            Select `prisma/cbt-bank-10k-draft.csv` from a trusted local copy and upload it in
            batches. Imports are draft-only; the file is not automatically fact-checked or made
            available to students. Confirm this deployment is connected to the intended isolated
            database before uploading.
          </p>
        </div>
        <label className="block text-xs font-semibold text-[var(--text-muted)]">
          CSV file
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            disabled={importing}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError("");
              setNotice("");
            }}
            className="mt-2 block w-full text-sm text-[var(--text-primary)] file:mr-3 file:rounded-full file:border-0 file:bg-brand-green file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
          />
        </label>
        {file ? (
          <p className="text-xs text-[var(--text-muted)]">
            {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>
        ) : null}
        {progress ? (
          <p role="status" className="text-sm text-brand-green">
            {progress}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void importCsv()}
          disabled={!file || importing}
          className="rounded-full border border-brand-green/40 bg-brand-green/5 px-4 py-2 text-xs font-bold text-[var(--text-primary)] disabled:opacity-50"
        >
          {importing ? "Importing…" : "Import as drafts"}
        </button>
        <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
          Required headers: subjectSlug, subjectName, classLevel, topic, difficulty, stem, optionA,
          optionB, optionC, optionD, correctIndex, explanation. Optional: term (first/second/third).
          Each batch is capped at 200 rows; imports support up to 25,000 rows.
        </p>
      </div>
    </section>
  );
}
