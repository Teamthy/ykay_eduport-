"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Lock, Unlock, AlertTriangle } from "lucide-react";

const SUBJECTS = [
  { id: "S1", name: "Mathematics", class: "JSS1 A", locked: false },
  { id: "S2", name: "Physics", class: "SS2 B", locked: true },
];

export default function AdminGradebookLockPage() {
  const [subjects, setSubjects] = useState(SUBJECTS);

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-32 pb-14 bg-brand-navy">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <h1 className="font-display text-[42px] md:text-[64px] text-white">GRADEBOOK <span className="text-brand-green">LOCK</span></h1>
            <p className="text-white/50 font-body mt-4">Administrative control for term-end score locking.</p>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {subjects.map(s => (
              <div key={s.id} className="flex items-center justify-between p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                <div>
                  <h3 className="font-body font-bold text-[var(--text-primary)]">{s.name}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{s.class}</p>
                </div>
                <button className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${s.locked ? "bg-brand-green/10 text-brand-green" : "bg-brand-orange/10 text-brand-orange"}`}>
                  {s.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  {s.locked ? "Locked" : "Active"}
                </button>
              </div>
            ))}
            
            <div className="p-8 rounded-2xl bg-brand-orange/5 border border-brand-orange/20 flex gap-4">
              <AlertTriangle className="text-brand-orange shrink-0" />
              <p className="text-sm text-[var(--text-secondary)]">Locking a gradebook makes it read-only for teachers. This action is logged for audit purposes.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
