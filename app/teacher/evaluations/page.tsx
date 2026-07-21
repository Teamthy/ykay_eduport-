"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { FileText, Plus, Clock, Calendar, Users, Award, Edit3, BarChart3 } from "lucide-react";

const EVALUATIONS = [
  { id: "1", name: "First Term CA1", subject: "Mathematics", class: "SS2A", date: "2025-07-15", duration: "30 min", questions: 20, marks: 30, status: "Completed", takers: 32, avgScore: 74 },
  { id: "2", name: "Physics Mid-Term", subject: "Physics", class: "SS2B", date: "2025-07-10", duration: "45 min", questions: 25, marks: 40, status: "Grading", takers: 24, avgScore: null },
  { id: "3", name: "Mathematics CA2", subject: "Mathematics", class: "SS1A", date: "2025-07-25", duration: "40 min", questions: 25, marks: 35, status: "Scheduled", takers: 0, avgScore: null },
  { id: "4", name: "Physics Assignment", subject: "Physics", class: "SS3A", date: "2025-07-20", duration: "60 min", questions: 15, marks: 25, status: "Active", takers: 12, avgScore: null },
];

export default function ViewEvaluationsPage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-3">
              <FileText size={11} /> Subject Teacher · Evaluations
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              VIEW <span className="text-brand-green">EVALUATIONS</span>
            </h1>
            <p className="text-white/60 text-sm">All tests and evaluations you have created.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              <Link href="/teacher/evaluations/create" className="w-full py-4 rounded-2xl border-2 border-dashed border-brand-green/40 text-brand-green font-bold hover:bg-brand-green/5 transition-all flex items-center justify-center gap-2">
                <Plus size={18} /> Create New Evaluation
              </Link>

              <div className="grid gap-4">
                {EVALUATIONS.map(e => (
                  <div key={e.id} className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:border-brand-green/30 transition-all">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                        e.status === "Completed" ? "bg-brand-green/10 text-brand-green" :
                        e.status === "Grading" ? "bg-brand-orange/10 text-brand-orange" :
                        e.status === "Active" ? "bg-blue-500/10 text-blue-500 animate-pulse" :
                        "bg-[var(--surface-disabled)] text-[var(--text-muted)]"
                      }`}>
                        <Award size={22} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="font-display text-lg text-[var(--text-primary)]">{e.name}</h3>
                            <div className="text-xs text-[var(--text-muted)] mt-1">{e.subject} · Class {e.class}</div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest shrink-0 ${
                            e.status === "Completed" ? "bg-brand-green/20 text-brand-green" :
                            e.status === "Grading" ? "bg-brand-orange/20 text-brand-orange" :
                            e.status === "Active" ? "bg-blue-500/20 text-blue-500" :
                            "bg-purple-500/20 text-purple-500"
                          }`}>
                            {e.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
                          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <Calendar size={12} className="text-brand-green" /> {e.date}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <Clock size={12} className="text-brand-green" /> {e.duration}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <FileText size={12} className="text-brand-green" /> {e.questions} questions
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <Award size={12} className="text-brand-green" /> {e.marks} marks
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                          <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1 text-[var(--text-muted)]">
                              <Users size={12} /> <strong className="text-[var(--text-primary)]">{e.takers}</strong> takers
                            </span>
                            {e.avgScore !== null && (
                              <span className="flex items-center gap-1 text-brand-green">
                                <BarChart3 size={12} /> Avg: <strong>{e.avgScore}%</strong>
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button className="px-3 py-1.5 rounded-lg bg-brand-green/10 text-brand-green text-xs font-bold hover:bg-brand-green hover:text-white transition-all flex items-center gap-1">
                              <BarChart3 size={11} /> Results
                            </button>
                            <button className="px-3 py-1.5 rounded-lg bg-[var(--surface-disabled)] text-[var(--text-primary)] text-xs font-bold hover:bg-brand-orange hover:text-white transition-all flex items-center gap-1">
                              <Edit3 size={11} /> Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
