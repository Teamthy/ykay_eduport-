"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import { LayoutDashboard, CalendarDays, FileText, User, Bell } from "lucide-react";
import { MOCK_TIMETABLE } from "@/lib/mockData";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/student/attendance", icon: CalendarDays },
  { label: "Timetable", href: "/student/timetable", icon: CalendarDays },
  { label: "Report Cards", href: "/student/report-cards", icon: FileText },
  { label: "Announcements", href: "/student/announcements", icon: Bell, badge: "3" },
  { label: "My Profile", href: "/student/dashboard", icon: User },
];

export default function StudentTimetablePage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-32 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-[42px] md:text-[56px] tracking-[3px] text-white mb-4">
              MY <span className="text-brand-green">TIMETABLE</span>
            </h1>
            <p className="text-white/60">Emmanuel Adebayo · SS2 B · First Term 2025/2026</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <PortalSidebar portalName="Student" portalType="student" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 space-y-6">
              {MOCK_TIMETABLE.map(day => (
                <div key={day.day} className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] overflow-hidden">
                  <div className="px-6 py-4 bg-brand-navy">
                    <h3 className="font-display text-lg text-white tracking-widest">{day.day}</h3>
                  </div>
                  <div className="p-4">
                    {day.periods.map((period, i) => (
                      <div key={i} className={`flex items-center gap-4 px-4 py-3 rounded-xl ${
                        period.subject === "Break" || period.subject === "Lunch" 
                          ? "bg-brand-orange/5 my-2" 
                          : "hover:bg-[var(--surface-disabled)]"
                      } transition-colors`}>
                        <div className="w-20 text-xs font-display font-bold text-brand-green tracking-widest">
                          {period.time}
                        </div>
                        <div className="flex-1">
                          <div className={`font-bold text-sm ${period.subject === "Break" || period.subject === "Lunch" ? "text-brand-orange" : "text-[var(--text-primary)]"}`}>
                            {period.subject}
                          </div>
                          {period.teacher && (
                            <div className="text-xs text-[var(--text-muted)]">{period.teacher}</div>
                          )}
                        </div>
                        {period.room && (
                          <div className="text-xs text-[var(--text-muted)] hidden md:block">{period.room}</div>
                        )}
                      </div>
                    ))}
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
