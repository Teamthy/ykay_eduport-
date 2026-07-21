"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import { MOCK_STAFF } from "@/lib/mockData";
import { LayoutDashboard, CalendarDays, FileText, User, Bell, ClipboardCheck, GraduationCap, Mail, BookOpen } from "lucide-react";

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

export default function TeachersDirectoryPage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              MY <span className="text-brand-green">TEACHERS</span>
            </h1>
            <p className="text-white/60 text-sm">Faculty directory — your subject and class teachers.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <PortalSidebar portalName="Student" portalType="student" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 grid md:grid-cols-2 gap-4">
              {MOCK_STAFF.map(teacher => (
                <div key={teacher.id} className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:border-brand-green/30 hover:-translate-y-0.5 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center text-white font-display text-lg shrink-0">
                      {teacher.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[var(--text-primary)] mb-1">{teacher.name}</h3>
                      <div className="text-xs text-brand-green font-bold mb-2">{teacher.role}</div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {teacher.subjects.map(s => (
                          <span key={s} className="text-[9px] px-2 py-0.5 rounded bg-brand-green/10 text-brand-green font-bold">
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1"><BookOpen size={11} /> {teacher.classes} classes</span>
                        <span className="flex items-center gap-1"><Mail size={11} /> {teacher.email}</span>
                      </div>
                    </div>
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

