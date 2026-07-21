"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { CURRENT_TEACHER } from "@/lib/teacherData";
import { useToast } from "@/components/Toast";
import {
  BookOpen, Calendar, Clock, FileText, ChevronDown, ChevronUp,
  Save, Award, Tag, ListChecks, School
} from "lucide-react";

interface TestCourse {
  subject: string;
  examDate: string;
  objectiveHours: number;
  objectiveMinutes: number;
  theoryHours: number;
  theoryMinutes: number;
  numQuestions: number;
  totalMarks: number;
  academicTerm: string;
}

export default function TestCoursesPage() {
  const { toast } = useToast();
  const teacher = CURRENT_TEACHER;
  const [selectedClass, setSelectedClass] = useState("SS3");
  const [expanded, setExpanded] = useState<string | null>(teacher.subjectAssignments[0]?.subject || null);

  const [courses, setCourses] = useState<Record<string, TestCourse>>({
    "Mathematics": { subject: "Mathematics", examDate: "2026-02-17", objectiveHours: 0, objectiveMinutes: 20, theoryHours: 0, theoryMinutes: 0, numQuestions: 30, totalMarks: 30, academicTerm: "2026/2027 · 2nd Term" },
    "Physics": { subject: "Physics", examDate: "2026-02-19", objectiveHours: 0, objectiveMinutes: 30, theoryHours: 1, theoryMinutes: 0, numQuestions: 40, totalMarks: 60, academicTerm: "2026/2027 · 2nd Term" },
  });

  const allClasses = [...new Set(teacher.subjectAssignments.flatMap(sa => sa.classes))];
  const teacherSubjects = teacher.subjectAssignments.map(sa => sa.subject);

  const updateCourse = (subject: string, field: keyof TestCourse, value: any) => {
    setCourses(prev => ({
      ...prev,
      [subject]: { ...(prev[subject] || { subject } as TestCourse), [field]: value }
    }));
  };

  const handleSave = (subject: string) => {
    toast(`${subject} test configuration saved`, "success");
  };

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-3">
              <BookOpen size={11} /> Test Configuration
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              EDIT TEST <span className="text-brand-green">COURSES</span>
            </h1>
            <p className="text-white/60 text-sm">Configure test parameters for each subject and class arm.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Title Banner */}
              <div className="p-8 rounded-[2rem] bg-gradient-to-br from-brand-green to-brand-green-dark text-white text-center">
                <h2 className="font-display text-3xl mb-2">EDIT TEST COURSES</h2>
                <p className="text-white/80 text-sm">Configure exam duration, marks, and academic terms</p>
              </div>

              {/* Class Selector */}
              <div className="p-4 rounded-2xl bg-brand-green text-white flex items-center gap-3">
                <School size={22} />
                <span className="font-display text-xl tracking-widest">Class:</span>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white font-bold focus:outline-none focus:border-white"
                >
                  {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Subject Cards */}
              {teacherSubjects.map(subj => {
                const course = courses[subj] || {
                  subject: subj, examDate: "", objectiveHours: 0, objectiveMinutes: 30,
                  theoryHours: 0, theoryMinutes: 0, numQuestions: 20, totalMarks: 30,
                  academicTerm: "2025/2026 · 1st Term"
                };
                const isExpanded = expanded === subj;

                return (
                  <div key={subj} className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] overflow-hidden shadow-[var(--card-shadow)]">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : subj)}
                      className="w-full p-5 bg-brand-green text-white flex items-center justify-between hover:bg-brand-green-dark transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen size={20} />
                        <span className="font-display text-xl">{subj.toLowerCase()}</span>
                      </div>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {isExpanded && (
                      <div className="p-6 space-y-5">
                        {/* Row 1 */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                              <Tag size={11} /> Subject Name
                            </label>
                            <input
                              value={course.subject.toLowerCase()}
                              readOnly
                              className="w-full p-3 rounded-xl bg-[var(--surface-disabled)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                              <Calendar size={11} /> Exam Date
                            </label>
                            <input
                              type="date"
                              value={course.examDate}
                              onChange={e => updateCourse(subj, "examDate", e.target.value)}
                              className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                            />
                          </div>
                        </div>

                        {/* Row 2: Duration */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Objective */}
                          <div className="p-4 rounded-xl bg-brand-green/5 border border-brand-green/20">
                            <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-3 flex items-center gap-1">
                              <Clock size={11} /> Objective Test Duration
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-[10px] text-[var(--text-muted)] mb-1">Hours</div>
                                <input
                                  type="number"
                                  value={course.objectiveHours}
                                  onChange={e => updateCourse(subj, "objectiveHours", Number(e.target.value))}
                                  min="0" max="5"
                                  className="w-full p-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                                />
                              </div>
                              <div>
                                <div className="text-[10px] text-[var(--text-muted)] mb-1">Minutes</div>
                                <input
                                  type="number"
                                  value={course.objectiveMinutes}
                                  onChange={e => updateCourse(subj, "objectiveMinutes", Number(e.target.value))}
                                  min="0" max="59"
                                  className="w-full p-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Theory */}
                          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                            <label className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3 flex items-center gap-1">
                              <FileText size={11} /> Theory Test Duration
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-[10px] text-[var(--text-muted)] mb-1">Hours</div>
                                <input
                                  type="number"
                                  value={course.theoryHours}
                                  onChange={e => updateCourse(subj, "theoryHours", Number(e.target.value))}
                                  min="0" max="5"
                                  className="w-full p-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <div className="text-[10px] text-[var(--text-muted)] mb-1">Minutes</div>
                                <input
                                  type="number"
                                  value={course.theoryMinutes}
                                  onChange={e => updateCourse(subj, "theoryMinutes", Number(e.target.value))}
                                  min="0" max="59"
                                  className="w-full p-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Row 3 */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                              <ListChecks size={11} /> Number of Questions
                            </label>
                            <input
                              type="number"
                              value={course.numQuestions}
                              onChange={e => updateCourse(subj, "numQuestions", Number(e.target.value))}
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
                              value={course.totalMarks}
                              onChange={e => updateCourse(subj, "totalMarks", Number(e.target.value))}
                              min="1"
                              className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 flex items-center gap-1">
                            <Calendar size={11} /> Academic Term
                          </label>
                          <select
                            value={course.academicTerm}
                            onChange={e => updateCourse(subj, "academicTerm", e.target.value)}
                            className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                          >
                            <option>2025/2026 · 1st Term</option>
                            <option>2025/2026 · 2nd Term</option>
                            <option>2025/2026 · 3rd Term</option>
                            <option>2026/2027 · 1st Term</option>
                            <option>2026/2027 · 2nd Term</option>
                          </select>
                        </div>

                        <button
                          onClick={() => handleSave(subj)}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-green text-white text-sm font-bold hover:bg-brand-green-dark transition-all shadow-lg"
                        >
                          <Save size={14} /> Save Changes
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
