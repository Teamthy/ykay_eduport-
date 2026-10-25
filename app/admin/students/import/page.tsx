"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
import PortalTopbar from "@/components/PortalTopbar";
import { readXlsxRows } from "@/lib/xlsx-read";
import {
  parseStudentSheet,
  planStudentImport,
  resultsCsv,
  STUDENT_IMPORT_COLUMNS,
  type ImportClass,
  type ImportPlan,
  type ImportSubject,
  type RawStudentRow,
} from "@/lib/student-import";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
  Users,
} from "lucide-react";

/**
 * Bulk student onboarding.
 *
 * Three ways in, because three is what people actually have:
 *   • an .xlsx workbook (read in the browser — the file never leaves the tab),
 *   • a .csv file,
 *   • cells copied out of Excel and pasted here (tab-separated).
 *
 * The preview runs the same planner the server runs, so what the admin sees is
 * what the commit will do — including the classes and subjects each child will
 * actually be enrolled in. Committing is chunked at 200 rows a request, and
 * every outcome (created / skipped / failed) is shown with its sheet line
 * number so a rejected row can be found and fixed.
 */

type Context = {
  classes: ImportClass[];
  subjects: ImportSubject[];
  currentSession: { id: string; label: string } | null;
  existingCount: number;
  template: string;
  limits: { maxRowsPerRequest: number };
};

type OutcomeRow = {
  line: number;
  name: string;
  className: string;
  status: "created" | "skipped" | "failed";
  detail: string;
  studentNumber?: string;
  subjects?: string;
  studentLogin?: { email: string; temporaryPassword: string } | null;
  parentLogin?: { email: string; temporaryPassword: string } | null;
};

type BatchResponse = {
  totals: { rows: number; created: number; skipped: number; failed: number };
  rows: OutcomeRow[];
};

const CHUNK = 200;

export default function StudentImportPage() {
  const [context, setContext] = useState<Context | null>(null);
  const [rows, setRows] = useState<RawStudentRow[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [pasteValue, setPasteValue] = useState("");
  const [busy, setBusy] = useState<"idle" | "reading" | "importing">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const [results, setResults] = useState<OutcomeRow[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/admin/students/import", { cache: "no-store" });
      const body = await response.json();
      if (response.ok) setContext(body);
      else setError(body.error || "Could not load classes and subjects.");
    })();
  }, []);

  const plan: ImportPlan | null = useMemo(() => {
    if (!context || !rows.length) return null;
    return planStudentImport(rows, {
      classes: context.classes,
      subjects: context.subjects,
      // The preview cannot know the roster (that is the server's job). It plans
      // against an empty one; the server re-plans against the real registry and
      // reports "skipped" for students who already exist.
      existing: [],
    });
  }, [context, rows]);

  const applySheet = useCallback((text: string, name: string) => {
    const parsed = parseStudentSheet(text);
    setFileName(name);
    setFileErrors(parsed.fileErrors);
    setRows(parsed.rows);
    setResults(null);
    setError("");
  }, []);

  async function onFile(file: File) {
    setBusy("reading");
    setError("");
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const table = await readXlsxRows(await file.arrayBuffer());
        // Re-join as TSV so .xlsx and paste share one parser and one set of rules.
        applySheet(table.map((row) => row.join("\t")).join("\n"), file.name);
      } else if (/\.(csv|tsv|txt)$/i.test(file.name)) {
        applySheet(await file.text(), file.name);
      } else {
        setError("Upload an .xlsx, .csv or .tsv file — or paste the cells below.");
      }
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "Could not read that file.");
    } finally {
      setBusy("idle");
    }
  }

  async function commit() {
    if (!plan) return;
    const importable = plan.rows.filter((row) => !row.errors.length && row.action === "create");
    if (!importable.length) {
      setError("Nothing to import: every row is either invalid or already enrolled.");
      return;
    }
    setBusy("importing");
    setError("");
    setResults([]);
    setProgress({ done: 0, total: importable.length });

    // The server re-plans from the raw cells, so send those — not the resolved
    // plan. The subjects column has to survive the round trip or the electives
    // silently disappear.
    const rawByLine = new Map(rows.map((row) => [row.line, row]));
    const collected: OutcomeRow[] = [];
    try {
      // Only rows the plan will create are sent; invalid and duplicate rows are
      // already accounted for in the results below.
      for (let index = 0; index < importable.length; index += CHUNK) {
        const batch = importable.slice(index, index + CHUNK);
        const response = await fetch("/api/admin/students/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commit: true,
            rows: batch
              .map((row) => rawByLine.get(row.line))
              .filter((row): row is RawStudentRow => Boolean(row)),
          }),
        });
        const body = (await response.json()) as BatchResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || `Import failed (${response.status}).`);
        collected.push(...body.rows);
        setResults([...collected]);
        setProgress({ done: Math.min(index + CHUNK, importable.length), total: importable.length });
      }
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "The import did not finish.");
    } finally {
      setBusy("idle");
    }
  }

  function download(name: string, contents: string) {
    const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const totals = useMemo(() => {
    if (!results) return null;
    return {
      created: results.filter((row) => row.status === "created").length,
      skipped: results.filter((row) => row.status === "skipped").length,
      failed: results.filter((row) => row.status === "failed").length,
    };
  }, [results]);

  return (
    <>
      <PortalTopbar title="Import students" />
      <section className="px-6 py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:flex-row">
          <AdminSidebar />
          <main className="min-w-0 flex-1 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Link
                  href="/admin/students"
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <ArrowLeft size={14} /> Students
                </Link>
                <h1 className="mt-2 font-display text-4xl text-[var(--text-primary)]">
                  Import a class list
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                  Upload an Excel workbook or CSV, or paste cells copied out of a spreadsheet. Each
                  student is enrolled into their class, the subjects for that class level, the
                  current session, and linked to their guardian&apos;s account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => download("student-import-template.csv", context?.template ?? "")}
                disabled={!context}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-[var(--text-primary)] disabled:opacity-50"
              >
                <Download size={15} /> Template
              </button>
            </div>

            {context ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Classes" value={context.classes.length} />
                <Stat label="Subjects" value={context.subjects.length} />
                <Stat
                  label="Session"
                  value={context.currentSession?.label ?? "None set"}
                  hint={
                    context.currentSession
                      ? "Each student is placed in this session"
                      : "Students get no session enrolment until one is current"
                  }
                />
              </div>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="rounded-2xl border border-[var(--border-error)] bg-[var(--bg-elevated)] p-4 text-sm text-[var(--text-primary)]"
              >
                {error}
              </p>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
                <h2 className="flex items-center gap-2 font-display text-xl text-[var(--text-primary)]">
                  <FileSpreadsheet size={18} /> Excel or CSV
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  .xlsx is read in your browser; the file is never uploaded. The first worksheet is
                  used and the header row must name the columns — the template shows what is
                  expected.
                </p>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".xlsx,.csv,.tsv,text/csv"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onFile(file);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-brand-navy"
                >
                  {busy === "reading" ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <Upload size={15} />
                  )}
                  Choose file
                </button>
                {fileName ? (
                  <p className="mt-3 truncate text-xs text-[var(--text-secondary)]">
                    {fileName} · {rows.length.toLocaleString()} row(s)
                  </p>
                ) : null}
              </div>

              <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
                <h2 className="flex items-center gap-2 font-display text-xl text-[var(--text-primary)]">
                  <Users size={18} /> Paste cells
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Select the cells in Excel or Google Sheets, copy, and paste here. Tab-separated
                  text is detected automatically.
                </p>
                <textarea
                  value={pasteValue}
                  onChange={(event) => setPasteValue(event.target.value)}
                  rows={5}
                  placeholder={"First name\tSurname\tClass\nChidera\tOkafor\tJSS 1A"}
                  className="mt-3 w-full rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 font-mono text-xs text-[var(--input-text)]"
                />
                <button
                  type="button"
                  disabled={!pasteValue.trim()}
                  onClick={() => applySheet(pasteValue, "Pasted cells")}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-[var(--text-primary)] disabled:opacity-50"
                >
                  Use pasted rows
                </button>
              </div>
            </div>

            {fileErrors.length ? (
              <div className="rounded-2xl border border-[var(--border-error)] p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                  <AlertTriangle size={16} /> This sheet cannot be imported yet
                </p>
                <ul className="mt-2 list-disc pl-5 text-sm text-[var(--text-secondary)]">
                  {fileErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Required columns:{" "}
                  {STUDENT_IMPORT_COLUMNS.filter((c) => c.required)
                    .map((c) => c.label)
                    .join(", ")}
                  .
                </p>
              </div>
            ) : null}

            {plan ? (
              <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] p-5">
                  <div>
                    <h2 className="font-display text-xl text-[var(--text-primary)]">Preview</h2>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {plan.totals.create} ready · {plan.totals.skip} duplicate ·{" "}
                      {plan.totals.invalid} need fixing · {plan.totals.warnings} with warnings
                      {plan.totals.parentsToCreate
                        ? ` · up to ${plan.totals.parentsToCreate} new parent account(s)`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void commit()}
                    disabled={busy !== "idle" || plan.totals.create === 0}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-xs font-bold uppercase tracking-widest text-brand-navy disabled:opacity-50"
                  >
                    {busy === "importing" ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    {busy === "importing"
                      ? `Importing ${progress.done}/${progress.total}`
                      : `Import ${plan.totals.create} student(s)`}
                  </button>
                </div>

                <div className="max-h-[28rem] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-[var(--surface-disabled)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                      <tr>
                        <th className="p-3">Line</th>
                        <th className="p-3">Student</th>
                        <th className="p-3">Class</th>
                        <th className="p-3">Subjects</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.rows.map((row) => (
                        <tr key={row.line} className="border-t border-[var(--border-subtle)]">
                          <td className="p-3 font-mono text-xs text-[var(--text-muted)]">
                            {row.line}
                          </td>
                          <td className="p-3 text-[var(--text-primary)]">
                            {row.student.displayName || "(no name)"}
                          </td>
                          <td className="p-3 text-[var(--text-secondary)]">
                            {row.className ?? "—"}
                          </td>
                          <td className="p-3 text-xs text-[var(--text-secondary)]">
                            {row.subjectNames.length ? row.subjectNames.join(", ") : "—"}
                          </td>
                          <td className="p-3 text-xs">
                            {row.errors.length ? (
                              <span className="text-[var(--text-accent-warm)]">
                                {row.errors.join(" ")}
                              </span>
                            ) : row.action === "skip" ? (
                              <span className="text-[var(--text-muted)]">{row.reason}</span>
                            ) : row.warnings.length ? (
                              <span className="text-[var(--text-accent-warm)]">
                                Ready · {row.warnings.join(" ")}
                              </span>
                            ) : (
                              <span className="text-[var(--text-accent)]">Ready</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {results ? (
              <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] p-5">
                  <div>
                    <h2 className="font-display text-xl text-[var(--text-primary)]">Result</h2>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {totals?.created ?? 0} enrolled · {totals?.skipped ?? 0} skipped ·{" "}
                      {totals?.failed ?? 0} failed
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      download(
                        "student-import-results.csv",
                        resultsCsv(
                          results.map((row) => ({
                            line: row.line,
                            name: row.name,
                            className: row.className,
                            status: row.status,
                            detail: row.detail,
                            studentNumber: row.studentNumber,
                            subjects: row.subjects,
                          })),
                        ),
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]"
                  >
                    <Download size={15} /> Download results
                  </button>
                </div>

                <div className="max-h-[28rem] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-[var(--surface-disabled)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                      <tr>
                        <th className="p-3">Line</th>
                        <th className="p-3">Student</th>
                        <th className="p-3">Class</th>
                        <th className="p-3">Admission no.</th>
                        <th className="p-3">Logins created (show once)</th>
                        <th className="p-3">Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((row) => (
                        <tr
                          key={`${row.line}-${row.name}`}
                          className="border-t border-[var(--border-subtle)]"
                        >
                          <td className="p-3 font-mono text-xs text-[var(--text-muted)]">
                            {row.line}
                          </td>
                          <td className="p-3 text-[var(--text-primary)]">{row.name}</td>
                          <td className="p-3 text-[var(--text-secondary)]">{row.className}</td>
                          <td className="p-3 font-mono text-xs text-[var(--text-secondary)]">
                            {row.studentNumber ?? "—"}
                          </td>
                          <td className="p-3 text-xs text-[var(--text-secondary)]">
                            {row.studentLogin ? (
                              <span className="block">
                                Student: {row.studentLogin.email} /{" "}
                                <code>{row.studentLogin.temporaryPassword}</code>
                              </span>
                            ) : null}
                            {row.parentLogin ? (
                              <span className="block">
                                Parent: {row.parentLogin.email} /{" "}
                                <code>{row.parentLogin.temporaryPassword}</code>
                              </span>
                            ) : null}
                            {!row.studentLogin && !row.parentLogin ? "—" : null}
                          </td>
                          <td className="p-3 text-xs">
                            <span
                              className={
                                row.status === "created"
                                  ? "text-[var(--text-accent)]"
                                  : row.status === "skipped"
                                    ? "text-[var(--text-muted)]"
                                    : "text-[var(--text-accent-warm)]"
                              }
                            >
                              {row.status} — {row.detail}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="border-t border-[var(--border-subtle)] p-4 text-xs text-[var(--text-muted)]">
                  Temporary passwords are shown here once and are never stored. Download the results
                  file if you need to hand them out.
                </p>
              </div>
            ) : null}
          </main>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-[var(--text-primary)]">{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}
