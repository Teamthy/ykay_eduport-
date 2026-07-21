"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import {
  Eye, School, BookOpen, ChevronDown, ChevronUp, Search,
  HelpCircle, Award, Plus, FileText, AlertCircle
} from "lucide-react";

interface ClassQuestions {
  className: string;
  subjects: {
    name: string;
    questionCount: number;
    totalMarks: number;
    courses?: {
      title: string;
      questions: number;
      marks: number;
      status: "active" | "draft";
    }[];
  }[];
}

const QUESTION_BANK: ClassQuestions[] = [
  {
    className: "SS 3",
    subjects: [{ name: "No Courses", questionCount: 0, totalMarks: 0 }],
  },
  {
    className: "SSS 1",
    subjects: [
      {
        name: "Mathematics",
        questionCount: 45,
        totalMarks: 90,
        courses: [
          { title: "Algebra & Equations", questions: 25, marks: 50, status: "active" },
          { title: "Trigonometry", questions: 20, marks: 40, status: "active" },
        ],
      },
      {
        name: "Physics",
        questionCount: 30,
        totalMarks: 60,
        courses: [
          { title: "Mechanics", questions: 30, marks: 60, status: "active" },
        ],
      },
    ],
  },
  {
    className: "SSS 2",
    subjects: [
      {
        name: "Mathematics",
        questionCount: 60,
        totalMarks: 120,
        courses: [
          { title: "Advanced Algebra", questions: 30, marks: 60, status: "active" },
          { title: "Calculus Basics", questions: 30, marks: 60, status: "draft" },
        ],
      },
    ],
  },
];

export default function QuestionBankPage() {
  const [expanded, setExpanded] = useState<string[]>(["SSS 1"]);
  const [search, setSearch] = useState("");

  const toggle = (className: string) => {
    setExpanded(prev => prev.includes(className) ? prev.filter(c => c !== className) : [...prev, className]);
  };

  const totalQuestions = QUESTION_BANK.reduce((sum, cls) =>
    sum + cls.subjects.reduce((s, sub) => s + sub.questionCount, 0), 0
  );
  const totalMarks = QUESTION_BANK.reduce((sum, cls) =>
    sum + cls.subjects.reduce((s, sub) => s + sub.totalMarks, 0), 0
  );

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-3">
              <Eye size={11} /> Question Bank
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              VIEW UPLOADED <span className="text-brand-green">QUESTIONS</span>
            </h1>
            <p className="text-white/60 text-sm">Browse question bank grouped by class and subject.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Header banner */}
              <div className="p-10 rounded-[2rem] bg-gradient-to-br from-brand-green to-brand-green-dark text-white text-center">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                  <Eye size={28} />
                </div>
                <h2 className="font-display text-3xl mb-2">View Uploaded Questions</h2>
                <p className="text-white/80 text-sm">Browse and manage your question bank</p>
              </div>

              {/* Stats + Search */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <HelpCircle className="text-brand-green mb-2" size={18} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">{totalQuestions}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Total Questions</div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <Award className="text-brand-orange mb-2" size={18} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">{totalMarks}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Total Marks</div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <School className="text-blue-500 mb-2" size={18} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">{QUESTION_BANK.length}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Classes</div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <BookOpen className="text-purple-500 mb-2" size={18} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">
                    {QUESTION_BANK.reduce((s, c) => s + c.subjects.filter(sub => sub.name !== "No Courses").length, 0)}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Subjects</div>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search classes or subjects..."
                  className="w-full pl-11 pr-5 py-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                />
              </div>

              {/* Class Groups */}
              <div className="space-y-4">
                {QUESTION_BANK.filter(c => c.className.toLowerCase().includes(search.toLowerCase())).map(cls => {
                  const isExpanded = expanded.includes(cls.className);
                  const validSubjects = cls.subjects.filter(s => s.name !== "No Courses");
                  const hasContent = validSubjects.length > 0;

                  return (
                    <div key={cls.className} className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] overflow-hidden">
                      <button
                        onClick={() => toggle(cls.className)}
                        className="w-full p-5 flex items-center justify-between hover:bg-[var(--surface-disabled)] transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center">
                            <School size={20} />
                          </div>
                          <div className="text-left">
                            <div className="font-display text-lg text-[var(--text-primary)]">{cls.className}</div>
                            <span className="inline-block mt-1 text-[10px] px-2.5 py-0.5 rounded-full bg-brand-green text-white font-bold uppercase tracking-widest">
                              {validSubjects.length || 1} {validSubjects.length === 1 ? "Subject" : "Subjects"}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-brand-green font-bold uppercase tracking-widest flex items-center gap-1">
                          {isExpanded ? "Click to Collapse" : "Click to Expand"}
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-[var(--border-subtle)] p-6 bg-[var(--surface-disabled)]/30 space-y-3">
                          {hasContent ? (
                            cls.subjects.map(subject => (
                              <div key={subject.name} className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-5">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-brand-green/10 text-brand-green flex items-center justify-center">
                                      <BookOpen size={16} />
                                    </div>
                                    <div className="font-bold text-[var(--text-primary)]">{subject.name}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green font-bold flex items-center gap-1">
                                      <HelpCircle size={9} /> {subject.questionCount} Questions
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange font-bold flex items-center gap-1">
                                      <Award size={9} /> {subject.totalMarks} Marks
                                    </span>
                                  </div>
                                </div>

                                {subject.courses && (
                                  <div className="pl-12 space-y-2">
                                    {subject.courses.map(course => (
                                      <div key={course.title} className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-disabled)]">
                                        <div className="flex items-center gap-2">
                                          <FileText size={12} className="text-[var(--text-muted)]" />
                                          <span className="text-sm text-[var(--text-primary)]">{course.title}</span>
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${course.status === "active" ? "bg-brand-green/20 text-brand-green" : "bg-brand-orange/20 text-brand-orange"}`}>
                                            {course.status}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                                          <span>{course.questions} Qs</span>
                                          <span>·</span>
                                          <span>{course.marks} marks</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center rounded-xl bg-[var(--surface-card)] border border-dashed border-[var(--border-subtle)]">
                              <AlertCircle className="mx-auto text-[var(--text-muted)] mb-2" size={32} />
                              <div className="text-sm text-[var(--text-muted)] mb-1">No Courses</div>
                              <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                                <HelpCircle size={11} /> 0 Questions
                                <span>·</span>
                                <Award size={11} /> 0 Marks
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
