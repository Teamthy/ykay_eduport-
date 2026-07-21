"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import { CalendarDays } from "lucide-react";

const PARENT_ATTENDANCE = [
  { date: "2025-07-01", status: "Present" as const, note: "" },
  { date: "2025-07-02", status: "Present" as const, note: "" },
  { date: "2025-07-03", status: "Absent" as const, note: "Illness — doctor visit" },
  { date: "2025-07-08", status: "Late" as const, note: "Traffic delay" },
  { date: "2025-07-10", status: "Absent" as const, note: "Family event" },
  { date: "2025-07-14", status: "Present" as const, note: "" },
  { date: "2025-07-15", status: "Present" as const, note: "" },
];

export default function ParentAttendancePage() {
  const notesOnly = PARENT_ATTENDANCE.filter(d => d.note);

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-32 pb-10 px-6">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[2rem] bg-brand-navy border border-white/5 p-8 md:p-12 shadow-xl mb-8">
              <h1 className="font-display text-[42px] md:text-[64px] tracking-[3px] text-white mb-4">
                ATTENDANCE <span className="text-brand-green">MONITOR</span>
              </h1>
              <p className="font-body text-base md:text-lg text-white/60 max-w-2xl">
                Your child&apos;s attendance calendar with color-coded days and teacher notes.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-20 px-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <AttendanceCalendar
                  days={PARENT_ATTENDANCE}
                  month="July"
                  year={2025}
                  title="JSS1 — First Term 2025/2026"
                  subtitle="Adeola Ogunlade · Class: JSS1 · Arm: A"
                  viewType="parent"
                />
              </div>

              <aside className="space-y-6">
                <div className="rounded-[2rem] bg-gradient-to-br from-brand-navy to-brand-navy-light border border-white/5 p-8 shadow-xl">
                  <h3 className="font-display text-lg tracking-[2px] text-white mb-4">Teacher Notes</h3>
                  <div className="space-y-3">
                    {notesOnly.length > 0 ? notesOnly.map(d => (
                      <div key={d.date} className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CalendarDays size={12} className="text-brand-green" />
                          <span className="font-body text-[10px] text-white/50">{d.date}</span>
                        </div>
                        <p className="font-body text-xs text-white/80">{d.note}</p>
                      </div>
                    )) : (
                      <p className="font-body text-xs text-white/40">No notes added.</p>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
