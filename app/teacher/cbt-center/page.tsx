"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { CURRENT_TEACHER } from "@/lib/teacherData";
import { useToast } from "@/components/Toast";
import {
  ClipboardCheck, Plus, X, ChevronDown, ChevronUp, Info,
  CheckCircle2, ListChecks, BarChart3, RotateCcw, Download,
  Upload, FileText, Settings, Calendar, BookOpen, Users
} from "lucide-react";

type ExamMode = "midterm" | "final" | null;

export default function CBTCenterPage() {
  const { toast } = useToast();
  const teacher = CURRENT_TEACHER;
  const [showModal, setShowModal] = useState(false);
  const [midtermExpanded, setMidtermExpanded] = useState(true);
  const [finalExpanded, setFinalExpanded] = useState(false);

  const midtermActions = [
    { icon: Plus, label: "Test Subjects", color: "text-brand-green", action: () => toast("Opening test subjects manager", "info") },
    { icon: CheckCircle2, label: "Check Questions", color: "text-brand-green", action: () => toast("Loading question bank", "info") },
    { icon: BarChart3, label: "View Test Results", color: "text-brand-orange", action: () => toast("Loading test results", "info") },
    { icon: RotateCcw, label: "Enable Retake", color: "text-blue-500", action: () => toast("Retake enabled", "success") },
    { icon: Download, label: "Download Template", color: "text-brand-green", action: () => toast("Downloading Excel template", "success") },
    { icon: Upload, label: "Upload Questions", color: "text-brand-orange", action: () => toast("Upload dialog opened", "info") },
    { icon: ListChecks, label: "Bulk Add Questions", color: "text-brand-green", action: () => toast("Bulk entry mode", "info") },
    { icon: FileText, label: "Theory Questions", color: "text-purple-500", action: () => toast("Managing theory questions", "info") },
  ];

  const finalActions = [
    { icon: Plus, label: "Exam Subjects", color: "text-purple-500", action: () => toast("Opening exam subjects", "info") },
    { icon: Upload, label: "Upload Exam Questions", color: "text-brand-green", action: () => toast("Upload started", "info") },
    { icon: CheckCircle2, label: "Check Exam Questions", color: "text-brand-green", action: () => toast("Loading questions", "info") },
    { icon: BarChart3, label: "Check Exam Results", color: "text-brand-orange", action: () => toast("Loading results", "info") },
    { icon: RotateCcw, label: "Enable Exam Retake", color: "text-blue-500", action: () => toast("Retake enabled", "success") },
    { icon: FileText, label: "Theory Questions", color: "text-purple-500", action: () => toast("Theory manager", "info") },
  ];

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-3">
              <ClipboardCheck size={11} /> Subject Teacher · CBT Engine
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              CBT <span className="text-brand-green">CENTER</span>
            </h1>
            <p className="text-white/60 text-sm">Manage online tests, exam questions, and evaluations for your subjects.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Stats */}
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { label: "Active Tests", value: 3, icon: ClipboardCheck, color: "text-brand-green" },
                  { label: "Question Bank", value: 247, icon: BookOpen, color: "text-brand-orange" },
                  { label: "Students Tested", value: 156, icon: Users, color: "text-blue-500" },
                  { label: "Pending Grading", value: 12, icon: FileText, color: "text-purple-500" },
                ].map(s => (
                  <div key={s.label} className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)]">
                    <s.icon className={`${s.color} mb-3`} size={20} />
                    <div className="font-display text-3xl text-[var(--text-primary)]">{s.value}</div>
                    <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Open Modal Button */}
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-dark text-white font-bold shadow-2xl hover:opacity-90 transition-all flex items-center justify-center gap-3"
              >
                <ClipboardCheck size={20} />
                <span className="text-lg">Open Exam Management Center</span>
              </button>

              {/* Recent Tests */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                <h3 className="font-display text-lg text-[var(--text-primary)] mb-4">Recent Tests</h3>
                <div className="space-y-3">
                  {[
                    { subject: "Mathematics", class: "SS2A", type: "Mid-Term", date: "2025-07-15", status: "Completed", score: "Avg: 74%" },
                    { subject: "Physics", class: "SS2B", type: "CA Test 2", date: "2025-07-10", status: "Grading", score: "24/28 done" },
                    { subject: "Mathematics", class: "SS1A", type: "CA Test 1", date: "2025-07-05", status: "Completed", score: "Avg: 68%" },
                  ].map((t, i) => (
                    <div key={i} className="p-4 rounded-xl bg-[var(--surface-disabled)] flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                        <ClipboardCheck size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[var(--text-primary)]">{t.subject} · {t.class}</div>
                        <div className="text-xs text-[var(--text-muted)]">{t.type} · {t.date}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                          t.status === "Completed" ? "bg-brand-green/20 text-brand-green" : "bg-brand-orange/20 text-brand-orange"
                        }`}>
                          {t.status}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">{t.score}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Exam Management Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-start justify-center p-6 overflow-y-auto pt-16" onClick={() => setShowModal(false)}>
          <div
            className="rounded-3xl max-w-lg w-full my-8 shadow-2xl"
            style={{ backgroundColor: "#0C1824", border: "1px solid rgba(78, 197, 77, 0.3)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <ListChecks className="text-brand-green" size={22} />
                <h3 className="font-display text-xl text-white">Exam Management Center</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Info */}
            <div className="p-6">
              <div className="p-4 rounded-xl bg-brand-green/10 border border-brand-green/30 flex items-start gap-3 mb-6">
                <Info className="text-brand-green shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-white/80">
                  Teachers can upload pre-typed questions or type questions directly.
                </p>
              </div>

              {/* Midterm Section */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="text-brand-green" size={14} />
                  <span className="text-brand-green font-bold text-sm">Midterm Test Management</span>
                </div>

                <button
                  onClick={() => setMidtermExpanded(!midtermExpanded)}
                  className="w-full p-4 rounded-xl bg-brand-navy border border-white/10 hover:border-brand-green/50 transition-all flex items-center justify-between"
                >
                  <span className="text-white font-bold">Midterm Test Actions</span>
                  {midtermExpanded ? <ChevronUp className="text-white/60" size={16} /> : <ChevronDown className="text-white/60" size={16} />}
                </button>

                {midtermExpanded && (
                  <div className="mt-2 p-2 rounded-xl bg-black/40 border border-white/10 space-y-1">
                    {midtermActions.map((a, i) => (
                      <button
                        key={i}
                        onClick={a.action}
                        className="w-full p-3 rounded-lg text-left hover:bg-white/5 transition-colors flex items-center gap-3"
                      >
                        <a.icon className={a.color} size={16} />
                        <span className="text-white text-sm">{a.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Final Exam Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="text-brand-orange" size={14} />
                  <span className="text-brand-orange font-bold text-sm">Final Exam Management</span>
                </div>

                <button
                  onClick={() => setFinalExpanded(!finalExpanded)}
                  className="w-full p-4 rounded-xl bg-brand-navy border border-white/10 hover:border-brand-orange/50 transition-all flex items-center justify-between"
                >
                  <span className="text-white font-bold">Exam Actions</span>
                  {finalExpanded ? <ChevronUp className="text-white/60" size={16} /> : <ChevronDown className="text-white/60" size={16} />}
                </button>

                {finalExpanded && (
                  <div className="mt-2 p-2 rounded-xl bg-black/40 border border-white/10 space-y-1">
                    {finalActions.map((a, i) => (
                      <button
                        key={i}
                        onClick={a.action}
                        className="w-full p-3 rounded-lg text-left hover:bg-white/5 transition-colors flex items-center gap-3"
                      >
                        <a.icon className={a.color} size={16} />
                        <span className="text-white text-sm">{a.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 rounded-full bg-white/10 text-white font-bold hover:bg-white/20 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
