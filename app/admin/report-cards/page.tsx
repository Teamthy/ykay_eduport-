"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  FileText, CheckCircle2, Lock, Mail, Clock
} from "lucide-react";

export default function AdminReportCardsPage() {
  const [bulkStatus, setBulkStatus] = useState<"idle" | "generating" | "done">("idle");

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-32 pb-14 bg-brand-navy">
          <div className="mx-auto max-w-7xl px-6">
            <h1 className="font-display text-[42px] md:text-[72px] text-white">REPORT <span className="text-brand-green">CARDS</span></h1>
            <p className="text-white/50 font-body mt-4">Automated PDF generation and delivery.</p>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-brand-navy to-brand-navy-light border border-white/5 text-white shadow-xl">
               <h2 className="font-display text-2xl mb-4">Bulk Generation</h2>
               <p className="text-white/50 text-sm mb-8">Creates branded PDFs for all 420 students. WhatsApp/Email delivery triggered upon release.</p>
               <button 
                 onClick={() => setBulkStatus("generating")}
                 className="btn-primary w-full"
               >
                 {bulkStatus === "generating" ? <Clock className="animate-spin" /> : <FileText />}
                 {bulkStatus === "generating" ? "Processing..." : "Generate All Reports"}
               </button>
            </div>

            <div className="p-10 rounded-[2.5rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)]">
               <h2 className="font-display text-2xl text-[var(--text-primary)] mb-6">System Integrity</h2>
               <div className="space-y-4">
                  {[
                    { label: "Scores Entered", ok: true },
                    { label: "Attendance Locked", ok: true },
                    { label: "Fees Reconciled", ok: false },
                  ].map(check => (
                    <div key={check.label} className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-disabled)]">
                       <span className="text-sm text-[var(--text-secondary)]">{check.label}</span>
                       {check.ok ? <CheckCircle2 className="text-brand-green" size={18} /> : <Clock className="text-brand-orange" size={18} />}
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
