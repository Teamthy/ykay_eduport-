"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, Eye, ChevronDown, ShieldCheck, GraduationCap, User, Users,
  LayoutGrid, LogOut, LayoutDashboard, BookOpen, ClipboardCheck,
  FileText, MessageSquare, Award, Settings, TrendingUp,
  Calendar, UserCheck, Megaphone, Heart, School, History, BarChart3,
  Upload, RotateCcw, Edit, HelpCircle, IdCard, FileEdit
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useToast } from "./Toast";
import { CURRENT_TEACHER } from "@/lib/teacherData";

const PORTAL_SWITCHER = [
  { label: "Admin Portal", href: "/admin", icon: ShieldCheck, type: "admin" },
  { label: "Teacher Portal", href: "/teacher/dashboard", icon: GraduationCap, type: "teacher" },
  { label: "Student Portal", href: "/student/dashboard", icon: User, type: "student" },
  { label: "Parent Portal", href: "/parent/dashboard", icon: Users, type: "parent" },
];

export default function TeacherSidebar() {
  const pathname = usePathname();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { logout } = useAuth();
  const { toast } = useToast();
  const switcherRef = useRef<HTMLDivElement>(null);
  const teacher = CURRENT_TEACHER;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    if (switcherOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [switcherOpen]);

  const handleLogout = () => {
    toast("Logged out successfully", "info");
    logout();
  };

  const isSubjectTeacher = teacher.role === "subject_teacher" || teacher.role === "both";
  const isClassTeacher = teacher.role === "class_teacher" || teacher.role === "both";

  const generalItems = [
    { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
    { label: "My Profile", href: "/teacher/profile", icon: User },
    { label: "Messages", href: "/teacher/messages", icon: MessageSquare, badge: "3" },
  ];

  const subjectTeacherItems = [
    { label: "My Students", href: "/teacher/students", icon: Users },
    { label: "Performance Records", href: "/teacher/performance", icon: TrendingUp },
    { label: "Add Performance", href: "/teacher/performance/add", icon: BookOpen },
    { label: "Send Results", href: "/teacher/send-results", icon: MessageSquare },
    { label: "Analytics", href: "/teacher/analytics", icon: BarChart3 },
  ];

  const cbtItems = [
    { label: "CBT Center", href: "/teacher/cbt-center", icon: ClipboardCheck },
    { label: "Edit Test Courses", href: "/teacher/test-courses", icon: FileEdit, badge: "New" },
    { label: "Question Bank", href: "/teacher/question-bank", icon: Eye, badge: "New" },
    { label: "Upload Questions", href: "/teacher/upload-questions", icon: Upload, badge: "New" },
    { label: "Add Instructions", href: "/teacher/add-instructions", icon: FileText, badge: "New" },
    { label: "Test Results", href: "/teacher/test-results", icon: BarChart3, badge: "New" },
    { label: "Enable Retake", href: "/teacher/test-retake", icon: RotateCcw, badge: "New" },
    { label: "Create Evaluation", href: "/teacher/evaluations/create", icon: Award },
    { label: "View Evaluations", href: "/teacher/evaluations", icon: FileText },
  ];

  const classTeacherItems = [
    { label: `Class: ${teacher.formClass || "N/A"}`, href: "/teacher/class/roster", icon: School },
    { label: "Attendance Register", href: "/teacher/class/attendance", icon: UserCheck, badge: teacher.formClassStudentCount ? String(teacher.formClassStudentCount) : undefined },
    { label: "Attendance History", href: "/teacher/class/attendance-history", icon: History },
    { label: "Behavior Records", href: "/teacher/class/behavior", icon: Heart },
    { label: "Class Announcements", href: "/teacher/class/announcements", icon: Megaphone },
    { label: "Class Report Cards", href: "/teacher/class/report-cards", icon: FileText },
    { label: "Class Timetable", href: "/teacher/class/timetable", icon: Calendar },
    { label: "Parent Communications", href: "/teacher/class/parents", icon: Users },
  ];

  return (
    <aside className="lg:w-[300px] shrink-0">
      <div className="sticky top-24 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4">
        <div ref={switcherRef} className="relative">
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="w-full p-4 rounded-2xl bg-brand-navy border border-white/10 hover:border-brand-green/50 transition-all flex items-center justify-between"
          >
            <div className="text-left">
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand-green block">Active Portal</span>
              <span className="font-display text-sm text-white tracking-[1px]">Teaching</span>
            </div>
            <ChevronDown size={16} className={`text-white/60 transition-transform ${switcherOpen ? "rotate-180" : ""}`} />
          </button>

          {switcherOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ zIndex: 100, backgroundColor: "#0C1824" }}>
              <div className="p-3 border-b border-white/10 flex items-center gap-2 bg-brand-navy">
                <LayoutGrid size={12} className="text-white/60" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Switch Portal</span>
              </div>
              <div className="bg-brand-navy">
                {PORTAL_SWITCHER.map(p => (
                  <Link key={p.type} href={p.href} onClick={() => setSwitcherOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${p.type === "teacher" ? "bg-brand-green/20 text-brand-green" : "text-white/80 hover:bg-white/5 hover:text-brand-green"}`}>
                    <p.icon size={16} />
                    <span className="font-medium">{p.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-3">
            <img src={teacher.photoUrl} alt={teacher.fullName} className="w-12 h-12 rounded-full object-cover border-2 border-brand-green" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[var(--text-primary)] truncate">{teacher.fullName}</div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-brand-green" />
                <span className="text-[10px] text-brand-green font-bold">ACTIVE</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {isSubjectTeacher && <span className="px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green text-[9px] font-bold uppercase tracking-widest">Subject Teacher</span>}
            {isClassTeacher && <span className="px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange text-[9px] font-bold uppercase tracking-widest">Form Teacher {teacher.formClass}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-orange/10 border border-brand-orange/30">
          <Eye size={14} className="text-brand-orange" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">Demo Mode</span>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-4 mb-2">General</div>
          <nav className="space-y-1">
            {generalItems.map(item => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${isActive ? "bg-brand-green/10 text-brand-green border border-brand-green/20" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-disabled)] border border-transparent"}`}>
                  <item.icon size={16} />
                  <span className="tracking-wide flex-1">{item.label}</span>
                  {item.badge && <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-orange text-white font-bold">{item.badge}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {isSubjectTeacher && (
          <>
            <div>
              <div className="flex items-center gap-2 px-4 mb-2">
                <div className="w-4 h-4 rounded bg-brand-green/20 flex items-center justify-center">
                  <BookOpen size={9} className="text-brand-green" />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-brand-green">Subject Teaching</div>
              </div>
              <nav className="space-y-1">
                {subjectTeacherItems.map(item => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}
                      className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${isActive ? "bg-brand-green/10 text-brand-green border border-brand-green/20" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-disabled)] border border-transparent"}`}>
                      <item.icon size={16} />
                      <span className="tracking-wide flex-1">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div>
              <div className="flex items-center gap-2 px-4 mb-2">
                <div className="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center">
                  <ClipboardCheck size={9} className="text-blue-500" />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-blue-500">CBT & Exams</div>
              </div>
              <nav className="space-y-1">
                {cbtItems.map(item => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}
                      className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${isActive ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-disabled)] border border-transparent"}`}>
                      <item.icon size={16} />
                      <span className="tracking-wide flex-1">{item.label}</span>
                      {item.badge && <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-green text-white font-bold">{item.badge}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </>
        )}

        {isClassTeacher && (
          <div>
            <div className="flex items-center gap-2 px-4 mb-2">
              <div className="w-4 h-4 rounded bg-brand-orange/20 flex items-center justify-center">
                <School size={9} className="text-brand-orange" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">Class Teaching</div>
            </div>
            <nav className="space-y-1">
              {classTeacherItems.map(item => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${isActive ? "bg-brand-orange/10 text-brand-orange border border-brand-orange/20" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-disabled)] border border-transparent"}`}>
                    <item.icon size={16} />
                    <span className="tracking-wide flex-1">{item.label}</span>
                    {item.badge && <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-orange text-white font-bold">{item.badge}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1">
          <Link href="/portal" className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-muted)] hover:text-brand-green transition-colors rounded-lg">
            <ArrowLeft size={14} />
            <span>Portal Hub</span>
          </Link>
          <Link href="/teacher/profile" className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-muted)] hover:text-brand-green transition-colors rounded-lg">
            <Settings size={14} />
            <span>Settings</span>
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors rounded-lg">
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
