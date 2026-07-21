"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import { useToast } from "@/components/Toast";
import { MOCK_STUDENTS } from "@/lib/mockData";
import {
  LayoutDashboard, Users, UserPlus, ClipboardCheck, Send, Settings,
  CreditCard, FileText, Lock, IdCard, Download, Printer,
  Check, X, Search, QrCode
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Students", href: "/admin", icon: Users },
  { label: "Staff", href: "/admin", icon: UserPlus },
  { label: "Fee Management", href: "/admin/fees", icon: CreditCard },
  { label: "Report Cards", href: "/admin/report-cards", icon: FileText },
  { label: "Gradebook Lock", href: "/admin/gradebook-lock", icon: Lock },
  { label: "Staff Assignments", href: "/admin/staff-assignments", icon: ClipboardCheck },
  { label: "ID Card Generator", href: "/admin/id-cards", icon: IdCard, badge: "New" },
  { label: "Settings", href: "/admin", icon: Settings },
];

export default function AdminIDCardsPage() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("All");
  const [generating, setGenerating] = useState(false);

  const filtered = MOCK_STUDENTS.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
    const matchClass = filterClass === "All" || s.class === filterClass;
    return matchSearch && matchClass;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const allIds = filtered.map(s => s.id);
    const allSelected = allIds.every(id => selected.includes(id));
    if (allSelected) {
      setSelected(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const handleGenerate = () => {
    if (selected.length === 0) {
      toast("Select at least one student", "warning");
      return;
    }
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      toast(`${selected.length} ID cards generated as PDF`, "success");
    }, 2000);
  };

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <span className="inline-block px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-3">
              Admin · ID Management
            </span>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              ID CARD <span className="text-brand-green">GENERATOR</span>
            </h1>
            <p className="text-white/60 text-sm">Generate individual or bulk student ID cards with QR verification codes.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <PortalSidebar portalName="Administration" portalType="admin" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-brand-green/10 border border-brand-green/30">
                  <IdCard className="text-brand-green mb-2" size={22} />
                  <div className="font-display text-3xl text-brand-green">{selected.length}</div>
                  <div className="text-[10px] uppercase tracking-widest text-brand-green">Selected</div>
                </div>
                <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <Users className="text-brand-orange mb-2" size={22} />
                  <div className="font-display text-3xl text-[var(--text-primary)]">{MOCK_STUDENTS.length}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Total Students</div>
                </div>
                <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <QrCode className="text-blue-500 mb-2" size={22} />
                  <div className="font-display text-3xl text-[var(--text-primary)]">QR</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">With Verification</div>
                </div>
              </div>

              {/* Search + Filter */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
                    className="w-full pl-11 pr-5 py-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green" />
                </div>
                <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                  className="px-5 py-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)]">
                  <option>All</option>
                  {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"].map(c => <option key={c}>{c}</option>)}
                </select>
                <button onClick={selectAll} className="px-5 py-3 rounded-xl bg-brand-green/10 text-brand-green font-bold text-sm hover:bg-brand-green hover:text-white transition-all whitespace-nowrap">
                  {filtered.every(s => selected.includes(s.id)) ? "Deselect All" : "Select All"}
                </button>
              </div>

              {/* Student Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(s => {
                  const isSelected = selected.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-brand-green/10 border-brand-green"
                          : "bg-[var(--surface-card)] border-[var(--border-subtle)] hover:border-brand-green/30"
                      }`}
                    >
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(s.id)} className="w-4 h-4 accent-brand-green" />
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[var(--text-primary)] text-sm truncate">{s.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{s.id} · {s.class} {s.arm}</div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Generate Button */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={selected.length === 0 || generating}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-dark text-white font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all shadow-2xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Generating {selected.length} cards...
                    </>
                  ) : (
                    <>
                      <Download size={16} /> Generate {selected.length} ID Card{selected.length !== 1 ? "s" : ""} (PDF)
                    </>
                  )}
                </button>
                <button
                  onClick={() => { handleGenerate(); setTimeout(() => window.print(), 2500); }}
                  disabled={selected.length === 0}
                  className="px-6 py-4 rounded-2xl bg-[var(--surface-disabled)] text-[var(--text-primary)] font-bold text-sm hover:bg-brand-green hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Printer size={16} /> Print
                </button>
              </div>

              {/* Info */}
              <div className="p-4 rounded-2xl bg-brand-orange/10 border border-brand-orange/30 text-xs text-brand-orange">
                Each ID card includes: Student photo placeholder, full name, student ID, class, session, blood group, genotype, QR code for verification, and school branding. Cards are generated as A4 PDF (4 per page for bulk).
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
