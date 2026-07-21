"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import { useToast } from "@/components/Toast";
import {
  LayoutDashboard, Users, UserPlus, ClipboardCheck, Send, Settings,
  CreditCard, FileText, Lock, BookOpen, School, Plus, X, Check,
  Search, User, Shield
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Students", href: "/admin", icon: Users },
  { label: "Staff", href: "/admin", icon: UserPlus },
  { label: "Staff Assignments", href: "/admin/staff-assignments", icon: BookOpen, badge: "New" },
  { label: "Admissions", href: "/admin", icon: ClipboardCheck },
  { label: "Fee Management", href: "/admin/fees", icon: CreditCard },
  { label: "Report Cards", href: "/admin/report-cards", icon: FileText },
  { label: "Gradebook Lock", href: "/admin/gradebook-lock", icon: Lock },
  { label: "Broadcasts", href: "/admin", icon: Send },
  { label: "Settings", href: "/admin", icon: Settings },
];

interface StaffAssignment {
  id: string;
  name: string;
  photo: string;
  email: string;
  role: "subject_teacher" | "class_teacher" | "both";
  subjects: { name: string; classes: string[] }[];
  formClass?: string;
}

const INITIAL_STAFF: StaffAssignment[] = [
  {
    id: "TCH-001",
    name: "Dr. Grace Okonkwo",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    email: "grace.o@ykaycollege.com",
    role: "both",
    subjects: [
      { name: "Mathematics", classes: ["JSS1A", "JSS2A", "SS1A", "SS2A", "SS2B"] },
      { name: "Physics", classes: ["SS2A", "SS2B", "SS3A"] },
    ],
    formClass: "SS2A",
  },
  {
    id: "TCH-002",
    name: "Mr. Tunde Bakare",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    email: "tunde.b@ykaycollege.com",
    role: "subject_teacher",
    subjects: [
      { name: "English Literature", classes: ["SS1A", "SS1B", "SS2A"] },
      { name: "History", classes: ["JSS3A", "SS1A"] },
    ],
  },
  {
    id: "TCH-003",
    name: "Mr. Kolawole Adeyemi",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
    email: "kolawole.a@ykaycollege.com",
    role: "class_teacher",
    subjects: [{ name: "Basic Science", classes: ["JSS1A"] }],
    formClass: "JSS1A",
  },
];

const AVAILABLE_SUBJECTS = ["Mathematics", "English Language", "English Literature", "Biology", "Chemistry", "Physics", "History", "Geography", "Economics", "Basic Science", "ICT", "Yoruba", "French", "Government"];
const AVAILABLE_CLASSES = ["JSS1A", "JSS1B", "JSS2A", "JSS2B", "JSS3A", "JSS3B", "SS1A", "SS1B", "SS2A", "SS2B", "SS3A", "SS3B"];

export default function StaffAssignmentsPage() {
  const { toast } = useToast();
  const [staff, setStaff] = useState(INITIAL_STAFF);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StaffAssignment | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newClasses, setNewClasses] = useState<string[]>([]);

  const filtered = staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const handleAssignSubject = () => {
    if (!selected || !newSubject || newClasses.length === 0) {
      toast("Please select subject and at least one class", "warning");
      return;
    }
    const updated = staff.map(s => {
      if (s.id !== selected.id) return s;
      const existing = s.subjects.find(sub => sub.name === newSubject);
      if (existing) {
        return { ...s, subjects: s.subjects.map(sub => sub.name === newSubject ? { ...sub, classes: [...new Set([...sub.classes, ...newClasses])] } : sub) };
      }
      return { ...s, subjects: [...s.subjects, { name: newSubject, classes: newClasses }] };
    });
    setStaff(updated);
    setNewSubject("");
    setNewClasses([]);
    toast(`${newSubject} assigned to ${selected.name}`, "success");
    setShowAssignModal(false);
  };

  const handleAssignFormClass = (staffId: string, className: string) => {
    // Check if class already has a form teacher
    const existing = staff.find(s => s.formClass === className && s.id !== staffId);
    if (existing) {
      if (!confirm(`${className} already has ${existing.name} as form teacher. Replace?`)) return;
      setStaff(prev => prev.map(s => s.id === existing.id ? { ...s, formClass: undefined, role: s.role === "both" ? "subject_teacher" : "subject_teacher" } : s));
    }
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, formClass: className, role: s.subjects.length > 0 ? "both" : "class_teacher" } : s));
    toast(`Form teacher assigned to ${className}`, "success");
  };

  const removeSubject = (staffId: string, subjectName: string) => {
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, subjects: s.subjects.filter(sub => sub.name !== subjectName) } : s));
    toast(`Subject removed`, "info");
  };

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-block px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-3">
              Admin · Staff Management
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              STAFF <span className="text-brand-green">ASSIGNMENTS</span>
            </h1>
            <p className="text-white/60">Assign subjects and form class roles to teachers.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <PortalSidebar portalName="Administration" portalType="admin" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search teachers by name..."
                  className="w-full pl-11 pr-5 py-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                />
              </div>

              {/* Staff Cards */}
              <div className="grid gap-4">
                {filtered.map(s => (
                  <div key={s.id} className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)]">
                    <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
                      <img src={s.photo} alt={s.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-green shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-display text-lg text-[var(--text-primary)]">{s.name}</h3>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">{s.email}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(s.role === "subject_teacher" || s.role === "both") && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-brand-green/10 text-brand-green font-bold uppercase tracking-widest">
                              Subject Teacher
                            </span>
                          )}
                          {(s.role === "class_teacher" || s.role === "both") && s.formClass && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-brand-orange/10 text-brand-orange font-bold uppercase tracking-widest">
                              Form Teacher · {s.formClass}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelected(s); setShowAssignModal(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-green text-white text-xs font-bold hover:bg-brand-green-dark transition-all shrink-0"
                      >
                        <Plus size={14} /> Assign Subject
                      </button>
                    </div>

                    {/* Subject Assignments */}
                    {s.subjects.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2">Subjects</div>
                        <div className="grid md:grid-cols-2 gap-2">
                          {s.subjects.map(sub => (
                            <div key={sub.name} className="p-3 rounded-xl bg-[var(--surface-disabled)] flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-sm text-[var(--text-primary)]">{sub.name}</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {sub.classes.map(c => (
                                    <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-brand-green/10 text-brand-green font-bold">{c}</span>
                                  ))}
                                </div>
                              </div>
                              <button onClick={() => removeSubject(s.id, sub.name)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10">
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Form Class Assignment */}
                    <div className="pt-4 border-t border-[var(--border-subtle)]">
                      <div className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-2">Form Class Assignment</div>
                      <div className="flex flex-wrap gap-1.5">
                        {AVAILABLE_CLASSES.map(c => (
                          <button
                            key={c}
                            onClick={() => handleAssignFormClass(s.id, c)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                              s.formClass === c
                                ? "bg-brand-orange text-white"
                                : "bg-[var(--surface-disabled)] text-[var(--text-muted)] hover:bg-brand-orange/10 hover:text-brand-orange"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Assign Subject Modal */}
      {showAssignModal && selected && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowAssignModal(false)}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-3xl max-w-lg w-full p-8" style={{ backgroundColor: "#0C1824" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl text-white">Assign Subject to {selected.name}</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-white/60 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-green block mb-2">Subject</label>
                <select
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-green"
                >
                  <option value="">Select subject...</option>
                  {AVAILABLE_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-brand-green block mb-2">Classes (select multiple)</label>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABLE_CLASSES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewClasses(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                      className={`p-2 rounded-lg text-xs font-bold transition-all ${
                        newClasses.includes(c)
                          ? "bg-brand-green text-white"
                          : "bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAssignSubject}
                className="w-full py-3 rounded-full bg-brand-green text-white font-bold text-sm hover:bg-brand-green-dark transition-all"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
