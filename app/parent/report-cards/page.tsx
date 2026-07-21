"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Download, Eye, Award } from "lucide-react";

const REPORTS = [
  { id: "RPT-001", studentName: "Adeola Ogunlade", term: "First Term 2025/2026", status: "Released", reportNo: "YKC-RPT-2025-0001" },
];

export default function ParentReportCardsPage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-32 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-[42px] md:text-[64px] tracking-[3px] text-white mb-3">
              REPORT <span className="text-brand-green">CARDS</span>
            </h1>
            <p className="font-body text-base text-white/60 max-w-2xl">
              Download your child&apos;s branded term report cards.
            </p>
          </div>
        </section>

        <section className="py-16 px-6">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 shadow-[var(--card-shadow)]">
              <h2 className="font-display text-xl text-[var(--text-primary)] mb-6">Available Report Cards</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[var(--border-subtle)]">
                    <tr>
                      {["Report No.", "Student", "Term", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {REPORTS.map(r => (
                      <tr key={r.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-disabled)] transition-colors">
                        <td className="px-4 py-4 text-brand-green font-bold text-xs">{r.reportNo}</td>
                        <td className="px-4 py-4 text-[var(--text-primary)] font-bold">{r.studentName}</td>
                        <td className="px-4 py-4 text-[var(--text-muted)] text-xs">{r.term}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-bold">
                            <Award size={9} /> {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 flex gap-2">
                          <button className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 bg-brand-green/10 text-brand-green text-[10px] font-bold hover:bg-brand-green hover:text-white transition-all">
                            <Eye size={10} /> View
                          </button>
                          <button className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 bg-[var(--surface-disabled)] text-[var(--text-secondary)] text-[10px] font-bold hover:bg-brand-green hover:text-white transition-all">
                            <Download size={10} /> Download
                          </button>
                        </td>
                      </tr>
                    ))}
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
