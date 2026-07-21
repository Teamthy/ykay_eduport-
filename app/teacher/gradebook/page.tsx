"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Lock, Save, AlertTriangle, ShieldCheck } from "lucide-react";

interface StudentGrade {
  id: string;
  name: string;
  class: string;
  ca1: number;
  ca2: number;
  midterm: number;
  assignment: number;
  terminal: number;
  total: number;
  grade: string;
}

function computeGrade(total: number): string {
  if (total >= 70) return "A1";
  if (total >= 60) return "B2";
  if (total >= 55) return "B3";
  if (total >= 50) return "C4";
  if (total >= 45) return "C5";
  if (total >= 40) return "C6";
  if (total >= 35) return "D7";
  return "F9";
}

const INITIAL: StudentGrade[] = [
  { id: "YKC/2025/001", name: "Adeola Ogunlade", class: "JSS1 A", ca1: 8, ca2: 7, midterm: 9, assignment: 10, terminal: 52, total: 86, grade: "A1" },
  { id: "YKC/2025/002", name: "Emmanuel Adebayo", class: "JSS1 A", ca1: 5, ca2: 6, midterm: 7, assignment: 8, terminal: 45, total: 71, grade: "A1" },
  { id: "YKC/2025/003", name: "Fatima Ibrahim", class: "JSS1 A", ca1: 3, ca2: 4, midterm: 5, assignment: 6, terminal: 28, total: 46, grade: "C5" },
];

export default function TeacherGradebookPage() {
  const [grades, setGrades] = useState(INITIAL);
  const [locked, setLocked] = useState(false);

  const handleScoreChange = (id: string, field: keyof StudentGrade, value: string) => {
    if (locked) return;
    const num = Number(value) || 0;
    setGrades(grades.map(g => {
      if (g.id !== id) return g;
      const updated = { ...g, [field]: num };
      updated.total = updated.ca1 + updated.ca2 + updated.midterm + updated.assignment + updated.terminal;
      updated.grade = computeGrade(updated.total);
      return updated;
    }));
  };

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-32 pb-14 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-[42px] md:text-[72px] tracking-[4px] text-white mb-4">
              GRADEBOOK <span className="text-brand-green">& CA SCORES</span>
            </h1>
            <p className="font-body text-base text-white/60 max-w-2xl">
              Enter CA scores with real-time validation and automatic grade computation.
            </p>
          </div>
        </section>

        {locked && (
          <div className="bg-brand-orange/10 border-y border-brand-orange/20 px-6 py-4">
            <div className="mx-auto max-w-7xl flex items-center gap-3">
              <Lock size={18} className="text-brand-orange" />
              <p className="text-sm text-brand-orange font-medium">
                This gradebook is locked. Read-only mode. Contact admin for corrections.
              </p>
            </div>
          </div>
        )}

        <section className="py-16 px-6">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] overflow-hidden shadow-[var(--card-shadow)]">
              <div className="px-8 py-6 border-b border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl text-[var(--text-primary)]">Mathematics — JSS1 A</h2>
                  <p className="text-xs text-[var(--text-muted)]">Max CA: 10 · Midterm: 10 · Assignment: 10 · Terminal: 60</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setLocked(!locked)}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all ${
                      locked ? "bg-brand-green/10 text-brand-green border border-brand-green/20 hover:bg-brand-green hover:text-white" 
                             : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white"
                    }`}
                  >
                    <ShieldCheck size={14} /> {locked ? "Unlock" : "Lock"}
                  </button>
                  <button
                    disabled={locked}
                    className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold bg-brand-green text-white hover:bg-brand-green-dark transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={14} /> Save Progress
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-brand-navy">
                    <tr>
                      {["Student", "CA1", "CA2", "Midterm", "Assignment", "Terminal", "Total", "Grade"].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-display text-[10px] uppercase tracking-wider text-white/70">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map(s => {
                      const isBelowPass = s.total < 40;
                      return (
                        <tr key={s.id} className={`border-b border-[var(--border-subtle)] ${isBelowPass ? "bg-red-500/5" : "hover:bg-[var(--surface-disabled)]"} transition-colors`}>
                          <td className="px-4 py-3">
                            <div className="text-[var(--text-primary)] font-bold text-sm">{s.name}</div>
                            <div className="text-[10px] text-[var(--text-muted)]">{s.id}</div>
                          </td>
                          {(["ca1", "ca2", "midterm", "assignment", "terminal"] as const).map(field => (
                            <td key={field} className="px-3 py-3">
                              <input
                                type="number"
                                value={s[field]}
                                onChange={e => handleScoreChange(s.id, field, e.target.value)}
                                disabled={locked}
                                className="w-14 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] px-2 py-1.5 text-xs text-center font-bold text-[var(--input-text)] focus:outline-none focus:border-brand-green disabled:opacity-40"
                              />
                            </td>
                          ))}
                          <td className="px-4 py-3 font-display text-base text-brand-green font-bold">{s.total}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              s.total >= 70 ? "bg-brand-green/10 text-brand-green" :
                              s.total >= 45 ? "bg-brand-orange/10 text-brand-orange" :
                              "bg-red-500/10 text-red-500"
                            }`}>
                              {s.grade}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
