"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Award,
  Calendar,
  Download,
  Filter,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";

interface StudentResult {
  name: string;
  marks: number;
  totalMarks: number;
  date: string;
  time: string;
}

interface ClassResults {
  className: string;
  subjects: {
    name: string;
    studentCount: number;
    results: StudentResult[];
  }[];
}

const RESULTS: ClassResults[] = [
  {
    className: "SS 3",
    subjects: [],
  },
  {
    className: "SSS 1",
    subjects: [
      {
        name: "chemistry",
        studentCount: 16,
        results: [
          { name: "Adeshina Smith", marks: 5, totalMarks: 30, date: "2026-06-08", time: "09:39" },
          {
            name: "Uzoigwe Emmanuel",
            marks: 10,
            totalMarks: 30,
            date: "2026-06-08",
            time: "09:46",
          },
          { name: "Umar Ummulkhair", marks: 28, totalMarks: 30, date: "2026-06-08", time: "09:48" },
          { name: "Kareem Benjamin", marks: 9, totalMarks: 30, date: "2026-06-08", time: "09:48" },
          { name: "Ige Iniolowa", marks: 18, totalMarks: 30, date: "2026-06-08", time: "09:50" },
          { name: "Chidi Emmanuel", marks: 14, totalMarks: 30, date: "2026-06-08", time: "09:50" },
          {
            name: "Oladipupo Jeremiah",
            marks: 10,
            totalMarks: 30,
            date: "2026-06-08",
            time: "09:50",
          },
          {
            name: "Onabanjo Marvelous",
            marks: 10,
            totalMarks: 30,
            date: "2026-06-08",
            time: "09:57",
          },
          { name: "Collins Emeka", marks: 12, totalMarks: 30, date: "2026-06-08", time: "09:58" },
          {
            name: "Moboluwaji Naomi",
            marks: 29,
            totalMarks: 30,
            date: "2026-06-08",
            time: "10:04",
          },
          { name: "Ademola Ray", marks: 10, totalMarks: 30, date: "2026-06-08", time: "10:09" },
          { name: "Adeyanju Rodiat", marks: 9, totalMarks: 30, date: "2026-06-08", time: "10:09" },
        ],
      },
    ],
  },
  {
    className: "SSS 2",
    subjects: [
      {
        name: "mathematics",
        studentCount: 24,
        results: [
          {
            name: "Emmanuel Adebayo",
            marks: 26,
            totalMarks: 30,
            date: "2026-06-10",
            time: "10:15",
          },
          { name: "Fatima Yusuf", marks: 28, totalMarks: 30, date: "2026-06-10", time: "10:18" },
          { name: "David Okoye", marks: 22, totalMarks: 30, date: "2026-06-10", time: "10:20" },
        ],
      },
    ],
  },
];

export default function TestResultsPage() {
  const [expanded, setExpanded] = useState<string[]>(["SSS 1"]);
  const [search, setSearch] = useState("");
  const [session, setSession] = useState("2026/2027");
  const [term, setTerm] = useState("3rd Term");

  const toggle = (className: string) => {
    setExpanded((prev) =>
      prev.includes(className) ? prev.filter((c) => c !== className) : [...prev, className],
    );
  };

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-3">
              <BarChart3 size={11} /> Test Results
            </span>
            <h1 className="font-display text-3xl md:text-4xl tracking-widest text-white mb-2">
              TEST RESULTS · {session} SESSION · {term.toUpperCase()}
            </h1>
            <p className="text-white/60 text-sm">
              View student test performance grouped by class and subject.
            </p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)]"
                >
                  <option>2025/2026</option>
                  <option>2026/2027</option>
                </select>
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)]"
                >
                  <option>1st Term</option>
                  <option>2nd Term</option>
                  <option>3rd Term</option>
                </select>
                <div className="flex-1 relative min-w-[200px]">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search classes..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                  />
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-white text-sm font-bold hover:bg-brand-green-dark transition-all">
                  <Download size={14} /> Export
                </button>
              </div>

              {/* Results by Class */}
              <div className="space-y-3">
                {RESULTS.filter((c) =>
                  c.className.toLowerCase().includes(search.toLowerCase()),
                ).map((cls) => {
                  const isExpanded = expanded.includes(cls.className);

                  return (
                    <div
                      key={cls.className}
                      className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] overflow-hidden"
                    >
                      <button
                        onClick={() => toggle(cls.className)}
                        className={`w-full p-4 flex items-center justify-between transition-colors ${isExpanded ? "bg-blue-500/10 border-b border-blue-500/20" : "hover:bg-[var(--surface-disabled)]"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <Award size={16} />
                          </div>
                          <span className="font-display text-lg text-[var(--text-primary)]">
                            {cls.className}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-[var(--text-muted)]" />
                        ) : (
                          <ChevronDown size={16} className="text-[var(--text-muted)]" />
                        )}
                      </button>

                      {isExpanded &&
                        cls.subjects.map((subj) => (
                          <div
                            key={subj.name}
                            className="p-6 border-t border-[var(--border-subtle)] first:border-t-0"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="font-display text-xl text-[var(--text-primary)]">
                                  {subj.name}
                                </h3>
                                <p className="text-xs text-[var(--text-muted)]">
                                  Students: {subj.studentCount}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] px-3 py-1 rounded-full bg-brand-green/10 text-brand-green font-bold uppercase tracking-widest">
                                  <Users size={9} className="inline mr-1" /> {subj.results.length}{" "}
                                  results
                                </span>
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-[var(--border-subtle)]">
                                    <th className="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">
                                      Student Name
                                    </th>
                                    <th className="text-center px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">
                                      Marks
                                    </th>
                                    <th className="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">
                                      Date
                                    </th>
                                    <th className="text-center px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">
                                      Time
                                    </th>
                                    <th className="text-center px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">
                                      %
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {subj.results.map((r, i) => {
                                    const percent = Math.round((r.marks / r.totalMarks) * 100);
                                    return (
                                      <tr
                                        key={i}
                                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-disabled)]"
                                      >
                                        <td className="px-3 py-3 font-medium text-[var(--text-primary)]">
                                          {r.name}
                                        </td>
                                        <td className="px-3 py-3 text-center font-bold text-[var(--text-primary)]">
                                          {r.marks}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-[var(--text-muted)]">
                                          {r.date}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-[var(--text-muted)] text-center">
                                          {r.time}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                          <span
                                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${percent >= 70 ? "bg-brand-green/10 text-brand-green" : percent >= 50 ? "bg-brand-orange/10 text-brand-orange" : "bg-red-500/10 text-red-500"}`}
                                          >
                                            {percent}%
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
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
