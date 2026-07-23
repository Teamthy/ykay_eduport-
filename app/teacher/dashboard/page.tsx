"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import {
  BookOpen, Users, TrendingUp, ClipboardCheck, ArrowRight,
  UserCheck, AlertCircle, CheckCircle2, Sparkles, LoaderCircle,
  Activity, FileText, School, Lock,
} from "lucide-react";

type DashboardResponse = {
  teacher: {
    displayName: string;
    roleLabel: string | null;
    photoUrl: string | null;
    isFormTeacher: boolean;
    isSubjectTeacher: boolean;
    formClassName: string | null;
  };
  stats: {
    classCount: number;
    totalStudents: number;
    subjectCount: number;
    pendingCorrections: number;
    todayRegisterDone: boolean;
  };
  assignments: Array<{
    id: string;
    role: string;
    subjectName: string | null;
    className: string;
    studentCount: number;
  }>;
  recentSessions: Array<{
    className: string;
    date: string;
    present: number;
    total: number;
    isLocked: boolean;
  }>;
  activity: Array<{ action: string; entityType: string; at: string }>;
};

function actionLabel(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} day(s) ago`;
}

export default function TeacherDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/teacher/dashboard", { cache: "no-store" });
        const body = (await response.json()) as DashboardResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load your dashboard.");
        setData(body);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load your dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const initials = data
    ? data.teacher.displayName.split(" ").map((part) => part[0]).slice(0, 2).join("")
    : "";

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        {/* Hero */}
        <section className="pt-24 pb-12 bg-brand-navy px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 bg-gradient-to-l from-brand-green to-transparent" />
          <div className="mx-auto max-w-7xl relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-brand-green to-brand-green-dark border-4 border-brand-green shadow-2xl flex items-center justify-center font-display text-4xl text-white">
              {initials || "…"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 text-brand-green">
                <Sparkles size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">{greeting}</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl text-white mb-2 tracking-widest">
                {data ? data.teacher.displayName.toUpperCase() : "TEACHER PORTAL"}
              </h1>
              {data ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {data.teacher.isSubjectTeacher ? (
                    <span className="px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold uppercase tracking-widest">
                      Subject Teacher · {data.stats.subjectCount} subject(s)
                    </span>
                  ) : null}
                  {data.teacher.isFormTeacher ? (
                    <span className="px-3 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-[10px] font-bold uppercase tracking-widest">
                      Form Teacher · {data.teacher.formClassName}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {data ? (
                <p className="text-white/60 text-sm">
                  {data.stats.totalStudents} students across {data.stats.classCount} class arm(s).
                  {data.stats.todayRegisterDone
                    ? " Today's attendance register is submitted."
                    : " Today's attendance register is still pending."}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-8">
              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>
              ) : null}

              {loading ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-10 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading your dashboard...
                  </div>
                </div>
              ) : null}

              {!loading && data ? (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Class Arms", value: data.stats.classCount, icon: School, color: "text-brand-green" },
                      { label: "Students", value: data.stats.totalStudents, icon: Users, color: "text-brand-orange" },
                      { label: "Subjects", value: data.stats.subjectCount, icon: BookOpen, color: "text-brand-green" },
                      { label: "Pending Corrections", value: data.stats.pendingCorrections, icon: AlertCircle, color: data.stats.pendingCorrections ? "text-brand-orange" : "text-brand-green" },
                    ].map((stat) => (
                      <div key={stat.label} className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)]">
                        <stat.icon size={18} className={`mb-3 ${stat.color}`} />
                        <div className={`font-display text-3xl ${stat.color}`}>{stat.value}</div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-1">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Attendance CTA */}
                  <div
                    className={`flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border p-6 ${
                      data.stats.todayRegisterDone
                        ? "border-brand-green/25 bg-brand-green/5"
                        : "border-brand-orange/25 bg-brand-orange/5"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white ${
                          data.stats.todayRegisterDone ? "bg-brand-green" : "bg-brand-orange"
                        }`}
                      >
                        {data.stats.todayRegisterDone ? <CheckCircle2 size={26} /> : <UserCheck size={26} />}
                      </div>
                      <div>
                        <div className="font-display text-xl text-[var(--text-primary)]">
                          {data.stats.todayRegisterDone ? "Today's register is submitted" : "Mark today's attendance"}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {data.stats.todayRegisterDone
                            ? "You can review the register or raise a correction request."
                            : "Parents receive automatic alerts for absences once you submit."}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/teacher/class/attendance"
                      className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-all ${
                        data.stats.todayRegisterDone ? "bg-brand-green hover:bg-brand-green-dark" : "bg-brand-orange hover:bg-brand-orange-dark"
                      }`}
                    >
                      Open Register <ArrowRight size={14} />
                    </Link>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* My assignments */}
                    <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                      <h2 className="mb-5 font-display text-xl text-[var(--text-primary)]">My Assignments</h2>
                      {data.assignments.length ? (
                        <div className="space-y-2">
                          {data.assignments.map((assignment) => (
                            <div key={assignment.id} className="flex items-center justify-between rounded-xl bg-[var(--surface-disabled)] px-4 py-3">
                              <div>
                                <div className="text-sm font-bold text-[var(--text-primary)]">
                                  {assignment.subjectName || "Form Duty"} — {assignment.className}
                                </div>
                                <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                                  {assignment.role === "FORM_TEACHER" ? "Form Teacher" : "Subject Teacher"} · {assignment.studentCount} students
                                </div>
                              </div>
                              <Link
                                href={assignment.role === "FORM_TEACHER" ? "/teacher/class/attendance" : "/teacher/gradebook"}
                                className="text-xs font-bold text-brand-green hover:underline"
                              >
                                Open
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--text-muted)]">No active class assignments. Contact the administrator.</p>
                      )}
                    </div>

                    {/* Recent registers */}
                    <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                      <div className="mb-5 flex items-center justify-between">
                        <h2 className="font-display text-xl text-[var(--text-primary)]">Recent Registers</h2>
                        <Link href="/teacher/class/attendance-history" className="text-xs font-bold text-brand-green hover:underline">
                          History
                        </Link>
                      </div>
                      {data.recentSessions.length ? (
                        <div className="space-y-2">
                          {data.recentSessions.map((session, index) => (
                            <div key={`${session.date}-${index}`} className="flex items-center justify-between rounded-xl bg-[var(--surface-disabled)] px-4 py-3">
                              <div>
                                <div className="text-sm font-bold text-[var(--text-primary)]">{session.className}</div>
                                <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                                  {new Date(session.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-brand-green">
                                  {session.present}/{session.total} present
                                </span>
                                {session.isLocked ? <Lock size={12} className="text-[var(--text-muted)]" /> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--text-muted)]">No submitted registers yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Quick actions + activity */}
                  <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { title: "Gradebook", desc: "Enter CA & exam scores", icon: BookOpen, href: "/teacher/gradebook" },
                        { title: "Attendance", desc: "Daily class register", icon: ClipboardCheck, href: "/teacher/class/attendance" },
                        { title: "Report Cards", desc: "Class result overview", icon: FileText, href: "/teacher/class/report-cards" },
                        { title: "Analytics", desc: "Performance insight", icon: TrendingUp, href: "/teacher/analytics" },
                      ].map((item) => (
                        <Link
                          key={item.title}
                          href={item.href}
                          className="group p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:border-brand-green/40 hover:-translate-y-1 hover:shadow-[var(--card-shadow-hover)] transition-all"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-[var(--surface-disabled)] flex items-center justify-center mb-4 text-brand-green group-hover:bg-brand-green/10 transition-colors">
                            <item.icon size={22} />
                          </div>
                          <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1">{item.title}</h3>
                          <p className="text-[10px] text-[var(--text-muted)]">{item.desc}</p>
                        </Link>
                      ))}
                    </div>

                    <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                      <div className="mb-5 flex items-center gap-2">
                        <Activity size={18} className="text-brand-green" />
                        <h2 className="font-display text-xl text-[var(--text-primary)]">My Activity</h2>
                      </div>
                      {data.activity.length ? (
                        <div className="space-y-3">
                          {data.activity.map((entry, index) => (
                            <div key={`${entry.at}-${index}`} className="flex items-start gap-3">
                              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-green" />
                              <div className="min-w-0">
                                <div className="text-sm text-[var(--text-primary)]">{actionLabel(entry.action)}</div>
                                <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{timeAgo(entry.at)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--text-muted)]">Your recent actions will appear here.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
