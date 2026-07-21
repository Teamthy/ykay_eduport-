"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { useToast } from "@/components/Toast";
import {
  ClipboardCheck, BookOpen, Save, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertTriangle, Star, Eye, MessageSquare
} from "lucide-react";

interface PendingGrade {
  id: string;
  studentName: string;
  studentId: string;
  exam: string;
  subject: string;
  question: string;
  questionType: string;
  maxMarks: number;
  studentAnswer: string;
  teacherScore: number | null;
  feedback: string;
  submittedAt: string;
}

const PENDING_GRADES: PendingGrade[] = [
  {
    id: "pg-001",
    studentName: "Emmanuel Adebayo",
    studentId: "YKC/2025/002",
    exam: "Mathematics CA1",
    subject: "Mathematics",
    question: "A trader bought 100 oranges for ₦2,000 and sold them at ₦30 each. Calculate: (a) The total selling price (b) The profit made (c) The percentage profit.",
    questionType: "essay",
    maxMarks: 5,
    studentAnswer: "Total selling price = 100 x 30 = N3000\nProfit = 3000 - 2000 = N1000\nPercentage profit = 1000/2000 x 100 = 50%\n\nThe trader made a 50% profit on the oranges.",
    teacherScore: null,
    feedback: "",
    submittedAt: "Jul 21, 2025 · 9:28 AM",
  },
  {
    id: "pg-002",
    studentName: "Fatima Yusuf",
    studentId: "YKC/2025/018",
    exam: "Mathematics CA1",
    subject: "Mathematics",
    question: "A trader bought 100 oranges for ₦2,000 and sold them at ₦30 each. Calculate: (a) The total selling price (b) The profit made (c) The percentage profit.",
    questionType: "essay",
    maxMarks: 5,
    studentAnswer: "a) TSP = 100 × ₦30 = ₦3,000\nb) Profit = ₦3,000 − ₦2,000 = ₦1,000\nc) % Profit = (Profit/CP) × 100 = (1000/2000) × 100 = 50%",
    teacherScore: null,
    feedback: "",
    submittedAt: "Jul 21, 2025 · 9:35 AM",
  },
  {
    id: "pg-003",
    studentName: "David Okoye",
    studentId: "YKC/2025/024",
    exam: "English Language CA1",
    subject: "English Language",
    question: "Write an essay of about 250 words on 'The Role of Technology in Modern Education'.",
    questionType: "essay",
    maxMarks: 10,
    studentAnswer: "Technology has become an important part of modern education. In today's world, students use computers, tablets, and smartphones to learn new things.\n\nOne of the main benefits is that technology makes learning more interesting. Students can watch videos, play educational games, and use interactive apps. This helps them understand difficult concepts better.\n\nAnother advantage is that technology gives students access to a lot of information. With the internet, students can research any topic from anywhere in the world. They don't have to rely only on textbooks.\n\nHowever, there are some challenges. Not all students have access to technology, especially in rural areas. Also, some students may get distracted by social media and games when they should be studying.\n\nIn conclusion, technology is very useful in education but it should be used wisely. Schools and parents should guide students on how to use technology for learning.",
    teacherScore: null,
    feedback: "",
    submittedAt: "Jul 21, 2025 · 10:05 AM",
  },
  {
    id: "pg-004",
    studentName: "Chinedu Okoro",
    studentId: "YKC/2025/012",
    exam: "English Language CA1",
    subject: "English Language",
    question: "Write an essay of about 250 words on 'The Role of Technology in Modern Education'.",
    questionType: "essay",
    maxMarks: 10,
    studentAnswer: "Technology is good for education because it helps students learn. Computers and phones are used in schools.",
    teacherScore: null,
    feedback: "",
    submittedAt: "Jul 21, 2025 · 10:12 AM",
  },
];

export default function GradeExamsPage() {
  const { toast } = useToast();
  const [grades, setGrades] = useState(PENDING_GRADES);
  const [expanded, setExpanded] = useState<string | null>(grades[0]?.id || null);

  const graded = grades.filter(g => g.teacherScore !== null).length;
  const pending = grades.filter(g => g.teacherScore === null).length;

  const updateScore = (id: string, score: number) => {
    const grade = grades.find(g => g.id === id);
    if (!grade) return;
    if (score > grade.maxMarks) {
      toast(`Score cannot exceed ${grade.maxMarks}`, "error");
      return;
    }
    setGrades(prev => prev.map(g => g.id === id ? { ...g, teacherScore: score } : g));
  };

  const updateFeedback = (id: string, feedback: string) => {
    setGrades(prev => prev.map(g => g.id === id ? { ...g, feedback } : g));
  };

  const handleSave = (id: string) => {
    const grade = grades.find(g => g.id === id);
    if (!grade || grade.teacherScore === null) {
      toast("Please enter a score before saving", "warning");
      return;
    }
    toast(`Score saved for ${grade.studentName}: ${grade.teacherScore}/${grade.maxMarks}`, "success");
  };

  const handleSaveAll = () => {
    const unsaved = grades.filter(g => g.teacherScore === null);
    if (unsaved.length > 0) {
      toast(`${unsaved.length} submissions still need grading`, "warning");
      return;
    }
    toast(`All ${grades.length} submissions graded and saved`, "success");
  };

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-[10px] font-bold uppercase tracking-widest mb-3">
              <ClipboardCheck size={11} /> Manual Grading
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              GRADE <span className="text-brand-green">ESSAYS</span>
            </h1>
            <p className="text-white/60 text-sm">Review and score essay/theory submissions that require manual grading.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-brand-orange/10 border border-brand-orange/30">
                  <Clock className="text-brand-orange mb-2" size={20} />
                  <div className="font-display text-3xl text-brand-orange">{pending}</div>
                  <div className="text-xs uppercase tracking-widest text-brand-orange">Pending</div>
                </div>
                <div className="p-5 rounded-2xl bg-brand-green/10 border border-brand-green/30">
                  <CheckCircle2 className="text-brand-green mb-2" size={20} />
                  <div className="font-display text-3xl text-brand-green">{graded}</div>
                  <div className="text-xs uppercase tracking-widest text-brand-green">Graded</div>
                </div>
                <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <BookOpen className="text-[var(--text-muted)] mb-2" size={20} />
                  <div className="font-display text-3xl text-[var(--text-primary)]">{grades.length}</div>
                  <div className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Total</div>
                </div>
              </div>

              {/* Save All */}
              <button
                onClick={handleSaveAll}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-dark text-white font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Save size={16} /> Save All Grades ({graded}/{grades.length} completed)
              </button>

              {/* Submissions */}
              <div className="space-y-4">
                {grades.map(g => {
                  const isExpanded = expanded === g.id;
                  const wordCount = g.studentAnswer.split(/\s+/).filter(Boolean).length;

                  return (
                    <div key={g.id} className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] overflow-hidden">
                      {/* Header */}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : g.id)}
                        className="w-full p-5 flex items-center justify-between hover:bg-[var(--surface-disabled)] transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center text-white font-bold text-sm">
                            {g.studentName.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-[var(--text-primary)]">{g.studentName}</div>
                            <div className="text-xs text-[var(--text-muted)]">{g.studentId} · {g.exam} · {g.subject}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {g.teacherScore !== null ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-green/20 text-brand-green text-xs font-bold">
                              <CheckCircle2 size={12} /> {g.teacherScore}/{g.maxMarks}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-orange/20 text-brand-orange text-xs font-bold">
                              <Clock size={12} /> Pending
                            </span>
                          )}
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="p-6 border-t border-[var(--border-subtle)] space-y-5">
                          {/* Question */}
                          <div className="p-4 rounded-xl bg-brand-green/5 border border-brand-green/20">
                            <div className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                              <BookOpen size={11} /> Question ({g.maxMarks} marks)
                            </div>
                            <p className="text-sm text-[var(--text-primary)] font-medium">{g.question}</p>
                          </div>

                          {/* Student Answer */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
                                <MessageSquare size={11} /> Student's Answer
                              </div>
                              <span className="text-[10px] text-[var(--text-muted)]">{wordCount} words · {g.submittedAt}</span>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--surface-disabled)] border border-[var(--border-subtle)]">
                              <p className="text-sm text-[var(--text-primary)] whitespace-pre-line leading-relaxed">{g.studentAnswer}</p>
                            </div>
                          </div>

                          {/* Grading Section */}
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Score Input */}
                            <div>
                              <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                                <Star size={11} /> Score (out of {g.maxMarks}) *
                              </label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="number"
                                  value={g.teacherScore ?? ""}
                                  onChange={e => updateScore(g.id, Number(e.target.value))}
                                  min="0"
                                  max={g.maxMarks}
                                  step="0.5"
                                  placeholder="0"
                                  className="w-24 p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] text-2xl font-display text-center focus:outline-none focus:border-brand-green"
                                />
                                <span className="text-2xl text-[var(--text-muted)]">/ {g.maxMarks}</span>
                              </div>

                              {/* Quick score buttons */}
                              <div className="flex gap-2 mt-3">
                                {[0, Math.round(g.maxMarks * 0.25), Math.round(g.maxMarks * 0.5), Math.round(g.maxMarks * 0.75), g.maxMarks].map(s => (
                                  <button
                                    key={s}
                                    onClick={() => updateScore(g.id, s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                      g.teacherScore === s
                                        ? "bg-brand-green text-white"
                                        : "bg-[var(--surface-disabled)] text-[var(--text-muted)] hover:bg-brand-green/10"
                                    }`}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Feedback */}
                            <div>
                              <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                                <MessageSquare size={11} /> Teacher Feedback (optional)
                              </label>
                              <textarea
                                value={g.feedback}
                                onChange={e => updateFeedback(g.id, e.target.value)}
                                rows={4}
                                placeholder="e.g., Well structured answer but missing the formula..."
                                className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] text-sm focus:outline-none focus:border-brand-green resize-none"
                              />
                            </div>
                          </div>

                          {/* Save Button */}
                          <button
                            onClick={() => handleSave(g.id)}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-green text-white text-sm font-bold hover:bg-brand-green-dark transition-all shadow-lg"
                          >
                            <Save size={14} /> Save Grade for {g.studentName.split(" ")[0]}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
