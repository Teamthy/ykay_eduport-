"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { CURRENT_TEACHER, FORM_CLASS_STUDENTS } from "@/lib/teacherData";
import { useToast } from "@/components/Toast";
import {
  Check, X, Clock, Send, Lock, UserCheck, Calendar,
  BellRing, MessageSquare, School, TrendingUp
} from "lucide-react";

type Status = "Present" | "Absent" | "Late";

interface AttendanceRow {
  studentId: string;
  name: string;
  photo: string;
  status: Status;
  note: string;
}

export default function ClassAttendancePage() {
  const { toast } = useToast();
  const teacher = CURRENT_TEACHER;
  const [attendance, setAttendance] = useState<AttendanceRow[]>(
    FORM_CLASS_STUDENTS.map(s => ({
      studentId: s.studentId,
      name: s.name,
      photo: s.photoUrl,
      status: "Present" as Status,
      note: "",
    }))
  );
  const [submitted, setSubmitted] = useState(false);
  const [selectedDate] = useState(new Date().toISOString().split("T")[0]);

  const updateStatus = (studentId: string, status: Status) => {
    if (submitted) return;
    setAttendance(prev => prev.map(r => r.studentId === studentId ? { ...r, status } : r));
  };

  const updateNote = (studentId: string, note: string) => {
    if (submitted) return;
    setAttendance(prev => prev.map(r => r.studentId === studentId ? { ...r, note } : r));
  };

  const markAllPresent = () => {
    if (submitted) return;
    setAttendance(prev => prev.map(r => ({ ...r, status: "Present" as Status })));
    toast("All students marked present", "success");
  };

  const handleSubmit = () => {
    const absent = attendance.filter(a => a.status === "Absent").length;
    const late = attendance.filter(a => a.status === "Late").length;
    setSubmitted(true);
    toast(`Attendance submitted. SMS sent to ${absent + late} parents.`, "success");
  };

  const present = attendance.filter(a => a.status === "Present").length;
  const absent = attendance.filter(a => a.status === "Absent").length;
  const late = attendance.filter(a => a.status === "Late").length;
  const rate = Math.round((present / attendance.length) * 100);

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-[10px] font-bold uppercase tracking-widest">
                <School size={11} /> Form Teacher · {teacher.formClass}
              </span>
              <span className="text-white/40 text-xs">{selectedDate}</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              ATTENDANCE <span className="text-brand-orange">REGISTER</span>
            </h1>
            <p className="text-white/60 text-sm">
              Daily attendance for your form class. All students default to Present. Parents notified via SMS within 5 minutes.
            </p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Present", value: present, icon: UserCheck, color: "text-brand-green", bg: "bg-brand-green/10" },
                  { label: "Absent", value: absent, icon: X, color: "text-red-500", bg: "bg-red-500/10" },
                  { label: "Late", value: late, icon: Clock, color: "text-brand-orange", bg: "bg-brand-orange/10" },
                  { label: "Rate", value: `${rate}%`, icon: TrendingUp, color: "text-brand-green", bg: "bg-brand-green/10" },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-4 shadow-[var(--card-shadow)]">
                    <div className={`w-9 h-9 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-2`}>
                      <s.icon size={16} />
                    </div>
                    <div className={`font-display text-2xl ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={markAllPresent}
                  disabled={submitted}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green/10 text-brand-green text-sm font-bold hover:bg-brand-green hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check size={14} /> Mark All Present
                </button>
                <span className="text-xs text-[var(--text-muted)]">{attendance.length} students in {teacher.formClass}</span>
              </div>

              {/* Attendance Table */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] overflow-hidden shadow-[var(--card-shadow)]">
                <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg text-[var(--text-primary)]">Class {teacher.formClass} Register</h2>
                    <p className="text-xs text-[var(--text-muted)]">Tap A/L to mark absent or late</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${submitted ? "bg-brand-green/20 text-brand-green" : "bg-brand-orange/20 text-brand-orange"}`}>
                    <Lock size={10} /> {submitted ? "Submitted" : "Editable"}
                  </span>
                </div>

                <div className="divide-y divide-[var(--border-subtle)]">
                  {attendance.map(row => (
                    <div key={row.studentId} className="p-4 flex items-center gap-4 hover:bg-[var(--surface-disabled)] transition-colors">
                      <img src={row.photo} alt={row.name} className="w-12 h-12 rounded-full object-cover border-2 border-[var(--border-subtle)]" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[var(--text-primary)] truncate">{row.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{row.studentId}</div>
                      </div>

                      {/* Note input */}
                      {(row.status === "Absent" || row.status === "Late") && (
                        <input
                          value={row.note}
                          onChange={e => updateNote(row.studentId, e.target.value)}
                          disabled={submitted}
                          placeholder="Reason..."
                          className="w-40 px-3 py-1.5 text-xs rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                        />
                      )}

                      {/* Status buttons */}
                      <div className="flex gap-1">
                        {(["Present", "Absent", "Late"] as Status[]).map(status => {
                          const active = row.status === status;
                          const config = {
                            Present: { icon: Check, bg: "bg-brand-green", text: "P" },
                            Absent: { icon: X, bg: "bg-red-500", text: "A" },
                            Late: { icon: Clock, bg: "bg-brand-orange", text: "L" },
                          }[status];
                          return (
                            <button
                              key={status}
                              onClick={() => updateStatus(row.studentId, status)}
                              disabled={submitted}
                              className={`w-10 h-10 rounded-lg font-bold text-xs transition-all ${
                                active
                                  ? `${config.bg} text-white shadow-lg`
                                  : "bg-[var(--surface-disabled)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]"
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
                              title={status}
                            >
                              {config.text}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--surface-disabled)]">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[var(--text-muted)]">
                      {present} present · {absent} absent · {late} late · Rate: <span className="text-brand-green font-bold">{rate}%</span>
                    </div>
                    <button
                      onClick={handleSubmit}
                      disabled={submitted}
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${
                        submitted
                          ? "bg-brand-green/20 text-brand-green cursor-default"
                          : "bg-brand-green text-white hover:bg-brand-green-dark shadow-lg"
                      }`}
                    >
                      <Send size={14} /> {submitted ? "Submitted & Locked" : "Submit Register"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Notification Preview */}
              {submitted && (
                <div className="rounded-2xl bg-brand-green/10 border border-brand-green/30 p-4 flex items-start gap-3">
                  <BellRing className="text-brand-green shrink-0 mt-0.5" size={18} />
                  <div className="text-sm text-[var(--text-secondary)]">
                    <strong className="text-brand-green">SMS notifications queued.</strong> Parents of {absent + late} students will receive alerts within 5 minutes via Termii SMS and WhatsApp Business API.
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
