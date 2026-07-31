"use client";

import { useState } from "react";
import PortalTopbar from "@/components/PortalTopbar";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import {
  RotateCcw,
  Users,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  School,
  BookOpen,
  AlertCircle,
  Save,
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  class: string;
  selected: boolean;
}

const STUDENTS_BY_CLASS: Record<string, Student[]> = {
  "SS 3": Array.from({ length: 9 }, (_, i) => ({
    id: `s3-${i}`,
    name: `Student ${i + 1}`,
    class: "SS 3",
    selected: false,
  })),
  "SSS 1": Array.from({ length: 32 }, (_, i) => ({
    id: `ss1-${i}`,
    name: `Student SSS1-${i + 1}`,
    class: "SSS 1",
    selected: false,
  })),
  "SSS 2": Array.from({ length: 34 }, (_, i) => ({
    id: `ss2-${i}`,
    name: `Student SSS2-${i + 1}`,
    class: "SSS 2",
    selected: false,
  })),
};

export default function TestRetakePage() {
  const { toast } = useToast();
  const { data, loading: _apiLoading, error: _apiError } = useApi<any>("/api/teacher/profile");
  const teacher = data?.teacher || ({} as any);
  const [selectedCourse, setSelectedCourse] = useState("chemistry (SSS 1)");
  const [expandedClasses, setExpandedClasses] = useState<string[]>([]);
  const [students, setStudents] = useState(STUDENTS_BY_CLASS);
  const [allowRetake, setAllowRetake] = useState(false);

  const totalSelected = Object.values(students).reduce(
    (sum, arr) => sum + arr.filter((s: any) => s.selected).length,
    0,
  );

  const toggleClass = (cls: string) => {
    setExpandedClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls],
    );
  };

  const toggleStudent = (cls: string, id: string) => {
    setStudents((prev) => ({
      ...prev,
      [cls]: prev[cls].map((s: any) =>
        s.id === id ? { ...(s as any), selected: !s.selected } : s,
      ),
    }));
  };

  const markAll = () => {
    setStudents((prev) => {
      const next: Record<string, Student[]> = {};
      Object.entries(prev).forEach(([cls, arr]) => {
        next[cls] = arr.map((s) => ({ ...(s as any), selected: true }));
      });
      return next;
    });
  };

  const unmarkAll = () => {
    setStudents((prev) => {
      const next: Record<string, Student[]> = {};
      Object.entries(prev).forEach(([cls, arr]) => {
        next[cls] = arr.map((s) => ({ ...(s as any), selected: false }));
      });
      return next;
    });
  };

  const handleSave = () => {
    if (totalSelected === 0) {
      toast("Select at least one student", "warning");
      return;
    }
    toast(
      `Retake ${allowRetake ? "enabled" : "disabled"} for ${totalSelected} students`,
      "success",
    );
  };

  const courses = ["chemistry (SSS 1)", "physics (SSS 2)", "mathematics (SS 3)"];

  return (
    <>
      <PortalTopbar />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-3">
              <RotateCcw size={11} /> Test Retake
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2 text-center">
              ENABLE TEST <span className="text-brand-green">RETAKE</span>
            </h1>
            <p className="text-white/60 text-sm text-center">
              Grant test retake permissions to selected students
            </p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Course Selector */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-brand-green/40 p-6 shadow-[var(--card-shadow)]">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="text-brand-green" size={18} />
                  <span className="font-bold text-[var(--text-primary)]">Select Course</span>
                </div>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-brand-green/40 text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                >
                  {courses.map((c: any) => (
                    <option key={String(c)}>{String(c)}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2 mt-2 text-xs text-brand-orange">
                  <AlertCircle size={12} /> Please select a course
                </div>
              </div>

              {/* Student Selector */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Users className="text-brand-green" size={18} />
                    <span className="font-bold text-[var(--text-primary)]">Select Students</span>
                    <span className="px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green text-xs font-bold">
                      {totalSelected} selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={markAll}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-brand-green/10 text-brand-green text-xs font-bold hover:bg-brand-green hover:text-white transition-all"
                    >
                      <Check size={12} /> Mark All
                    </button>
                    <button
                      onClick={unmarkAll}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-red-500/10 text-red-500 text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                    >
                      <X size={12} /> Unmark All
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {Object.entries(students).map(([cls, arr]) => {
                    const isExpanded = expandedClasses.includes(cls);
                    const selectedInClass = arr.filter((s: any) => s.selected).length;

                    return (
                      <div
                        key={cls}
                        className="rounded-xl border border-[var(--border-subtle)] overflow-hidden"
                      >
                        <button
                          onClick={() => toggleClass(cls)}
                          className="w-full p-4 flex items-center justify-between hover:bg-[var(--surface-disabled)] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-brand-green/10 text-brand-green flex items-center justify-center">
                              <School size={16} />
                            </div>
                            <span className="font-bold text-[var(--text-primary)]">{cls}</span>
                            {selectedInClass > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-green text-white font-bold">
                                {selectedInClass} selected
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-[var(--text-muted)]">
                              {arr.length} students
                            </span>
                            {isExpanded ? (
                              <ChevronUp size={16} className="text-[var(--text-muted)]" />
                            ) : (
                              <ChevronDown size={16} className="text-[var(--text-muted)]" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-disabled)]/30 max-h-64 overflow-y-auto">
                            <div className="grid md:grid-cols-2 gap-2">
                              {arr.map((s) => (
                                <label
                                  key={s.id}
                                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${s.selected ? "bg-brand-green/10" : "hover:bg-[var(--surface-card)]"}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={s.selected}
                                    onChange={() => toggleStudent(cls, s.id)}
                                    className="w-4 h-4 accent-brand-green"
                                  />
                                  <span className="text-sm text-[var(--text-primary)]">
                                    {s.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Toggle & Save */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowRetake}
                    onChange={(e) => setAllowRetake(e.target.checked)}
                    className="w-5 h-5 accent-brand-green"
                  />
                  <RotateCcw
                    className={allowRetake ? "text-brand-green" : "text-[var(--text-muted)]"}
                    size={16}
                  />
                  <span className="font-bold text-[var(--text-primary)]">
                    Allow Retake for Selected Students
                  </span>
                </label>

                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-green text-white text-sm font-bold hover:bg-brand-green-dark transition-all shadow-lg"
                >
                  <Save size={14} /> Save Changes
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
