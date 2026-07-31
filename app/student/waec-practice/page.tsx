"use client";

import { useState } from "react";
import Link from "next/link";
import PortalTopbar from "@/components/PortalTopbar";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import { ALL_QUESTIONS } from "@/lib/questionBank";
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  FileText,
  User,
  Bell,
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  Award,
  Target,
  Clock,
  PlayCircle,
  TrendingUp,
  Star,
  Sparkles,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "CBT Exams", href: "/student/exams", icon: ClipboardCheck },
  { label: "WAEC Practice", href: "/student/waec-practice", icon: Award, badge: "Mock" },
  { label: "E-Exams", href: "/student/e-exams", icon: FileText },
  { label: "Attendance", href: "/student/attendance", icon: CalendarDays },
  { label: "Report Cards", href: "/student/report-cards", icon: FileText },
  { label: "Announcements", href: "/student/announcements", icon: Bell },
  { label: "My Profile", href: "/student/profile", icon: User },
  { label: "Teachers", href: "/student/teachers", icon: GraduationCap },
];

const WAEC_SUBJECTS = [
  {
    name: "Mathematics",
    icon: BookOpen,
    questions: ALL_QUESTIONS.filter((q) => q.subject === "Mathematics" && q.waecYear).length + 15,
    years: "2019-2024",
    color: "brand-green",
    bestScore: 78,
  },
  {
    name: "Physics",
    icon: Target,
    questions: ALL_QUESTIONS.filter((q) => q.subject === "Physics" && q.waecYear).length + 20,
    years: "2019-2024",
    color: "brand-orange",
    bestScore: 82,
  },
  {
    name: "English Language",
    icon: BookOpen,
    questions: 45,
    years: "2019-2024",
    color: "blue-500",
    bestScore: null,
  },
  {
    name: "Chemistry",
    icon: BookOpen,
    questions: 40,
    years: "2020-2024",
    color: "purple-500",
    bestScore: null,
  },
  {
    name: "Biology",
    icon: BookOpen,
    questions: 35,
    years: "2020-2024",
    color: "red-500",
    bestScore: null,
  },
  {
    name: "Economics",
    icon: BookOpen,
    questions: 30,
    years: "2021-2024",
    color: "cyan-500",
    bestScore: 65,
  },
];

const MOCK_EXAMS = [
  {
    id: "waec-math-2024",
    title: "WAEC Mathematics 2024",
    subject: "Mathematics",
    year: 2024,
    questions: 50,
    duration: 120,
    status: "available",
  },
  {
    id: "waec-phy-2023",
    title: "WAEC Physics 2023",
    subject: "Physics",
    year: 2023,
    questions: 50,
    duration: 90,
    status: "available",
  },
  {
    id: "waec-eng-2024",
    title: "WAEC English 2024",
    subject: "English Language",
    year: 2024,
    questions: 80,
    duration: 150,
    status: "coming_soon",
  },
  {
    id: "jamb-math-2024",
    title: "JAMB Mathematics 2024",
    subject: "Mathematics",
    year: 2024,
    questions: 40,
    duration: 60,
    status: "available",
  },
  {
    id: "jamb-eng-2024",
    title: "JAMB English 2024",
    subject: "English Language",
    year: 2024,
    questions: 60,
    duration: 60,
    status: "coming_soon",
  },
];

export default function WAECPracticePage() {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  return (
    <>
      <PortalTopbar />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 bg-gradient-to-l from-brand-orange to-transparent" />
          <div className="mx-auto max-w-7xl relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-[10px] font-bold uppercase tracking-widest mb-3">
              <Award size={11} /> WAEC / JAMB / BECE Practice
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              EXAM <span className="text-brand-orange">PRACTICE</span>
            </h1>
            <p className="text-white/60 text-sm">
              Practice with real past questions from WAEC, JAMB, and BECE exams (2019-2024).
            </p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <PortalSidebar portalName="Student" portalType="student" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Practice Banner */}
              <div className="p-8 rounded-[2rem] bg-gradient-to-br from-brand-orange/20 to-brand-orange/5 border border-brand-orange/40 text-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-orange/20 text-brand-orange flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={28} />
                </div>
                <h2 className="font-display text-2xl text-[var(--text-primary)] mb-2">
                  WAEC & JAMB Exam Prep
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Practice with past questions to prepare for your national exams. Track your
                  progress across subjects.
                </p>
              </div>

              {/* Subject Cards */}
              <div>
                <h3 className="font-display text-xl text-[var(--text-primary)] mb-4">
                  Choose Subject
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {WAEC_SUBJECTS.map((subj) => (
                    <button
                      key={subj.name}
                      onClick={() => setSelectedSubject(subj.name)}
                      className={`p-6 rounded-2xl bg-[var(--surface-card)] border text-left transition-all hover:-translate-y-1 ${
                        selectedSubject === subj.name
                          ? "border-brand-orange shadow-[var(--card-shadow-hover)]"
                          : "border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:border-brand-orange/30"
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-xl bg-${subj.color}/10 text-${subj.color} flex items-center justify-center mb-4`}
                      >
                        <subj.icon size={22} />
                      </div>
                      <h4 className="font-bold text-[var(--text-primary)] mb-1">{subj.name}</h4>
                      <div className="text-xs text-[var(--text-muted)] space-y-1">
                        <div className="flex items-center gap-1">
                          <BookOpen size={11} /> {subj.questions} questions
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={11} /> Years: {subj.years}
                        </div>
                        {subj.bestScore !== null && (
                          <div className="flex items-center gap-1 text-brand-green">
                            <TrendingUp size={11} /> Best: {subj.bestScore}%
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mock Exams */}
              <div>
                <h3 className="font-display text-xl text-[var(--text-primary)] mb-4">Mock Exams</h3>
                <div className="space-y-3">
                  {MOCK_EXAMS.filter((e) => !selectedSubject || e.subject === selectedSubject).map(
                    (exam) => (
                      <div
                        key={exam.id}
                        className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] flex flex-col md:flex-row md:items-center gap-4"
                      >
                        <div className="w-12 h-12 rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0">
                          {exam.title.includes("JAMB") ? <Target size={20} /> : <Award size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[var(--text-primary)]">{exam.title}</h4>
                          <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)] mt-1">
                            <span className="flex items-center gap-1">
                              <BookOpen size={11} /> {exam.questions} Qs
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={11} /> {exam.duration} min
                            </span>
                            <span>{exam.subject}</span>
                          </div>
                        </div>
                        {exam.status === "available" ? (
                          <Link
                            href={`/student/exams/exam-math-ca1`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-orange text-white text-sm font-bold hover:bg-brand-orange-dark transition-all shadow-lg"
                          >
                            <PlayCircle size={14} /> Start
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--surface-disabled)] text-[var(--text-muted)] text-sm font-bold">
                            <Clock size={14} /> Coming Soon
                          </span>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Performance Summary */}
              <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-brand-navy-light p-6 text-white">
                <h3 className="font-display text-xl mb-4">Your Practice Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white/10 text-center">
                    <div className="font-display text-3xl text-brand-orange">12</div>
                    <div className="text-[10px] uppercase tracking-widest text-white/60">
                      Tests Taken
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/10 text-center">
                    <div className="font-display text-3xl text-brand-green">68%</div>
                    <div className="text-[10px] uppercase tracking-widest text-white/60">
                      Avg Score
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/10 text-center">
                    <div className="font-display text-3xl text-white">450</div>
                    <div className="text-[10px] uppercase tracking-widest text-white/60">
                      Qs Answered
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/10 text-center">
                    <div className="font-display text-3xl text-brand-green">82%</div>
                    <div className="text-[10px] uppercase tracking-widest text-white/60">
                      Best Score
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
