"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminSidebar from "@/components/AdminSidebar";
import { ALL_QUESTIONS } from "@/lib/questionBank";
import { HelpCircle, BookOpen, Award, Search, Filter, Eye, Edit3, FileText, X } from "lucide-react";

export default function AdminQuestionsPage() {
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<"midterm" | "final" | null>(null);

  const subjects = ["All", ...new Set(ALL_QUESTIONS.map(q => q.subject))];
  const types = ["All", "mcq", "true_false", "fill_blank", "essay"];

  const filtered = ALL_QUESTIONS.filter(q => {
    const matchSearch = q.questionText.toLowerCase().includes(search.toLowerCase()) || q.topic.toLowerCase().includes(search.toLowerCase());
    const matchSubject = filterSubject === "All" || q.subject === filterSubject;
    const matchType = filterType === "All" || q.type === filterType;
    return matchSearch && matchSubject && matchType;
  });

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              VIEW <span className="text-brand-green">QUESTIONS</span>
            </h1>
            <p className="text-white/60 text-sm">Browse and manage the school-wide question bank.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <AdminSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Choose Section Modal Trigger */}
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-dark text-white font-bold shadow-2xl hover:opacity-90 transition-all flex items-center justify-center gap-3"
              >
                <HelpCircle size={20} /> Choose Question Section
              </button>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <HelpCircle className="text-brand-green mb-2" size={18} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">{ALL_QUESTIONS.length}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Total Questions</div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <BookOpen className="text-brand-orange mb-2" size={18} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">{new Set(ALL_QUESTIONS.map(q => q.subject)).size}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Subjects</div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <Award className="text-blue-500 mb-2" size={18} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">{ALL_QUESTIONS.filter(q => q.waecYear).length}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">WAEC Questions</div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <FileText className="text-purple-500 mb-2" size={18} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">{ALL_QUESTIONS.filter(q => q.type === "essay").length}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Essay Questions</div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..."
                    className="w-full pl-11 pr-5 py-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green" />
                </div>
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)]">
                  {subjects.map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)]">
                  {types.map(t => <option key={t} value={t}>{t === "All" ? "All Types" : t.replace("_", " ").toUpperCase()}</option>)}
                </select>
              </div>

              {/* Questions List */}
              <div className="space-y-3">
                {filtered.map((q, i) => (
                  <div key={q.id} className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:border-brand-green/30 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center font-bold text-sm shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[9px] px-2 py-0.5 rounded bg-brand-green/10 text-brand-green font-bold uppercase">{q.type.replace("_", " ")}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">{q.subject}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-[var(--surface-disabled)] text-[var(--text-muted)] font-bold">{q.topic}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${q.difficulty === "easy" ? "bg-brand-green/10 text-brand-green" : q.difficulty === "medium" ? "bg-brand-orange/10 text-brand-orange" : "bg-red-500/10 text-red-500"}`}>{q.difficulty}</span>
                          {q.waecYear && <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 font-bold">WAEC {q.waecYear}</span>}
                        </div>
                        <p className="text-sm text-[var(--text-primary)] mb-2">{q.questionText.substring(0, 150)}{q.questionText.length > 150 ? "..." : ""}</p>
                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                          <span>{q.marks} mark{q.marks > 1 ? "s" : ""}</span>
                          <span>·</span>
                          <span>{q.classLevel}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-16 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <HelpCircle className="mx-auto text-[var(--text-muted)] mb-3" size={40} />
                  <p className="text-[var(--text-muted)]">No questions match your filters.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Question Section Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowModal(false)}>
          <div className="rounded-3xl max-w-lg w-full p-8" style={{ backgroundColor: "#0C1824" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <HelpCircle className="text-brand-green" size={22} />
                <h3 className="font-display text-xl text-white">Choose Question Section</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20">
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-white/60 mb-6">Please select the section you would like to view questions for:</p>

            <div className="space-y-3">
              <button
                onClick={() => { setShowModal(false); setFilterType("All"); }}
                className="w-full p-5 rounded-xl bg-brand-green/10 border border-brand-green/30 hover:bg-brand-green/20 transition-all flex items-center gap-4 group"
              >
                <Edit3 className="text-brand-green" size={18} />
                <div className="text-left">
                  <div className="font-bold text-white">Midterm Test Questions</div>
                  <div className="text-xs text-white/60">View and manage midterm questions</div>
                </div>
              </button>

              <button
                onClick={() => { setShowModal(false); setFilterType("All"); }}
                className="w-full p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-4 group"
              >
                <FileText className="text-white/80" size={18} />
                <div className="text-left">
                  <div className="font-bold text-white">Final Exam Questions</div>
                  <div className="text-xs text-white/60">View and manage final exam questions</div>
                </div>
              </button>
            </div>

            <button onClick={() => setShowModal(false)} className="w-full mt-4 py-3 rounded-full bg-white/10 text-white font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2">
              <X size={14} /> Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
