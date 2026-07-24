"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { Plus, Heart, Award, AlertTriangle, FileText, X, Check, School, Bell } from "lucide-react";

export default function BehaviorRecordsPage() {
  const { toast } = useToast();
  const { data, loading: _apiLoading, error: _apiError } = useApi<any>("/api/teacher/profile");
  const teacher = data?.teacher || ({} as any);
  const [records, setRecords] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    studentName: "",
    type: "Commendation" as "Commendation" | "Warning" | "Note",
    category: "",
    description: "",
    notifyParent: true,
  });

  const handleAdd = () => {
    if (!newRecord.studentName || !newRecord.description) {
      toast("Please fill required fields", "warning");
      return;
    }
    const student = [].find((s: any) => s.name === newRecord.studentName);
    const record = {
      id: String(records.length + 1),
      studentName: newRecord.studentName,
      studentId: student?.studentId || "",
      type: newRecord.type,
      category: newRecord.category,
      description: newRecord.description,
      date: new Date().toISOString().split("T")[0],
      reportedBy: teacher.fullName,
      parentNotified: newRecord.notifyParent,
    };
    setRecords([record, ...records]);
    setShowModal(false);
    setNewRecord({
      studentName: "",
      type: "Commendation",
      category: "",
      description: "",
      notifyParent: true,
    });
    toast(newRecord.notifyParent ? "Record saved & parent notified" : "Record saved", "success");
  };

  const commendations = records.filter((r: any) => r.type === "Commendation").length;
  const warnings = records.filter((r: any) => r.type === "Warning").length;
  const notes = records.filter((r: any) => r.type === "Note").length;

  const typeConfig = {
    Commendation: {
      icon: Award,
      color: "text-brand-green",
      bg: "bg-brand-green/10",
      border: "border-brand-green/30",
    },
    Warning: {
      icon: AlertTriangle,
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
    },
    Note: {
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
    },
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
              BEHAVIOR <span className="text-brand-orange">RECORDS</span>
            </h1>
            <p className="text-white/60 text-sm">
              Log commendations, warnings, and notes for students in your form class.
            </p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl bg-brand-green/10 border border-brand-green/30 p-5">
                  <Award className="text-brand-green mb-3" size={22} />
                  <div className="font-display text-3xl text-brand-green">{commendations}</div>
                  <div className="text-xs uppercase tracking-widest text-brand-green mt-1">
                    Commendations
                  </div>
                </div>
                <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-5">
                  <AlertTriangle className="text-red-500 mb-3" size={22} />
                  <div className="font-display text-3xl text-red-500">{warnings}</div>
                  <div className="text-xs uppercase tracking-widest text-red-500 mt-1">
                    Warnings
                  </div>
                </div>
                <div className="rounded-2xl bg-blue-500/10 border border-blue-500/30 p-5">
                  <FileText className="text-blue-500 mb-3" size={22} />
                  <div className="font-display text-3xl text-blue-500">{notes}</div>
                  <div className="text-xs uppercase tracking-widest text-blue-500 mt-1">Notes</div>
                </div>
              </div>

              {/* Add Record Button */}
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-brand-orange/40 text-brand-orange font-bold hover:bg-brand-orange/5 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Add New Behavior Record
              </button>

              {/* Records */}
              <div className="space-y-3">
                {records.map((r: any) => {
                  const config = typeConfig[r.type];
                  return (
                    <div
                      key={r.id}
                      className={`p-5 rounded-2xl bg-[var(--surface-card)] border-l-4 ${config.border} border-y border-r border-[var(--border-subtle)] shadow-[var(--card-shadow)]`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-11 h-11 rounded-xl ${config.bg} ${config.color} flex items-center justify-center shrink-0`}
                        >
                          <config.icon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="font-bold text-[var(--text-primary)]">
                                {r.studentName}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)]">
                                {r.studentId} · {r.date}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${config.bg} ${config.color}`}
                            >
                              {r.type}
                            </span>
                          </div>
                          <div className="text-xs text-brand-orange font-bold uppercase tracking-widest mb-1">
                            {r.category}
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] mb-3">
                            {r.description}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                            <span>By {r.reportedBy}</span>
                            {r.parentNotified && (
                              <span className="inline-flex items-center gap-1 text-brand-green">
                                <Bell size={10} /> Parent Notified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Add Record Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowModal(false)}
        >
          <div
            className="rounded-3xl max-w-lg w-full p-8"
            style={{ backgroundColor: "#0C1824" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl text-white">Add Behavior Record</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-orange block mb-2">
                  Student
                </label>
                <select
                  value={newRecord.studentName}
                  onChange={(e) => setNewRecord({ ...newRecord, studentName: e.target.value })}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-orange"
                >
                  <option value="">Select student...</option>
                  {[].map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-orange block mb-2">
                  Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Commendation", "Warning", "Note"] as const).map((t) => {
                    const config = typeConfig[t];
                    return (
                      <button
                        key={t}
                        onClick={() => setNewRecord({ ...newRecord, type: t })}
                        className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          newRecord.type === t
                            ? `${config.bg} ${config.color} border-2 ${config.border}`
                            : "bg-white/5 text-white/60 border-2 border-transparent hover:bg-white/10"
                        }`}
                      >
                        <config.icon size={12} /> {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-orange block mb-2">
                  Category
                </label>
                <input
                  value={newRecord.category}
                  onChange={(e) => setNewRecord({ ...newRecord, category: e.target.value })}
                  placeholder="e.g., Academic Excellence, Punctuality, Discipline"
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-orange block mb-2">
                  Description
                </label>
                <textarea
                  value={newRecord.description}
                  onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                  rows={4}
                  placeholder="Describe the behavior..."
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-orange resize-none"
                />
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={newRecord.notifyParent}
                  onChange={(e) => setNewRecord({ ...newRecord, notifyParent: e.target.checked })}
                  className="w-4 h-4 accent-brand-orange"
                />
                <div className="flex-1">
                  <div className="text-sm text-white font-medium">Notify parent via SMS</div>
                  <div className="text-[10px] text-white/50">
                    Parent will receive an SMS about this record
                  </div>
                </div>
              </label>

              <button
                onClick={handleAdd}
                className="w-full py-3 rounded-full bg-brand-orange text-white font-bold text-sm hover:bg-brand-orange-dark transition-all"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
