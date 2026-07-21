"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { CURRENT_TEACHER, FORM_CLASS_STUDENTS } from "@/lib/teacherData";
import { Search, Users, BookOpen, Filter, Phone, MessageSquare, TrendingUp } from "lucide-react";

export default function TeacherStudentsPage() {
  const teacher = CURRENT_TEACHER;
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("All");

  // Get all unique classes teacher teaches
  const allClasses = ["All", ...new Set(teacher.subjectAssignments.flatMap(sa => sa.classes))];

  const filtered = FORM_CLASS_STUDENTS.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-3">
              <BookOpen size={11} /> Subject Teacher
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              MY <span className="text-brand-green">STUDENTS</span>
            </h1>
            <p className="text-white/60 text-sm">All students you teach across {teacher.totalClasses} classes and {teacher.totalSubjects} subjects.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <Users className="text-brand-green mb-2" size={18} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">{teacher.totalStudentsTaught}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Total Students</div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <BookOpen className="text-brand-orange mb-2" size={18} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">{teacher.totalSubjects}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Subjects</div>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <TrendingUp className="text-blue-500 mb-2" size={18} />
                  <div className="font-display text-2xl text-[var(--text-primary)]">{teacher.totalClasses}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Classes</div>
                </div>
              </div>

              {/* Search + Filter */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search students..."
                    className="w-full pl-11 pr-5 py-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                  />
                </div>
                <select
                  value={filterClass}
                  onChange={e => setFilterClass(e.target.value)}
                  className="px-5 py-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                >
                  {allClasses.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Students Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {filtered.map(s => (
                  <div key={s.id} className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:border-brand-green/30 hover:-translate-y-0.5 transition-all">
                    <div className="flex items-start gap-4">
                      <img src={s.photoUrl} alt={s.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-[var(--border-subtle)]" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-bold text-[var(--text-primary)] truncate">{s.name}</h3>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            s.overallGrade.startsWith("A") ? "bg-brand-green/20 text-brand-green" :
                            s.overallGrade.startsWith("B") ? "bg-blue-500/20 text-blue-500" :
                            "bg-brand-orange/20 text-brand-orange"
                          }`}>
                            {s.overallGrade}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mb-3">{s.studentId}</div>
                        <div className="text-xs text-[var(--text-muted)] mb-3">
                          Attendance: <strong className={s.attendanceRate >= 90 ? "text-brand-green" : "text-brand-orange"}>{s.attendanceRate}%</strong>
                        </div>
                        <div className="flex gap-2">
                          <button className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-brand-green/10 text-brand-green text-[10px] font-bold hover:bg-brand-green hover:text-white transition-all">
                            <MessageSquare size={10} /> Message
                          </button>
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
