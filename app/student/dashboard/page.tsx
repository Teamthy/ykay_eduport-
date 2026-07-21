"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import {
  LayoutDashboard, CalendarDays, FileText, User, Bell, ClipboardCheck,
  TrendingUp, Award, GraduationCap, Clock, Users, Calendar,
  BookOpen, Activity, Sparkles, Sun, Cloud, ChevronRight
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/student/attendance", icon: CalendarDays },
  { label: "Timetable", href: "/student/timetable", icon: CalendarDays },
  { label: "CBT Tests", href: "/student/exams", icon: ClipboardCheck, badge: "2" },
  { label: "E-Exams", href: "/student/e-exams", icon: FileText },
  { label: "Report Cards", href: "/student/report-cards", icon: FileText },
  { label: "Announcements", href: "/student/announcements", icon: Bell, badge: "3" },
  { label: "My Profile", href: "/student/profile", icon: User },
  { label: "Teachers", href: "/student/teachers", icon: GraduationCap },
];

const QUICK_ACCESS = [
  { title: "Performance", desc: "Track academic progress", icon: TrendingUp, href: "/student/report-cards", color: "text-brand-green", badge: "Updated", badgeColor: "bg-brand-green" },
  { title: "Attendance", desc: "Monitor attendance", icon: CalendarDays, href: "/student/attendance", color: "text-blue-500", badge: "Daily", badgeColor: "bg-blue-500" },
  { title: "CBT Tests", desc: "Computer-based testing", icon: ClipboardCheck, href: "/student/exams", color: "text-brand-orange", badge: "Active", badgeColor: "bg-brand-orange" },
  { title: "E-Exams", desc: "Online examination", icon: FileText, href: "/student/e-exams", color: "text-red-500", badge: "Available", badgeColor: "bg-red-500" },
  { title: "Profile", desc: "View profile details", icon: User, href: "/student/profile", color: "text-cyan-500", badge: "View", badgeColor: "bg-cyan-500" },
  { title: "Teachers", desc: "Faculty information", icon: GraduationCap, href: "/student/teachers", color: "text-purple-500", badge: "Directory", badgeColor: "bg-purple-500" },
  { title: "Schedule", desc: "Class timetable", icon: Calendar, href: "/student/timetable", color: "text-pink-500", badge: "Soon", badgeColor: "bg-pink-500" },
];

const RECENT_ACTIVITY = [
  { text: "Mathematics CA1 result released — 87%", time: "2 hours ago", type: "grade" },
  { text: "Attendance marked: Present", time: "Today 8:05 AM", type: "attendance" },
  { text: "New announcement: Mid-term schedule", time: "Yesterday", type: "announcement" },
  { text: "Report card available for download", time: "3 days ago", type: "report" },
];

const UPCOMING_EVENTS = [
  { title: "Physics Mid-Term Exam", date: "Aug 4, 2025", time: "10:00 AM", type: "exam" },
  { title: "Cultural Day", date: "Aug 15, 2025", time: "10:00 AM", type: "event" },
  { title: "Term Break", date: "Aug 22, 2025", time: "12:00 PM", type: "holiday" },
];

export default function StudentDashboardPage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        {/* Hero Welcome */}
        <section className="pt-24 pb-10 bg-brand-navy px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 bg-gradient-to-l from-brand-green to-transparent" />
          <div className="mx-auto max-w-7xl relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-display text-4xl md:text-5xl text-white tracking-widest">{greeting}</h1>
                  <div className="flex items-center gap-1 text-brand-orange">
                    <Sun size={20} />
                    <Cloud size={16} className="-ml-2 mt-1" />
                  </div>
                </div>
                <p className="text-white/60 text-sm">Welcome back to your dashboard</p>
              </div>

              {/* Stats cards */}
              <div className="flex gap-3">
                {[
                  { label: "Attendance", value: "Coming Soon", color: "brand-green" },
                  { label: "Avg. Grade", value: "Coming Soon", color: "brand-orange" },
                  { label: "Days Left", value: "Coming Soon", color: "brand-green" },
                  { label: "Alerts", value: "Soon", color: "brand-orange" },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl bg-white/5 border border-white/10 text-center min-w-[80px]">
                    <div className={`font-display text-sm text-${s.color} mb-0.5`}>{s.value}</div>
                    <div className="text-[9px] text-white/60 uppercase tracking-widest">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student card */}
            <div className="mt-6 p-5 rounded-2xl bg-white/5 border border-white/10 inline-flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center text-white font-display text-xl">
                EA
              </div>
              <div>
                <div className="font-bold text-white text-lg">EMMANUEL ADEBAYO</div>
                <div className="text-xs text-white/60">Student · Grade N/A</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <PortalSidebar portalName="Student" portalType="student" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 space-y-8">
              {/* Quick Access Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-display text-xl text-[var(--text-primary)]">Quick Access</h2>
                    <p className="text-xs text-[var(--text-muted)]">{QUICK_ACCESS.length} features available</p>
                  </div>
                  <span className="text-[10px] px-3 py-1 rounded-full bg-brand-green/10 text-brand-green font-bold uppercase tracking-widest">Updated daily</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {QUICK_ACCESS.map(item => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="group p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:border-brand-green/40 hover:-translate-y-1 hover:shadow-[var(--card-shadow-hover)] transition-all relative overflow-hidden"
                    >
                      {/* Badge */}
                      <span className={`absolute top-3 right-3 text-[8px] px-1.5 py-0.5 rounded ${item.badgeColor} text-white font-bold uppercase`}>
                        {item.badge}
                      </span>

                      <div className={`w-12 h-12 rounded-2xl bg-[var(--surface-disabled)] flex items-center justify-center mb-4 group-hover:bg-brand-green/10 transition-colors ${item.color}`}>
                        <item.icon size={22} />
                      </div>
                      <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1">{item.title}</h3>
                      <p className="text-[10px] text-[var(--text-muted)]">{item.desc}</p>
                      <ChevronRight size={14} className="absolute bottom-4 right-4 text-[var(--text-muted)] group-hover:text-brand-green group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Two-column layout */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="text-brand-green" size={18} />
                    <h3 className="font-display text-lg text-[var(--text-primary)]">Recent Activity</h3>
                  </div>
                  <div className="space-y-3">
                    {RECENT_ACTIVITY.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-disabled)]">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          a.type === "grade" ? "bg-brand-green" :
                          a.type === "attendance" ? "bg-blue-500" :
                          a.type === "announcement" ? "bg-brand-orange" :
                          "bg-purple-500"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[var(--text-primary)]">{a.text}</div>
                          <div className="text-[10px] text-[var(--text-muted)] mt-1">{a.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming Events */}
                <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="text-brand-orange" size={18} />
                    <h3 className="font-display text-lg text-[var(--text-primary)]">Upcoming Events</h3>
                  </div>
                  <div className="space-y-3">
                    {UPCOMING_EVENTS.map((e, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--surface-disabled)]">
                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-center shrink-0 ${
                          e.type === "exam" ? "bg-red-500/10 text-red-500" :
                          e.type === "event" ? "bg-brand-green/10 text-brand-green" :
                          "bg-blue-500/10 text-blue-500"
                        }`}>
                          <div className="text-[8px] uppercase font-bold">{e.date.split(" ")[0]}</div>
                          <div className="font-display text-lg">{e.date.split(" ")[1]?.replace(",", "")}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-[var(--text-primary)]">{e.title}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">{e.time}</div>
                        </div>
                      </div>
                    ))}
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
