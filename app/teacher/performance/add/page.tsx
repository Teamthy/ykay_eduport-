"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { CURRENT_TEACHER, FORM_CLASS_STUDENTS } from "@/lib/teacherData";
import { useToast } from "@/components/Toast";
import { Users, BookOpen, Save, Calculator, ChevronDown, Award } from "lucide-react";

export default function AddPerformancePage() {
  const { toast } = useToast();
  const teacher = CURRENT_TEACHER;
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [student, setStudent] = useState("");
  const [testType, setTestType] = useState<"CA1" | "CA2" | "Mid-Term Test" | "Assignment" | "Exam">("CA1");
  const [score, setScore] = useState("");
  const [comment, setComment] = useState("");

  const maxScores = { "CA1": 10, "CA2": 10, "Mid-Term Test": 20, "Assignment": 10, "Exam": 60 };
  const currentMax = maxScores[testType];

  const availableClasses = subject
    ? teacher.subjectAssignments.find(sa => sa.subject === subject)?.classes || []
    : [];

  const handleSubmit = () => {
    if (!subject || !className || !student || !score) {
      toast("Please fill all required fields", "warning");
      return;
    }
    const scoreNum = Number(score);
    if (scoreNum > currentMax) {
      toast(`Score cannot exceed ${currentMax}`, "error");
      return;
    }
    toast(`Score recorded for ${student}`, "success");
    setScore("");
    setComment("");
    setStudent("");
  };

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-3">
              <BookOpen size={11} /> Subject Teacher
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              ADD <span className="text-brand-green">PERFORMANCE</span>
            </h1>
            <p className="text-white/60 text-sm">Record CA, test, or exam scores for your students.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 max-w-3xl">
              <div className="p-8 rounded-[2rem] bg-gradient-to-br from-brand-green/10 to-brand-green/5 border border-brand-green/30 mb-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-green flex items-center justify-center mx-auto mb-4 text-white">
                  <Award size={28} />
                </div>
                <h2 className="font-display text-2xl text-[var(--text-primary)] mb-2">Score Entry Form</h2>
                <p className="text-sm text-[var(--text-muted)]">First Term 2025/2026 · {teacher.fullName}</p>
              </div>

              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 shadow-[var(--card-shadow)] space-y-5">
                {/* Subject */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                    <BookOpen size={11} /> Subject *
                  </label>
                  <select
                    value={subject}
                    onChange={e => { setSubject(e.target.value); setClassName(""); setStudent(""); }}
                    className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                  >
                    <option value="">Select subject...</option>
                    {teacher.subjectAssignments.map(sa => (
                      <option key={sa.subject} value={sa.subject}>{sa.subject}</option>
                    ))}
                  </select>
                </div>

                {/* Class */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                    <Users size={11} /> Class *
                  </label>
                  <select
                    value={className}
                    onChange={e => { setClassName(e.target.value); setStudent(""); }}
                    disabled={!subject}
                    className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">Select class...</option>
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Student */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                    <Users size={11} /> Student *
                  </label>
                  <select
                    value={student}
                    onChange={e => setStudent(e.target.value)}
                    disabled={!className}
                    className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">Select student...</option>
                    {FORM_CLASS_STUDENTS.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>

                {/* Test Type */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                    <Award size={11} /> Assessment Type *
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {(["CA1", "CA2", "Mid-Term Test", "Assignment", "Exam"] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTestType(t)}
                        className={`p-3 rounded-xl text-xs font-bold transition-all ${
                          testType === t
                            ? "bg-brand-green text-white shadow-md"
                            : "bg-[var(--surface-disabled)] text-[var(--text-muted)] hover:bg-brand-green/10"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-2">Max score: {currentMax}</p>
                </div>

                {/* Score */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                    <Calculator size={11} /> Score (out of {currentMax}) *
                  </label>
                  <input
                    type="number"
                    value={score}
                    onChange={e => setScore(e.target.value)}
                    min="0"
                    max={currentMax}
                    step="0.5"
                    placeholder={`Enter score (0-${currentMax})`}
                    className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green text-lg font-bold"
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 block">
                    Comment (optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={3}
                    placeholder="e.g., Excellent work! Keep it up."
                    className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  className="w-full py-4 rounded-full bg-brand-green text-white font-bold uppercase tracking-widest text-sm hover:bg-brand-green-dark transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Save Score
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
