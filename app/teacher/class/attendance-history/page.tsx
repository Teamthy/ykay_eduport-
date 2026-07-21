"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { CURRENT_TEACHER } from "@/lib/teacherData";
import { generateAttendanceHistory, AttendanceHistoryDay } from "@/lib/messagesData";
import {
  Calendar, ChevronLeft, ChevronRight, Check, X, Clock,
  School, TrendingUp, Users, Download, BarChart3, FileText
} from "lucide-react";

export default function AttendanceHistoryPage() {
  const teacher = CURRENT_TEACHER;
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<AttendanceHistoryDay | null>(null);

  const history = generateAttendanceHistory(currentMonth, currentYear);
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Stats
  const schoolDays = history.filter(d => d.status !== "Weekend" && d.status !== "Holiday");
  const totalPresent = schoolDays.reduce((sum, d) => sum + (d.presentCount || 0), 0);
  const totalAbsent = schoolDays.reduce((sum, d) => sum + (d.absentCount || 0), 0);
  const totalLate = schoolDays.reduce((sum, d) => sum + (d.lateCount || 0), 0);
  const totalPossible = schoolDays.length * (teacher.formClassStudentCount || 32);
  const overallRate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDayStyle = (day: AttendanceHistoryDay | undefined) => {
    if (!day) return "bg-[var(--surface-disabled)] text-[var(--text-muted)] cursor-default";
    switch (day.status) {
      case "Weekend": return "bg-[var(--surface-disabled)] text-[var(--text-muted)] cursor-default opacity-40";
      case "Holiday": return "bg-purple-500/10 text-purple-500 border border-purple-500/30";
      case "Present": return "bg-brand-green/10 text-brand-green border border-brand-green/30 hover:bg-brand-green/20 cursor-pointer";
      case "Absent": return "bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 cursor-pointer";
      case "Late": return "bg-brand-orange/10 text-brand-orange border border-brand-orange/30 hover:bg-brand-orange/20 cursor-pointer";
      default: return "bg-[var(--surface-disabled)]";
    }
  };

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-[10px] font-bold uppercase tracking-widest mb-3">
              <School size={11} /> Form Teacher · {teacher.formClass}
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              ATTENDANCE <span className="text-brand-orange">HISTORY</span>
            </h1>
            <p className="text-white/60 text-sm">
              Historical attendance records for {teacher.formClass} · {teacher.formClassStudentCount} students
            </p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Overall Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-brand-green/10 border border-brand-green/30">
                  <Check className="text-brand-green mb-2" size={20} />
                  <div className="font-display text-3xl text-brand-green">{totalPresent}</div>
                  <div className="text-[10px] uppercase tracking-widest text-brand-green">Total Present</div>
                </div>
                <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30">
                  <X className="text-red-500 mb-2" size={20} />
                  <div className="font-display text-3xl text-red-500">{totalAbsent}</div>
                  <div className="text-[10px] uppercase tracking-widest text-red-500">Total Absent</div>
                </div>
                <div className="p-5 rounded-2xl bg-brand-orange/10 border border-brand-orange/30">
                  <Clock className="text-brand-orange mb-2" size={20} />
                  <div className="font-display text-3xl text-brand-orange">{totalLate}</div>
                  <div className="text-[10px] uppercase tracking-widest text-brand-orange">Total Late</div>
                </div>
                <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <TrendingUp className="text-brand-green mb-2" size={20} />
                  <div className="font-display text-3xl text-brand-green">{overallRate}%</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Attendance Rate</div>
                </div>
              </div>

              {/* Calendar */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-brand-orange" size={20} />
                    <h3 className="font-display text-xl text-[var(--text-primary)] tracking-widest">
                      {monthName.toUpperCase()}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-2 rounded-lg bg-[var(--surface-disabled)] text-[var(--text-primary)] hover:bg-brand-orange hover:text-white transition-all">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => { setCurrentMonth(now.getMonth()); setCurrentYear(now.getFullYear()); }} className="px-3 py-2 rounded-lg bg-brand-orange/10 text-brand-orange text-xs font-bold hover:bg-brand-orange hover:text-white transition-all">
                      Today
                    </button>
                    <button onClick={nextMonth} className="p-2 rounded-lg bg-[var(--surface-disabled)] text-[var(--text-primary)] hover:bg-brand-orange hover:text-white transition-all">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mb-6 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md bg-brand-green/20 border border-brand-green/40" />
                    <span className="text-[var(--text-muted)]">Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md bg-red-500/20 border border-red-500/40" />
                    <span className="text-[var(--text-muted)]">Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md bg-brand-orange/20 border border-brand-orange/40" />
                    <span className="text-[var(--text-muted)]">Late</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md bg-purple-500/20 border border-purple-500/40" />
                    <span className="text-[var(--text-muted)]">Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md bg-[var(--surface-disabled)]" />
                    <span className="text-[var(--text-muted)]">Weekend</span>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {weekdays.map(d => (
                    <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] py-2">
                      {d}
                    </div>
                  ))}

                  {/* Empty cells before first day */}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}

                  {/* Days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = new Date(currentYear, currentMonth, day).toISOString().split("T")[0];
                    const dayData = history.find(h => h.date === dateStr);
                    const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();

                    return (
                      <button
                        key={day}
                        onClick={() => dayData && dayData.status !== "Weekend" && setSelectedDay(dayData)}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 transition-all relative ${getDayStyle(dayData)} ${isToday ? "ring-2 ring-brand-orange" : ""}`}
                      >
                        <span className="font-bold text-sm">{day}</span>
                        {dayData && dayData.status !== "Weekend" && dayData.status !== "Holiday" && dayData.presentCount !== undefined && (
                          <span className="text-[9px] font-medium opacity-80 mt-1">{dayData.presentCount}/{dayData.totalStudents}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-brand-orange/10 text-brand-orange text-sm font-bold hover:bg-brand-orange hover:text-white transition-all">
                  <Download size={14} /> Export as PDF
                </button>
                <button className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-brand-green/10 text-brand-green text-sm font-bold hover:bg-brand-green hover:text-white transition-all">
                  <BarChart3 size={14} /> View Analytics
                </button>
                <button className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-blue-500/10 text-blue-500 text-sm font-bold hover:bg-blue-500 hover:text-white transition-all">
                  <FileText size={14} /> Monthly Report
                </button>
              </div>

              {/* Recent Trends */}
              <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-brand-navy-light p-6 text-white">
                <h3 className="font-display text-xl mb-4">Attendance Insights</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="text-brand-green shrink-0 mt-0.5" size={16} />
                    <p className="text-white/80">Overall attendance rate has been <strong className="text-brand-green">{overallRate}%</strong> this month.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="text-brand-orange shrink-0 mt-0.5" size={16} />
                    <p className="text-white/80">
                      <strong className="text-brand-orange">{Math.round(totalAbsent / schoolDays.length)}</strong> students absent on average per day.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="text-brand-orange shrink-0 mt-0.5" size={16} />
                    <p className="text-white/80">
                      <strong className="text-brand-orange">{totalLate}</strong> late arrivals recorded this month.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setSelectedDay(null)}>
          <div className="rounded-3xl max-w-md w-full p-8" style={{ backgroundColor: "#0C1824" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-xl text-white">
                  {new Date(selectedDay.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </h3>
                <p className="text-xs text-white/60 mt-1">Class {teacher.formClass}</p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="text-white/60 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-brand-green/20 text-center">
                  <Check className="mx-auto text-brand-green mb-1" size={18} />
                  <div className="font-display text-2xl text-brand-green">{selectedDay.presentCount}</div>
                  <div className="text-[9px] text-brand-green uppercase font-bold">Present</div>
                </div>
                <div className="p-4 rounded-xl bg-red-500/20 text-center">
                  <X className="mx-auto text-red-500 mb-1" size={18} />
                  <div className="font-display text-2xl text-red-500">{selectedDay.absentCount}</div>
                  <div className="text-[9px] text-red-500 uppercase font-bold">Absent</div>
                </div>
                <div className="p-4 rounded-xl bg-brand-orange/20 text-center">
                  <Clock className="mx-auto text-brand-orange mb-1" size={18} />
                  <div className="font-display text-2xl text-brand-orange">{selectedDay.lateCount}</div>
                  <div className="text-[9px] text-brand-orange uppercase font-bold">Late</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5">
                <div className="text-xs text-white/60 mb-1">Attendance Rate</div>
                <div className="font-display text-3xl text-brand-green">
                  {selectedDay.presentCount && selectedDay.totalStudents
                    ? Math.round((selectedDay.presentCount / selectedDay.totalStudents) * 100)
                    : 0}%
                </div>
              </div>

              <button className="w-full py-3 rounded-full bg-brand-orange text-white font-bold text-sm hover:bg-brand-orange-dark transition-all">
                View Full Register
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
