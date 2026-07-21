"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import { User, Check, X, Clock } from "lucide-react";

const ATTENDANCE = [
  { date: "2025-07-01", status: "Present" as const, note: "" },
  { date: "2025-07-03", status: "Absent" as const, note: "Illness" },
  { date: "2025-07-08", status: "Late" as const, note: "Traffic" },
  { date: "2025-07-14", status: "Present" as const, note: "" },
  { date: "2025-07-15", status: "Present" as const, note: "" },
];

export default function StudentAttendancePage() {
  const present = ATTENDANCE.filter(d => d.status === "Present").length;
  const absent = ATTENDANCE.filter(d => d.status === "Absent").length;
  const late = ATTENDANCE.filter(d => d.status === "Late").length;
  const rate = Math.round((present / ATTENDANCE.length) * 100);

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-32 pb-10 px-6">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[2rem] bg-gradient-to-br from-brand-navy to-brand-navy-light border border-white/5 p-8 md:p-12 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-green/20 flex items-center justify-center text-brand-green">
                  <User size={26} />
                </div>
                <div>
                  <h1 className="font-display text-[36px] md:text-[56px] tracking-[3px] text-white">
                    MY <span className="text-brand-green">ATTENDANCE</span>
                  </h1>
                  <p className="text-white/60 text-sm">Emmanuel Adebayo · SS2</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-20 px-6">
          <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <AttendanceCalendar
                days={ATTENDANCE}
                month="July"
                year={2025}
                title="SS2 — First Term 2025/2026"
                subtitle="Personal attendance calendar"
                viewType="student"
              />
            </div>

            <aside className="space-y-6">
              <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 shadow-[var(--card-shadow)]">
                <h3 className="font-display text-xl text-[var(--text-primary)] mb-6">My Stats</h3>
                <div className="rounded-xl bg-[var(--surface-disabled)] p-5 mb-4">
                  <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1">Attendance Rate</div>
                  <div className="font-display text-4xl text-brand-green">{rate}%</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-brand-green/10 p-4 text-center">
                    <Check size={18} className="mx-auto text-brand-green mb-1" />
                    <div className="font-display text-xl text-brand-green">{present}</div>
                    <div className="text-[9px] text-[var(--text-muted)]">Present</div>
                  </div>
                  <div className="rounded-xl bg-red-500/10 p-4 text-center">
                    <X size={18} className="mx-auto text-red-500 mb-1" />
                    <div className="font-display text-xl text-red-500">{absent}</div>
                    <div className="text-[9px] text-[var(--text-muted)]">Absent</div>
                  </div>
                  <div className="rounded-xl bg-brand-orange/10 p-4 text-center">
                    <Clock size={18} className="mx-auto text-brand-orange mb-1" />
                    <div className="font-display text-xl text-brand-orange">{late}</div>
                    <div className="text-[9px] text-[var(--text-muted)]">Late</div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
