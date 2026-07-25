"use client";

import { useState, useRef, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import PortalTopbar from "@/components/PortalTopbar";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  LoaderCircle,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Database,
  RefreshCcw,
  Info,
  X,
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type QuestionType = "MCQ" | "TRUE_FALSE" | "FILL_BLANK" | "ESSAY";
type FileFormat = "csv" | "json" | "xlsx";

interface ParsedQuestion {
  type: QuestionType;
  questionText: string;
  options: { key: string; text: string }[] | null;
  correctKey: string | null;
  correctText: string | null;
  marks: number;
  explanation?: string;
  topic?: string;
  difficulty?: string;
}

interface ParseResult {
  questions: ParsedQuestion[];
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
  stats: {
    total: number;
    valid: number;
    mcq: number;
    trueFalse: number;
    fillBlank: number;
    essay: number;
  };
}

const CSV_TEMPLATE = `type,question,option_a,option_b,option_c,option_d,correct,marks,topic,difficulty,explanation
MCQ,What is the capital of Nigeria?,Lagos,Abuja,Kano,Port Harcourt,B,2,Geography,Easy,Abuja became the capital in 1991
MCQ,Which planet is closest to the Sun?,Venus,Mars,Mercury,Jupiter,C,1,Science,Medium,
TRUE_FALSE,Water boils at 100 degrees Celsius at sea level,,,,, TRUE,1,Science,Easy,
FILL_BLANK,The process by which plants make food is called ______,,,,, photosynthesis,2,Science,Medium,Plants use sunlight and CO2
ESSAY,Explain the causes and effects of deforestation in Nigeria,,,,, ,10,Environmental Science,Hard,`;

const JSON_TEMPLATE = JSON.stringify(
  [
    {
      type: "MCQ",
      question: "What is 2+2?",
      option_a: "3",
      option_b: "4",
      option_c: "5",
      option_d: "6",
      correct: "B",
      marks: 1,
    },
    { type: "TRUE_FALSE", question: "The Earth is flat.", correct: "FALSE", marks: 1 },
    {
      type: "FILL_BLANK",
      question: "H2O is the chemical formula for ______.",
      correct: "water",
      marks: 2,
    },
    { type: "ESSAY", question: "Discuss the impact of technology on education.", marks: 10 },
  ],
  null,
  2,
);

const TYPE_COLORS: Record<QuestionType, string> = {
  MCQ: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  TRUE_FALSE: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  FILL_BLANK: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  ESSAY: "bg-pink-500/10 text-pink-500 border-pink-500/30",
};

export default function UploadQuestionsPage() {
  const { toast } = useToast();
  const { data } = useApi<any>("/api/teacher/profile");
  const teacher = data?.teacher || ({} as any);

  // Exam selection
  const { data: examData, refetch: refetchExams } = useApi<any>("/api/teacher/exams");
  const [selectedExamId, setSelectedExamId] = useState("");

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [fileFormat, setFileFormat] = useState<FileFormat>("csv");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse result
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parsing, setParsing] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    ok: boolean;
    message: string;
    created?: number;
    totalQuestions?: number;
    totalMarks?: number;
  } | null>(null);

  // Preview toggle
  const [previewOpen, setPreviewOpen] = useState(true);

  const subjects = [...new Set((teacher.subjectAssignments || []).map((sa: any) => sa.subject))];

  // ── File parsing ────────────────────────────────────────────
  const parseFile = useCallback(
    async (f: File, format: FileFormat) => {
      setParsing(true);
      setParseResult(null);
      setSyncResult(null);

      try {
        let result: ParseResult;

        if (format === "csv") {
          const text = await f.text();
          result = parseCSVContent(text);
        } else if (format === "json") {
          const text = await f.text();
          result = parseJSONContent(text);
        } else {
          const buffer = await f.arrayBuffer();
          result = parseXLSXContent(buffer);
        }

        setParseResult(result);
        if (result.errors.length > 0) {
          toast(`${result.errors.length} error(s) found. Fix and re-upload.`, "error");
        } else if (result.warnings.length > 0) {
          toast(
            `${result.questions.length} questions parsed with ${result.warnings.length} warning(s).`,
            "success",
          );
        } else {
          toast(`${result.questions.length} questions parsed successfully!`, "success");
        }
      } catch (err) {
        toast("Failed to parse file. Check the format.", "error");
      } finally {
        setParsing(false);
      }
    },
    [toast],
  );

  // ── CSV parser ──────────────────────────────────────────────
  function parseCSVContent(content: string): ParseResult {
    const parsed = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) =>
        h
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_"),
    });
    return validateRows(
      parsed.data,
      parsed.errors.map((e: any) => ({ row: e.row ?? 0, message: e.message ?? "Parse error" })),
    );
  }

  // ── JSON parser ─────────────────────────────────────────────
  function parseJSONContent(content: string): ParseResult {
    let data: Record<string, unknown>[];
    try {
      const j = JSON.parse(content);
      data = Array.isArray(j) ? j : (j.questions ?? []);
    } catch {
      return {
        questions: [],
        errors: [{ row: 0, message: "Invalid JSON." }],
        warnings: [],
        stats: { total: 0, valid: 0, mcq: 0, trueFalse: 0, fillBlank: 0, essay: 0 },
      };
    }
    return validateRows(
      data.map((row) => {
        const r: Record<string, string> = {};
        for (const [k, v] of Object.entries(row))
          r[
            k
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "_")
          ] = String(v ?? "");
        return r;
      }),
      [],
    );
  }

  // ── XLSX parser ─────────────────────────────────────────────
  function parseXLSXContent(buffer: ArrayBuffer): ParseResult {
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet)
      return {
        questions: [],
        errors: [{ row: 0, message: "No sheet found." }],
        warnings: [],
        stats: { total: 0, valid: 0, mcq: 0, trueFalse: 0, fillBlank: 0, essay: 0 },
      };
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
    return validateRows(
      rows.map((row) => {
        const r: Record<string, string> = {};
        for (const [k, v] of Object.entries(row))
          r[
            k
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "_")
          ] = String(v ?? "");
        return r;
      }),
      [],
    );
  }

  // ── Shared validation ───────────────────────────────────────
  function validateRows(
    rows: Record<string, string>[],
    csvErrors: { row: number; message: string }[],
  ): ParseResult {
    const questions: ParsedQuestion[] = [];
    const errors: { row: number; message: string }[] = [...csvErrors];
    const warnings: { row: number; message: string }[] = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const type = (row.type || "").trim().toUpperCase().replace(/[\s-]/g, "_");
      const questionText = (row.question || row.question_text || "").trim();
      const optA = (row.option_a || row.optiona || row.a || "").trim();
      const optB = (row.option_b || row.optionb || row.b || "").trim();
      const optC = (row.option_c || row.optionc || row.c || "").trim();
      const optD = (row.option_d || row.optiond || row.d || "").trim();
      const correct = (row.correct || row.correct_answer || row.answer || "").trim();
      const marks = Math.max(1, Math.min(20, parseInt(row.marks || "1", 10) || 1));
      const topic = (row.topic || "").trim();
      const difficulty = (row.difficulty || "").trim();
      const explanation = (row.explanation || "").trim();

      if (!type && !questionText) return;
      if (!["MCQ", "TRUE_FALSE", "FILL_BLANK", "ESSAY"].includes(type)) {
        errors.push({ row: rowNum, message: `Invalid type "${type}".` });
        return;
      }
      if (!questionText) {
        errors.push({ row: rowNum, message: "Question text required." });
        return;
      }

      switch (type as QuestionType) {
        case "MCQ": {
          const opts = [
            { key: "A", text: optA },
            { key: "B", text: optB },
            { key: "C", text: optC },
            { key: "D", text: optD },
          ].filter((o) => o.text);
          if (opts.length < 2) {
            errors.push({ row: rowNum, message: "MCQ needs at least 2 options." });
            return;
          }
          const ck = correct.toUpperCase();
          if (!["A", "B", "C", "D"].includes(ck) || !opts.some((o) => o.key === ck)) {
            errors.push({ row: rowNum, message: `Correct "${correct}" doesn't match options.` });
            return;
          }
          if (opts.length < 4)
            warnings.push({ row: rowNum, message: `Only ${opts.length}/4 options.` });
          questions.push({
            type: "MCQ",
            questionText,
            options: opts,
            correctKey: ck,
            correctText: null,
            marks,
            explanation: explanation || undefined,
            topic: topic || undefined,
            difficulty: difficulty || undefined,
          });
          break;
        }
        case "TRUE_FALSE": {
          const ck = correct.toUpperCase();
          if (ck !== "TRUE" && ck !== "FALSE") {
            errors.push({ row: rowNum, message: `Must be TRUE or FALSE.` });
            return;
          }
          questions.push({
            type: "TRUE_FALSE",
            questionText,
            options: [
              { key: "TRUE", text: "True" },
              { key: "FALSE", text: "False" },
            ],
            correctKey: ck,
            correctText: null,
            marks,
            explanation: explanation || undefined,
          });
          break;
        }
        case "FILL_BLANK": {
          if (!correct) {
            errors.push({ row: rowNum, message: "Fill blank answer required." });
            return;
          }
          if (!questionText.includes("___"))
            warnings.push({ row: rowNum, message: 'Add "______" placeholder.' });
          questions.push({
            type: "FILL_BLANK",
            questionText,
            options: null,
            correctKey: null,
            correctText: correct,
            marks,
            explanation: explanation || undefined,
          });
          break;
        }
        case "ESSAY":
          questions.push({
            type: "ESSAY",
            questionText,
            options: null,
            correctKey: null,
            correctText: null,
            marks: Math.max(marks, 5),
            explanation: explanation || undefined,
          });
          break;
      }
    });

    return {
      questions,
      errors,
      warnings,
      stats: {
        total: rows.filter((r) => r.type || r.question).length,
        valid: questions.length,
        mcq: questions.filter((q) => q.type === "MCQ").length,
        trueFalse: questions.filter((q) => q.type === "TRUE_FALSE").length,
        fillBlank: questions.filter((q) => q.type === "FILL_BLANK").length,
        essay: questions.filter((q) => q.type === "ESSAY").length,
      },
    };
  }

  // ── Sync to database ────────────────────────────────────────
  async function syncToDatabase() {
    if (!parseResult || parseResult.questions.length === 0 || !selectedExamId) return;
    setSyncing(true);
    setSyncResult(null);

    try {
      const r = await fetch("/api/teacher/questions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExamId,
          questions: parseResult.questions,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Sync failed.");
      setSyncResult({
        ok: true,
        message: j.message,
        created: j.created,
        totalQuestions: j.totalQuestions,
        totalMarks: j.totalMarks,
      });
      toast(j.message, "success");
      refetchExams();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed.";
      setSyncResult({ ok: false, message: msg });
      toast(msg, "error");
    } finally {
      setSyncing(false);
    }
  }

  // ── Template downloads ──────────────────────────────────────
  function downloadTemplate(format: FileFormat) {
    if (format === "csv") {
      const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
      downloadBlob(blob, "ykay-question-template.csv");
    } else if (format === "json") {
      const blob = new Blob([JSON_TEMPLATE], { type: "application/json" });
      downloadBlob(blob, "ykay-question-template.json");
    } else {
      // Generate XLSX template
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        [
          "type",
          "question",
          "option_a",
          "option_b",
          "option_c",
          "option_d",
          "correct",
          "marks",
          "topic",
          "difficulty",
          "explanation",
        ],
        [
          "MCQ",
          "What is the capital of Nigeria?",
          "Lagos",
          "Abuja",
          "Kano",
          "Port Harcourt",
          "B",
          2,
          "Geography",
          "Easy",
          "Abuja became the capital in 1991",
        ],
        [
          "TRUE_FALSE",
          "Water boils at 100°C at sea level",
          "",
          "",
          "",
          "",
          "TRUE",
          1,
          "Science",
          "Easy",
          "",
        ],
        [
          "FILL_BLANK",
          "Photosynthesis occurs in the ______",
          "",
          "",
          "",
          "",
          "chloroplast",
          2,
          "Biology",
          "Medium",
          "",
        ],
        ["ESSAY", "Explain the water cycle", "", "", "", "", "", 10, "Science", "Hard", ""],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Questions");
      XLSX.writeFile(wb, "ykay-question-template.xlsx");
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── File handlers ───────────────────────────────────────────
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (ext === "csv") setFileFormat("csv");
      else if (ext === "json") setFileFormat("json");
      else if (ext === "xlsx" || ext === "xls") setFileFormat("xlsx");
      void parseFile(f, ext === "json" ? "json" : ext === "csv" ? "csv" : "xlsx");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      void parseFile(f, fileFormat);
    }
  }

  function resetAll() {
    setFile(null);
    setParseResult(null);
    setSyncResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const selectedExam = examData?.exams?.find((e: any) => e.id === selectedExamId);

  return (
    <>
      <PortalTopbar title="Upload Questions" />
      <main className="mx-auto flex max-w-[1600px] gap-8 px-4 py-6 sm:px-6">
        <TeacherSidebar />
        <section className="min-w-0 flex-1 space-y-6">
          {/* Header */}
          <div className="rounded-[2rem] bg-brand-navy p-7 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-green">
              Exam Management
            </p>
            <h1 className="mt-2 font-display text-4xl tracking-widest">
              UPLOAD <span className="text-brand-green">QUESTIONS</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/65">
              Upload questions in CSV, JSON, or Excel format. Supports MCQ, True/False,
              Fill-in-the-Blank, and Essay questions. Preview and validate before syncing to the
              exam.
            </p>
          </div>

          {/* Step 1: Select exam */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-xs text-white">
                1
              </span>
              Select Exam
            </h2>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full max-w-lg rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm"
            >
              <option value="">Choose an exam...</option>
              {(examData?.exams || []).map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.title} — {e.className} ({e.questionCount} questions, {e.totalMarks} marks)
                </option>
              ))}
            </select>
            {selectedExam && (
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-brand-green/5 border border-brand-green/20 p-3 text-sm">
                <Info size={14} className="text-brand-green" />
                <span>
                  <b>{selectedExam.title}</b> currently has <b>{selectedExam.questionCount}</b>{" "}
                  questions ({selectedExam.totalMarks} marks).
                </span>
              </div>
            )}
          </div>

          {/* Step 2: Download template */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-xs text-white">
                2
              </span>
              Download Template
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["csv", "json", "xlsx"] as FileFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => downloadTemplate(fmt)}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] p-4 text-left transition hover:border-brand-green hover:bg-brand-green/5"
                >
                  {fmt === "csv" ? (
                    <File size={20} className="text-brand-orange" />
                  ) : fmt === "json" ? (
                    <FileText size={20} className="text-blue-500" />
                  ) : (
                    <FileSpreadsheet size={20} className="text-brand-green" />
                  )}
                  <div>
                    <div className="text-sm font-bold">{fmt.toUpperCase()} Template</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {fmt === "csv"
                        ? "Comma-separated"
                        : fmt === "json"
                          ? "JSON array"
                          : "Excel spreadsheet"}
                    </div>
                  </div>
                  <Download size={14} className="ml-auto text-[var(--text-muted)]" />
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Upload file */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-xs text-white">
                  3
                </span>
                Upload & Parse
              </h2>
              {file && (
                <button
                  onClick={resetAll}
                  className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/20"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>

            {/* Format selector */}
            <div className="mb-4 flex gap-2">
              {(["csv", "json", "xlsx"] as FileFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFileFormat(fmt)}
                  className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                    fileFormat === fmt
                      ? "bg-brand-green text-white"
                      : "bg-[var(--surface-disabled)] text-[var(--text-secondary)]"
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
                dragging
                  ? "border-brand-green bg-brand-green/5"
                  : "border-[var(--border-subtle)] hover:border-brand-green/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={
                  fileFormat === "csv" ? ".csv" : fileFormat === "json" ? ".json" : ".xlsx,.xls"
                }
                onChange={handleFileChange}
                className="hidden"
              />
              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <LoaderCircle className="animate-spin text-brand-green" size={32} />
                  <p className="text-sm text-[var(--text-muted)]">Parsing {file?.name}...</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText size={32} className="text-brand-green" />
                  <p className="font-bold text-[var(--text-primary)]">{file.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {(file.size / 1024).toFixed(1)} KB · {fileFormat.toUpperCase()}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload size={32} className="text-[var(--text-muted)]" />
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    Drop your {fileFormat.toUpperCase()} file here
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">or click to browse</p>
                </div>
              )}
            </div>
          </div>

          {/* Parse results */}
          {parseResult && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 text-center">
                  <div className="text-2xl font-bold text-brand-green">
                    {parseResult.stats.valid}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Valid
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 text-center">
                  <div className="text-2xl font-bold text-blue-500">{parseResult.stats.mcq}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    MCQ
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 text-center">
                  <div className="text-2xl font-bold text-purple-500">
                    {parseResult.stats.trueFalse}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    True/False
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {parseResult.stats.fillBlank}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Fill Blank
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 text-center">
                  <div className="text-2xl font-bold text-pink-500">{parseResult.stats.essay}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Essay
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 text-center">
                  <div className="text-2xl font-bold text-red-500">{parseResult.errors.length}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Errors
                  </div>
                </div>
              </div>

              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-red-500">
                    <AlertCircle size={16} /> {parseResult.errors.length} Error(s) — Fix and
                    re-upload
                  </h3>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {parseResult.errors.map((err, i) => (
                      <div key={i} className="text-xs text-red-400">
                        <span className="font-bold">Row {err.row}:</span> {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {parseResult.warnings.length > 0 && (
                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-yellow-500">
                    <AlertTriangle size={16} /> {parseResult.warnings.length} Warning(s)
                  </h3>
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {parseResult.warnings.map((w, i) => (
                      <div key={i} className="text-xs text-yellow-400">
                        <span className="font-bold">Row {w.row}:</span> {w.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question preview */}
              {parseResult.questions.length > 0 && (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6">
                  <button
                    onClick={() => setPreviewOpen(!previewOpen)}
                    className="mb-4 flex w-full items-center justify-between"
                  >
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      <Eye size={14} /> Question Preview ({parseResult.questions.length})
                    </h3>
                    {previewOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {previewOpen && (
                    <div className="max-h-[500px] space-y-3 overflow-y-auto pr-2">
                      {parseResult.questions.map((q, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-[var(--border-subtle)] p-4"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--text-muted)]">
                              Q{idx + 1}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${TYPE_COLORS[q.type]}`}
                            >
                              {q.type.replace("_", "/")}
                            </span>
                            <span className="ml-auto text-[10px] font-bold text-brand-green">
                              {q.marks} mark{q.marks > 1 ? "s" : ""}
                            </span>
                            {q.topic && (
                              <span className="text-[10px] text-[var(--text-muted)]">
                                {q.topic}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--text-primary)]">{q.questionText}</p>
                          {q.options && (
                            <div className="mt-2 space-y-1">
                              {q.options.map((opt) => (
                                <div
                                  key={opt.key}
                                  className={`flex items-center gap-2 rounded-lg p-2 text-xs ${
                                    opt.key === q.correctKey
                                      ? "bg-brand-green/10 text-brand-green font-bold"
                                      : "text-[var(--text-secondary)]"
                                  }`}
                                >
                                  <span className="font-bold">{opt.key}.</span> {opt.text}
                                  {opt.key === q.correctKey && (
                                    <CheckCircle2 size={12} className="ml-auto" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {q.correctText && (
                            <div className="mt-2 rounded-lg bg-brand-green/10 p-2 text-xs font-bold text-brand-green">
                              Answer: {q.correctText}
                            </div>
                          )}
                          {q.explanation && (
                            <div className="mt-2 text-[11px] text-[var(--text-muted)]">
                              <b>Explanation:</b> {q.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sync button */}
              {parseResult.questions.length > 0 &&
                parseResult.errors.length === 0 &&
                selectedExamId && (
                  <div className="flex items-center justify-between rounded-2xl border border-brand-green/30 bg-brand-green/5 p-6">
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)]">
                        Ready to sync {parseResult.questions.length} questions
                      </h3>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Questions will be added to <b>{selectedExam?.title}</b> in a single atomic
                        transaction.
                        {selectedExam && ` Current total: ${selectedExam.questionCount} questions.`}
                      </p>
                    </div>
                    <button
                      onClick={() => void syncToDatabase()}
                      disabled={syncing}
                      className="flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-green/20 transition hover:bg-brand-green/90 disabled:opacity-50"
                    >
                      {syncing ? (
                        <LoaderCircle className="animate-spin" size={16} />
                      ) : (
                        <Database size={16} />
                      )}
                      {syncing ? "Syncing..." : "Sync to Database"}
                    </button>
                  </div>
                )}

              {!selectedExamId && parseResult.questions.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-sm text-yellow-600">
                  <AlertTriangle size={16} /> Select an exam above to sync these questions.
                </div>
              )}

              {/* Sync result */}
              {syncResult && (
                <div
                  className={`rounded-2xl border p-6 ${syncResult.ok ? "border-brand-green/30 bg-brand-green/5" : "border-red-500/30 bg-red-500/5"}`}
                >
                  <div className="flex items-center gap-3">
                    {syncResult.ok ? (
                      <CheckCircle2 size={24} className="text-brand-green" />
                    ) : (
                      <AlertCircle size={24} className="text-red-500" />
                    )}
                    <div>
                      <h3
                        className={`font-bold ${syncResult.ok ? "text-brand-green" : "text-red-500"}`}
                      >
                        {syncResult.message}
                      </h3>
                      {syncResult.ok && (
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {syncResult.created} new questions · {syncResult.totalQuestions} total ·{" "}
                          {syncResult.totalMarks} total marks
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
