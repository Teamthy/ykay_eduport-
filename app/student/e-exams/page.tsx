"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  User,
  Bell,
  ClipboardCheck,
  GraduationCap,
  Clock,
  CheckCircle2,
  PlayCircle,
  Lock,
  Calendar,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/student/attendance", icon: CalendarDays },
  { label: "CBT Tests", href: "/student/exams", icon: ClipboardCheck },
  { label: "E-Exams", href: "/student/e-exams", icon: FileText },
  { label: "Report Cards", href: "/student/report-cards", icon: FileText },
  { label: "Announcements", href: "/student/announcements", icon: Bell },
  { label: "My Profile", href: "/student/profile", icon: User },
  { label: "Teachers", href: "/student/teachers", icon: GraduationCap },
];

const EXAMS = [
  {
    id: "1",
    subject: "Mathematics",
    type: "Terminal Exam",
    duration: 120,
    questions: 60,
    totalMarks: 100,
    status: "upcoming",
    date: "Aug 4, 2025",
    time: "9:00 AM",
    venue: "Hall A",
  },
  {
    id: "2",
    subject: "Physics",
    type: "Terminal Exam",
    duration: 90,
    questions: 50,
    totalMarks: 80,
    status: "upcoming",
    date: "Aug 5, 2025",
    time: "9:00 AM",
    venue: "Lab 1",
  },
  {
    id: "3",
    subject: "English Language",
    type: "Terminal Exam",
    duration: 120,
    questions: 80,
    totalMarks: 100,
    status: "upcoming",
    date: "Aug 6, 2025",
    time: "9:00 AM",
    venue: "Hall B",
  },
  {
    id: "4",
    subject: "Chemistry",
    type: "Terminal Exam",
    duration: 90,
    questions: 50,
    totalMarks: 80,
    status: "upcoming",
    date: "Aug 7, 2025",
    time: "9:00 AM",
    venue: "Lab 2",
  },
  {
    id: "5",
    subject: "Biology",
    type: "Mock WAEC",
    duration: 150,
    questions: 60,
    totalMarks: 100,
    status: "completed",
    date: "Jul 10, 2025",
    time: "8:00 AM",
    score: 78,
    venue: "Hall A",
  },
];

export default function EExamsPage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              E-<span className="text-brand-green">EXAMS</span>
            </h1>
            <p className="text-white/60 text-sm">
              Online examinations — terminal exams and mock WAEC/NECO.
            </p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <PortalSidebar portalName="Student" portalType="student" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 space-y-4">
              {/* Exam schedule banner */}
              <div className="p-8 rounded-[2rem] bg-gradient-to-br from-red-500/10 to-brand-orange/10 border border-red-500/30 text-center">
                <Calendar className="mx-auto text-red-500 mb-3" size={32} />
                <h2 className="font-display text-2xl text-[var(--text-primary)] mb-2">
                  Terminal Exams Begin Aug 4
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Prepare early. Review your timetable and study materials.
                </p>
              </div>

              {EXAMS.map((exam) => (
                <div
                  key={exam.id}
                  className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:border-brand-green/30 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                        exam.status === "upcoming"
                          ? "bg-brand-orange/10 text-brand-orange"
                          : "bg-brand-green/10 text-brand-green"
                      }`}
                    >
                      {exam.status === "upcoming" ? <Lock size={22} /> : <CheckCircle2 size={22} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-display text-lg text-[var(--text-primary)]">
                          {exam.subject}
                        </h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                            exam.status === "upcoming"
                              ? "bg-brand-orange/20 text-brand-orange"
                              : "bg-brand-green/20 text-brand-green"
                          }`}
                        >
                          {exam.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                        <span>{exam.type}</span>
                        <span>·</span>
                        <span>{exam.questions} questions</span>
                        <span>·</span>
                        <span>{exam.duration} min</span>
                        <span>·</span>
                        <span>{exam.totalMarks} marks</span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-2">
                        <Calendar size={11} className="inline mr-1" /> {exam.date} · {exam.time} ·{" "}
                        {exam.venue}
                      </div>
                      {exam.status === "completed" && exam.score !== undefined && (
                        <div className="mt-2 text-sm font-bold text-brand-green">
                          Score: {exam.score}%
                        </div>
                      )}
                    </div>
                    {exam.status === "upcoming" && (
                      <div className="text-xs text-brand-orange font-bold uppercase tracking-widest">
                        <Lock size={12} className="inline mr-1" /> Not Available Yet
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
