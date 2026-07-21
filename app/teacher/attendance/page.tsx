"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Check, X, Clock, Send, Lock, UserCheck } from "lucide-react";

interface StudentAttendance {
  id: string;
  name: string;
  class: string;
  status: "Present" | "Absent" | "Late";
}

const INITIAL_STUDENTS: StudentAttendance[] = [
  { id: "YKC/2025/001", name: "Adeola Ogunlade", class: "JSS1 A", status: "Present" },
  { id: "YKC/2025/002", name: "Emmanuel Adebayo", class: "JSS1 A", status: "Present" },
  { id: "YKC/2025/003", name: "Fatima Ibrahim", class: "JSS1 A", status: "Present" },
];

export default function TeacherAttendancePage() {
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [submitted, setSubmitted] = useState(false);

  const handleStatusChange = (id: string, status: StudentAttendance["status"]) => {
    if (submitted) return;
    setStudents(students.map(s => s.id === id ? { ...s, status } : s));
  };

  const present = students.filter(s => s.status === "Present").length;
  const absent = students.filter(s => s.status === "Absent").length;
  const late = students.filter(s => s.status === "Late").length;

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-32 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-[42px] md:text-[72px] tracking-[4px] text-white mb-4">
              ATTENDANCE <span className="text-brand-green">REGISTER</span>
            </h1>
            <p className="font-body text-base text-white/60 max-w-2xl">
              Mark daily attendance. All students default to Present. Submit locks the record.
            </p>
          </div>
        </section>

        <section className="py-16 px-6">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Present", value: present, icon: UserCheck, color: "text-brand-green", bg: "bg-brand-green/10" },
                { label: "Absent", value: absent, icon: X, color: "text-red-500", bg: "bg-red-500/10" },
                { label: "Late", value: late, icon: Clock, color: "text-brand-orange", bg: "bg-brand-orange/10" },
              ].map(stat => (
                <div key={stat.label} className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 flex items-center gap-4 shadow-[var(--card-shadow)]">
                  <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                    <stat.icon size={22} />
                  </div>
                  <div>
                    <div className={`font-display text-2xl ${stat.color}`}>{stat.value}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] overflow-hidden shadow-[var(--card-shadow)]">
              <div className="px-8 py-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl text-[var(--text-primary)]">Mathematics — JSS1 A</h2>
                  <p className="text-xs text-[var(--text-muted)]">Period 1 · 08:00 AM</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${submitted ? "bg-brand-green/20 text-brand-green" : "bg-brand-orange/20 text-brand-orange"}`}>
                  <Lock size={10} /> {submitted ? "Locked" : "Editable"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--surface-disabled)]">
                    <tr>
                      {["Student", "Class", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left px-6 py-3 font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student.id} className="border-b border-[var(--border-subtle)]">
                        <td className="px-6 py-4">
                          <div className="text-[var(--text-primary)] font-bold">{student.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">{student.id}</div>
                        </td>
                        <td className="px-6 py-4 text-[var(--text-muted)] text-xs">{student.class}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            student.status === "Present" ? "bg-brand-green/15 text-brand-green" :
                            student.status === "Absent" ? "bg-red-500/15 text-red-500" :
                            "bg-brand-orange/15 text-brand-orange"
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 flex gap-2">
                          <button onClick={() => handleStatusChange(student.id, "Present")} disabled={submitted} className="p-1.5 rounded-lg hover:bg-brand-green/10 text-brand-green transition-colors disabled:opacity-40">
                            <Check size={16} />
                          </button>
                          <button onClick={() => handleStatusChange(student.id, "Absent")} disabled={submitted} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors disabled:opacity-40">
                            <X size={16} />
                          </button>
                          <button onClick={() => handleStatusChange(student.id, "Late")} disabled={submitted} className="p-1.5 rounded-lg hover:bg-brand-orange/10 text-brand-orange transition-colors disabled:opacity-40">
                            <Clock size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-8 py-5 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <div className="text-xs text-[var(--text-muted)]">
                  {students.length} students · {present} present · {absent} absent · {late} late
                </div>
                <button
                  onClick={() => setSubmitted(true)}
                  disabled={submitted}
                  className={`inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold tracking-wider transition-all ${
                    submitted ? "bg-brand-green/20 text-brand-green cursor-default" : "bg-brand-green text-white hover:bg-brand-green-dark shadow-lg"
                  }`}
                >
                  <Send size={16} /> {submitted ? "Submitted & Locked" : "Submit Attendance"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
