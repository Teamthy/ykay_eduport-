"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { CURRENT_TEACHER } from "@/lib/teacherData";
import { useToast } from "@/components/Toast";
import { Award, Save, BookOpen, Calendar, Clock, ListChecks, FileText } from "lucide-react";

export default function CreateEvaluationPage() {
  const { toast } = useToast();
  const teacher = CURRENT_TEACHER;
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [objectiveHours, setObjectiveHours] = useState("0");
  const [objectiveMinutes, setObjectiveMinutes] = useState("30");
  const [theoryHours, setTheoryHours] = useState("0");
  const [theoryMinutes, setTheoryMinutes] = useState("0");
  const [numQuestions, setNumQuestions] = useState("20");
  const [totalMarks, setTotalMarks] = useState("30");
  const [term, setTerm] = useState("First Term 2025/2026");

  const availableClasses = subject
    ? teacher.subjectAssignments.find(sa => sa.subject === subject)?.classes || []
    : [];

  const handleSave = () => {
    if (!subject || !className || !examName || !examDate) {
      toast("Please fill all required fields", "warning");
      return;
    }
    toast(`Evaluation "${examName}" created successfully`, "success");
  };

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-3">
              <Award size={11} /> Subject Teacher · New Evaluation
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              CREATE <span className="text-brand-green">EVALUATION</span>
            </h1>
            <p className="text-white/60 text-sm">Configure new CBT test — set duration, questions, and marks.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 max-w-4xl">
              {/* Title Card */}
              <div className="p-8 rounded-[2rem] bg-gradient-to-br from-brand-green to-brand-green-dark text-white mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Award size={26} />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl">Edit Test Courses</h2>
                    <p className="text-white/80 text-sm">Set up a new evaluation for your students</p>
                  </div>
                </div>
              </div>

              {/* Class Header */}
              {className && (
                <div className="p-4 rounded-2xl bg-brand-green text-white mb-4 flex items-center gap-3">
                  <ListChecks size={20} />
                  <span className="font-display text-lg tracking-widest">Class: {className}</span>
                </div>
              )}

              {/* Form */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 shadow-[var(--card-shadow)] space-y-6">
                {/* Row 1: Subject + Class */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                      <BookOpen size={11} /> Subject *
                    </label>
                    <select
                      value={subject}
                      onChange={e => { setSubject(e.target.value); setClassName(""); }}
                      className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                    >
                      <option value="">Select subject...</option>
                      {teacher.subjectAssignments.map(sa => (
                        <option key={sa.subject} value={sa.subject}>{sa.subject}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                      <Calendar size={11} /> Exam Date *
                    </label>
                    <input
                      type="date"
                      value={examDate}
                      onChange={e => setExamDate(e.target.value)}
                      className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                    />
                  </div>
                </div>

                {/* Class */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 block">Class *</label>
                  <select
                    value={className}
                    onChange={e => setClassName(e.target.value)}
                    disabled={!subject}
                    className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green disabled:opacity-40"
                  >
                    <option value="">Select class...</option>
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Exam Name */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 block">Exam Name *</label>
                  <input
                    type="text"
                    value={examName}
                    onChange={e => setExamName(e.target.value)}
                    placeholder="e.g., First Term CA1"
                    className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                  />
                </div>

                {/* Duration Row */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Objective Duration */}
                  <div className="p-4 rounded-xl bg-brand-green/5 border border-brand-green/20">
                    <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-3 flex items-center gap-1">
                      <Clock size={11} /> Objective Test Duration
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] mb-1">Hours</div>
                        <input
                          type="number"
                          value={objectiveHours}
                          onChange={e => setObjectiveHours(e.target.value)}
                          min="0"
                          max="5"
                          className="w-full p-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                        />
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] mb-1">Minutes</div>
                        <input
                          type="number"
                          value={objectiveMinutes}
                          onChange={e => setObjectiveMinutes(e.target.value)}
                          min="0"
                          max="59"
                          className="w-full p-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Theory Duration */}
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3 flex items-center gap-1">
                      <FileText size={11} /> Theory Test Duration
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] mb-1">Hours</div>
                        <input
                          type="number"
                          value={theoryHours}
                          onChange={e => setTheoryHours(e.target.value)}
                          min="0"
                          max="5"
                          className="w-full p-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] mb-1">Minutes</div>
                        <input
                          type="number"
                          value={theoryMinutes}
                          onChange={e => setTheoryMinutes(e.target.value)}
                          min="0"
                          max="59"
                          className="w-full p-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Questions + Marks */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                      <ListChecks size={11} /> Number of Questions
                    </label>
                    <input
                      type="number"
                      value={numQuestions}
                      onChange={e => setNumQuestions(e.target.value)}
                      min="1"
                      className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                      <Award size={11} /> Total Marks
                    </label>
                    <input
                      type="number"
                      value={totalMarks}
                      onChange={e => setTotalMarks(e.target.value)}
                      min="1"
                      className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                    />
                  </div>
                </div>

                {/* Term */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                    <Calendar size={11} /> Academic Term
                  </label>
                  <select
                    value={term}
                    onChange={e => setTerm(e.target.value)}
                    className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                  >
                    <option>First Term 2025/2026</option>
                    <option>Second Term 2025/2026</option>
                    <option>Third Term 2025/2026</option>
                  </select>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  className="w-full py-4 rounded-full bg-brand-green text-white font-bold uppercase tracking-widest text-sm hover:bg-brand-green-dark transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Save Changes
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
