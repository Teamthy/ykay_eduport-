"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  ClipboardCheck, PlayCircle, Clock, CheckCircle2,
  Shield, BookOpen, Award, AlertTriangle, FileText
} from "lucide-react";

const EXAMS = [
  {
    id: "exam-math-ca1",
    title: "Mathematics — CA Test 1",
    subject: "Mathematics",
    classLevel: "SS2",
    examType: "CA",
    duration: 30,
    questions: 10,
    totalMarks: 24,
    passMark: 10,
    hasEssay: true,
    features: ["MCQ", "True/False", "Fill-blank", "Essay"],
    antiCheat: ["Fullscreen", "Tab Monitor", "No Copy", "Randomized", "Auto-submit"],
    instructions: "Answer ALL questions. No calculator allowed.",
    status: "available",
    createdBy: "Dr. Grace Okonkwo",
  },
  {
    id: "exam-phy-mid",
    title: "Physics — Mid-Term Test",
    subject: "Physics",
    classLevel: "SS2",
    examType: "MIDTERM",
    duration: 45,
    questions: 5,
    totalMarks: 9,
    passMark: 4,
    hasEssay: false,
    features: ["MCQ", "True/False", "Fill-blank"],
    antiCheat: ["Fullscreen", "Tab Monitor", "No Copy", "Auto-submit"],
    instructions: "Answer ALL questions. Calculator allowed.",
    status: "available",
    createdBy: "Dr. Grace Okonkwo",
  },
  {
    id: "exam-eng-ca1",
    title: "English Language — CA Test 1",
    subject: "English Language",
    classLevel: "SS2",
    examType: "CA",
    duration: 60,
    questions: 3,
    totalMarks: 14,
    passMark: 6,
    hasEssay: true,
    features: ["MCQ", "Essay"],
    antiCheat: ["Fullscreen", "Tab Monitor", "No Copy", "Auto-submit"],
    instructions: "Answer all questions. Essay should be ~250 words.",
    status: "available",
    createdBy: "Mr. Tunde Bakare",
  },
];

export default function StudentExamsPage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-3">
              <ClipboardCheck size={11} /> Computer-Based Testing
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              CBT <span className="text-brand-green">EXAMINATIONS</span>
            </h1>
            <p className="text-white/60 text-sm">Take your exams online with anti-cheat protection and instant results.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-5xl space-y-4">
            {/* Anti-cheat notice */}
            <div className="p-4 rounded-2xl bg-brand-orange/10 border border-brand-orange/30 flex items-start gap-3">
              <Shield className="text-brand-orange shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-[var(--text-secondary)]">
                <strong className="text-brand-orange">Anti-Cheat Active:</strong> All exams require fullscreen mode. Tab switching, copy/paste, and screen recording are monitored. Violations may result in automatic submission.
              </div>
            </div>

            {/* Exam Cards */}
            {EXAMS.map(exam => (
              <div key={exam.id} className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:border-brand-green/30 transition-all">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                    <PlayCircle size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-display text-xl text-[var(--text-primary)]">{exam.title}</h3>
                        <div className="text-xs text-[var(--text-muted)] mt-1">{exam.subject} · {exam.classLevel} · {exam.examType}</div>
                      </div>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-brand-green/20 text-brand-green font-bold uppercase tracking-widest shrink-0">
                        Available
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)] my-3">
                      <span className="flex items-center gap-1"><Clock size={12} /> {exam.duration} min</span>
                      <span className="flex items-center gap-1"><BookOpen size={12} /> {exam.questions} questions</span>
                      <span className="flex items-center gap-1"><Award size={12} /> {exam.totalMarks} marks</span>
                      <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Pass: {exam.passMark}</span>
                      {exam.hasEssay && <span className="flex items-center gap-1 text-brand-orange"><FileText size={12} /> Includes essay</span>}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {exam.features.map(f => (
                        <span key={f} className="text-[9px] px-2 py-0.5 rounded bg-[var(--surface-disabled)] text-[var(--text-muted)] font-bold uppercase">
                          {f}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {exam.antiCheat.map(a => (
                        <span key={a} className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-500 font-bold">
                          {a === "Fullscreen" ? "🔒" : a === "Tab Monitor" ? "👁" : a === "No Copy" ? "🚫" : a === "Randomized" ? "🔀" : "⏰"} {a}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-[var(--text-muted)] italic mb-4">{exam.instructions}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mb-4">Created by: {exam.createdBy}</p>

                    <Link
                      href={`/student/exams/${exam.id}`}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-green text-white text-sm font-bold uppercase tracking-widest hover:bg-brand-green-dark transition-all shadow-lg"
                    >
                      <PlayCircle size={16} /> Start Exam
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {/* Back link */}
            <div className="text-center pt-4">
              <Link href="/student/dashboard" className="text-sm text-[var(--text-muted)] hover:text-brand-green transition-colors">
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
