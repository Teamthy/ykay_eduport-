"use client";

import { useState, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { CURRENT_TEACHER } from "@/lib/teacherData";
import { useToast } from "@/components/Toast";
import {
  Upload, School, BookOpen, FileText, CheckCircle2, Info,
  FileSpreadsheet, File, Download, AlertCircle
} from "lucide-react";

type FileFormat = "docx" | "xlsx" | "csv";

export default function UploadQuestionsPage() {
  const { toast } = useToast();
  const teacher = CURRENT_TEACHER;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [format, setFormat] = useState<FileFormat>("docx");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const allClasses = [...new Set(teacher.subjectAssignments.flatMap(sa => sa.classes))];
  const availableCourses = teacher.subjectAssignments.filter(sa => sa.classes.includes(selectedClass)).map(sa => sa.subject);

  const acceptedFormats: Record<FileFormat, string> = {
    docx: ".docx",
    xlsx: ".xlsx,.xls",
    csv: ".csv",
  };

  const formatInfo: Record<FileFormat, { name: string; icon: any; color: string; desc: string }> = {
    docx: { name: "Word Document", icon: FileText, color: "text-blue-500", desc: "Traditional format with Q/A/Correct labels" },
    xlsx: { name: "Excel Spreadsheet", icon: FileSpreadsheet, color: "text-brand-green", desc: "Structured columns for bulk upload" },
    csv: { name: "CSV File", icon: File, color: "text-brand-orange", desc: "Comma-separated values" },
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleUpload = () => {
    if (!selectedClass || !selectedCourse || !file) {
      toast("Please fill all fields and select a file", "warning");
      return;
    }
    toast(`Uploading ${file.name}...`, "info");
    setTimeout(() => {
      toast("Questions uploaded and validated successfully!", "success");
      setFile(null);
    }, 2000);
  };

  const templates = {
    docx: `Q: What is 2+2?
A: 1
B: 2
C: 3
D: 4
Correct: D

Q: Water freezes at what temperature?
A: 0°C
B: 32°C
C: 100°C
D: 273K
Correct: A`,
    xlsx: `Question | Option A | Option B | Option C | Option D | Correct
What is 2+2? | 1 | 2 | 3 | 4 | D
Water freezes at? | 0°C | 32°C | 100°C | 273K | A`,
    csv: `question,option_a,option_b,option_c,option_d,correct
"What is 2+2?","1","2","3","4","D"
"Water freezes at?","0°C","32°C","100°C","273K","A"`,
  };

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-3">
              <Upload size={11} /> Bulk Upload
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2 text-center">
              UPLOAD TEST <span className="text-brand-green">QUESTIONS</span>
            </h1>
            <p className="text-white/60 text-sm text-center">Bulk upload questions using DOCX, Excel, or CSV files</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Format Selector */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-3 flex items-center gap-1">
                  <FileText size={11} /> Select Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(formatInfo) as FileFormat[]).map(f => {
                    const info = formatInfo[f];
                    return (
                      <button
                        key={f}
                        onClick={() => setFormat(f)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${format === f ? "border-brand-green bg-brand-green/10" : "border-[var(--border-subtle)] hover:border-brand-green/30"}`}
                      >
                        <info.icon className={format === f ? "text-brand-green mb-2" : `${info.color} mb-2`} size={20} />
                        <div className="font-bold text-[var(--text-primary)] text-sm">{info.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-1">{info.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Class + Course */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                    <School size={11} /> Select Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={e => { setSelectedClass(e.target.value); setSelectedCourse(""); }}
                    className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                  >
                    <option value="">-- Select Class --</option>
                    {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                    <BookOpen size={11} /> Select Course
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={e => setSelectedCourse(e.target.value)}
                    disabled={!selectedClass}
                    className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green disabled:opacity-40"
                  >
                    <option value="">-- Select Course --</option>
                    {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Upload Zone */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                <div className="flex items-center gap-2 mb-4">
                  <Upload className="text-brand-green" size={18} />
                  <span className="font-bold text-[var(--text-primary)]">Upload {formatInfo[format].name}</span>
                </div>

                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${dragging ? "border-brand-green bg-brand-green/10" : "border-[var(--border-subtle)] hover:border-brand-green/50"}`}
                >
                  <input ref={fileInputRef} type="file" accept={acceptedFormats[format]} onChange={handleFileChange} className="hidden" />

                  {file ? (
                    <div>
                      <CheckCircle2 className="mx-auto text-brand-green mb-4" size={48} />
                      <div className="font-bold text-[var(--text-primary)] mb-1">{file.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{(file.size / 1024).toFixed(1)} KB · Click to change</div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto text-brand-green mb-4" size={48} />
                      <div className="font-display text-xl text-[var(--text-primary)] mb-2">
                        Drop your {format.toUpperCase()} file here
                      </div>
                      <div className="text-sm text-[var(--text-muted)] mb-4">or click to browse</div>
                      <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-brand-green" /> .{format} format only</span>
                        <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-brand-green" /> Max 10MB file size</span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!file || !selectedClass || !selectedCourse}
                  className="w-full mt-4 py-4 rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-dark text-white font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Upload size={16} /> Upload Questions
                </button>
              </div>

              {/* Guidelines */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="text-brand-green" size={18} />
                  <span className="font-bold text-[var(--text-primary)]">Upload Guidelines</span>
                </div>

                <div className="space-y-3 text-sm mb-4">
                  <div className="flex items-start gap-3">
                    <FileText size={14} className="text-brand-green shrink-0 mt-0.5" />
                    <div><strong className="text-[var(--text-primary)]">File Format:</strong> <span className="text-[var(--text-muted)]">{formatInfo[format].name} ({acceptedFormats[format]}) only</span></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertCircle size={14} className="text-brand-orange shrink-0 mt-0.5" />
                    <div><strong className="text-[var(--text-primary)]">Structure:</strong> <span className="text-[var(--text-muted)]">Each question should start with &quot;Q:&quot; and options with &quot;A:&quot;, &quot;B:&quot;, &quot;C:&quot;, &quot;D:&quot;</span></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={14} className="text-brand-green shrink-0 mt-0.5" />
                    <div><strong className="text-[var(--text-primary)]">Answer:</strong> <span className="text-[var(--text-muted)]">Mark correct answer with &quot;Correct: A&quot; at end of each question</span></div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[var(--surface-disabled)] mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-brand-green">Sample Template</div>
                    <button className="text-xs px-3 py-1 rounded-full bg-brand-green text-white font-bold hover:bg-brand-green-dark transition-all flex items-center gap-1">
                      <Download size={11} /> Download Template
                    </button>
                  </div>
                  <pre className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono">
                    {templates[format]}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
