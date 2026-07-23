"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, Eye, ChevronDown, ShieldCheck, GraduationCap, User, Users,
  LayoutGrid, LogOut, LayoutDashboard, CreditCard, FileText, ClipboardCheck,
  UserCheck, IdCard, BarChart3, Settings, BookOpen, Trash2,
  School, Shield, Lock, Send, UserPlus, HelpCircle
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useToast } from "./Toast";
import Image from "next/image";

const PORTAL_SWITCHER = [
  { label: "Admin Portal", href: "/admin", icon: ShieldCheck, type: "admin" },
  { label: "Teacher Portal", href: "/teacher/dashboard", icon: GraduationCap, type: "teacher" },
  { label: "Student Portal", href: "/student/dashboard", icon: User, type: "student" },
  { label: "Parent Portal", href: "/parent/dashboard", icon: Users, type: "parent" },
];

const ADMIN_NAV = [
  { label: "Admin Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Finances", href: "/admin/finances", icon: CreditCard, badge: "New" },
  { label: "View Questions", href: "/admin/questions", icon: HelpCircle },
  { label: "Mark Presence", href: "/admin/mark-presence", icon: UserCheck },
  { label: "Generate ID Cards", href: "/admin/id-cards", icon: IdCard },
  { label: "Attendance Analytics", href: "/admin/attendance-analytics", icon: BarChart3, badge: "Live" },
  { label: "Attendance Corrections", href: "/admin/attendance-corrections", icon: ClipboardCheck, badge: "Live" },
  { label: "Academic Overview", href: "/admin/academic-overview", icon: BarChart3 },
  { label: "View Student Attendance", href: "/admin/student-attendance", icon: Users },
  { label: "View Student Information", href: "/admin/students", icon: BookOpen },
  { label: "Fee Management", href: "/admin/fees", icon: CreditCard },
  { label: "Report Cards", href: "/admin/report-cards", icon: FileText },
  { label: "Gradebook Lock", href: "/admin/gradebook-lock", icon: Lock },
  { label: "Staff Assignments", href: "/admin/staff-assignments", icon: UserPlus },
  { label: "Broadcasts", href: "/admin/broadcasts", icon: Send },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false);
    };
    if (switcherOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [switcherOpen]);

  return (
    <aside className="lg:w-[280px] shrink-0">
      <div className="sticky top-24 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4">
        {/* Portal Switcher */}
        <div ref={switcherRef} className="relative">
          <button onClick={() => setSwitcherOpen(!switcherOpen)}
            className="w-full p-4 rounded-2xl bg-brand-navy border border-white/10 hover:border-brand-green/50 transition-all flex items-center justify-between">
            <div className="text-left">
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand-green block">Active Portal</span>
              <span className="font-display text-sm text-white tracking-[1px]">Administration</span>
            </div>
            <ChevronDown size={16} className={`text-white/60 transition-transform ${switcherOpen ? "rotate-180" : ""}`} />
          </button>
          {switcherOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ zIndex: 100, backgroundColor: "#0C1824" }}>
              <div className="p-3 border-b border-white/10 flex items-center gap-2"><LayoutGrid size={12} className="text-white/60" /><span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Switch Portal</span></div>
              {PORTAL_SWITCHER.map(p => (
                <Link key={p.type} href={p.href} onClick={() => setSwitcherOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm ${p.type === "admin" ? "bg-brand-green/20 text-brand-green" : "text-white/80 hover:bg-white/5 hover:text-brand-green"}`}>
                  <p.icon size={16} /><span className="font-medium">{p.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Admin Profile */}
        <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-2">
            <Image src="/ykay-logo.png" alt="Ykay" width={40} height={40} className="w-10 h-10 rounded-xl object-contain bg-white p-1" />
            <div>
              <div className="text-sm font-bold text-[var(--text-primary)]">{user?.name || "Administrator"}</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-green" /><span className="text-[10px] text-brand-green font-bold">ADMIN</span></div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-orange/10 border border-brand-orange/30">
          <Eye size={14} className="text-brand-orange" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">Demo Mode</span>
        </div>

        {/* Admin Tools Label */}
        <div className="flex items-center gap-2 px-4">
          <Settings size={14} className="text-brand-green" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-green">Admin Tools</span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {ADMIN_NAV.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive ? "bg-brand-green/10 text-brand-green border border-brand-green/20"
                           : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-disabled)] border border-transparent"
                }`}>
                <item.icon size={16} />
                <span className="tracking-wide flex-1">{item.label}</span>
                {item.badge && <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-green text-white font-bold">{item.badge}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1">
          <Link href="/portal" className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-muted)] hover:text-brand-green transition-colors rounded-lg">
            <ArrowLeft size={14} /><span>Portal Hub</span>
          </Link>
          <button onClick={() => { toast("Logged out", "info"); logout(); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors rounded-lg">
            <LogOut size={14} /><span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}