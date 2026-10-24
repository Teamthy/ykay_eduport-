"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  FileText,
  Users,
  LogOut,
  UserCheck,
  History,
  School,
  BarChart3,
  CalendarCheck,
  CalendarClock,
  LoaderCircle,
  Upload,
  Library,
  Send,
  Megaphone,
  MessageSquare,
  TrendingUp,
  UserCog,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import ResponsiveSidebar, { useResponsiveSidebar } from "@/components/ResponsiveSidebar";

type Me = {
  displayName: string;
  roleLabel: string | null;
  photoUrl: string | null;
  isFormTeacher: boolean;
  isSubjectTeacher: boolean;
  formClassName: string | null;
};

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard; badge?: string };

function NavBlock({
  title,
  color,
  items,
  pathname,
}: {
  title: string;
  color: string;
  items: NavItem[];
  pathname: string;
}) {
  const { collapsed } = useResponsiveSidebar();

  return (
    <div>
      <div className={`portal-nav-section-title ${color}`}>{title}</div>
      <nav aria-label={`${title} pages`} className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className="portal-nav-link"
            >
              <span className="portal-nav-icon">
                <item.icon size={17} strokeWidth={1.85} />
              </span>
              <span className="portal-nav-label">{item.label}</span>
              {item.badge ? (
                <span className="portal-nav-badge rounded-full bg-brand-orange px-2 py-0.5 text-[9px] font-bold text-brand-navy">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Production teacher nav — roles from live /api/teacher/dashboard.
 * No portal switcher, no demo badge, no mock teacherData.
 */
export default function TeacherSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/teacher/dashboard", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled && r.ok) setMe(j.teacher);
      } catch {
        /* sidebar still usable */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isForm = Boolean(me?.isFormTeacher);
  const isSubject = Boolean(me?.isSubjectTeacher) || (!isForm && !loading);

  const general: NavItem[] = [
    { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
    { label: "My Students", href: "/teacher/students", icon: Users },
    { label: "My Profile", href: "/teacher/profile", icon: UserCog },
    { label: "My attendance", href: "/staff/attendance", icon: CalendarCheck },
    { label: "My Records", href: "/teacher/my-records", icon: FileText },
    { label: "Announcements", href: "/teacher/announcements", icon: Megaphone },
    { label: "Messages", href: "/teacher/messages", icon: MessageSquare },
  ];

  const subject: NavItem[] = [
    { label: "Gradebook", href: "/teacher/gradebook", icon: BookOpen },
    { label: "Performance Records", href: "/teacher/performance-records", icon: TrendingUp },
    { label: "Analytics", href: "/teacher/analytics", icon: BarChart3 },
  ];

  /**
   * Tests & exams, in the order a teacher actually works.
   *
   * Two problems this fixes.
   *
   * 1. "Exam Centre" and "CBT Center" sat next to each other as peers with no
   *    hint of the difference. They query the SAME endpoint
   *    (/api/teacher/exams) — CBT Center is the older single-page builder,
   *    Exam Centre is the board that added scheduling, retakes and readiness
   *    warnings. Presented as equals, the only way to learn which to use was
   *    to open both. Exam Centre now leads and is labelled as the starting
   *    point; the old builder stays, marked "Classic", because it is a
   *    perfectly good quick-create form and removing a page teachers may have
   *    bookmarked mid-term is not worth the tidiness.
   *
   * 2. Upload Questions and Question Bank were ORPHANED — fully built and
   *    reachable only by clicking through from an existing exam. A teacher
   *    looking for "where do I drop my Word file" could not find it, because
   *    it was not in the navigation at all. Fifteen teacher pages are in that
   *    state; these are the two that block the exam workflow.
   */
  const assessments: NavItem[] = [
    {
      label: "Exam Centre",
      href: "/teacher/exam-center",
      icon: ClipboardCheck,
      badge: "Start here",
    },
    { label: "Upload Questions", href: "/teacher/upload-questions", icon: Upload },
    { label: "Question Bank", href: "/teacher/question-bank", icon: Library },
    { label: "Edit Test Courses", href: "/teacher/test-courses", icon: BookOpen },
    { label: "Grade Exams", href: "/teacher/grade-exams", icon: FileText },
    { label: "Send Results", href: "/teacher/send-results", icon: Send },
    { label: "Quick Create", href: "/teacher/cbt-center", icon: BookOpen, badge: "Classic" },
  ];

  const form: NavItem[] = [
    {
      label: me?.formClassName ? `Class: ${me.formClassName}` : "Class roster",
      href: "/teacher/class/roster",
      icon: School,
    },
    { label: "Attendance register", href: "/teacher/class/attendance", icon: UserCheck },
    { label: "Attendance history", href: "/teacher/class/attendance-history", icon: History },
    { label: "Class report cards", href: "/teacher/class/report-cards", icon: FileText },
    { label: "Class parents", href: "/teacher/class/parents", icon: Users },
    { label: "Class timetable", href: "/teacher/class/timetable", icon: CalendarClock },
  ];

  return (
    <ResponsiveSidebar label="Teacher">
      <div className="space-y-4 px-1 pb-2">
        <div className="portal-sidebar-brand flex items-center gap-3 rounded-2xl p-3">
          <span className="portal-sidebar-user-avatar" aria-hidden="true">
            <School size={18} strokeWidth={1.8} />
          </span>
          <span className="portal-sidebar-brandcopy min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-brand-green">
              Teaching workspace
            </span>
            <span className="mt-0.5 block truncate font-display text-sm tracking-[1px] text-[var(--text-primary)]">
              {loading ? "Loading…" : me?.displayName || user?.name || "Teacher"}
            </span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              {isSubject && (
                <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand-green">
                  Subject
                </span>
              )}
              {isForm && (
                <span className="rounded-full bg-brand-orange/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand-orange">
                  Form {me?.formClassName || ""}
                </span>
              )}
            </span>
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-3 text-xs text-[var(--text-muted)]">
            <LoaderCircle className="animate-spin" size={14} />
            <span className="portal-sidebar-brandcopy">Syncing assignments…</span>
          </div>
        ) : null}

        <NavBlock
          title="General"
          color="text-[var(--text-muted)]"
          items={general}
          pathname={pathname}
        />
        {isSubject ? (
          <NavBlock
            title="Subject teaching"
            color="text-brand-green"
            items={subject}
            pathname={pathname}
          />
        ) : null}
        {isSubject ? (
          <NavBlock
            title="Tests & exams"
            color="text-brand-orange"
            items={assessments}
            pathname={pathname}
          />
        ) : null}
        {isForm ? (
          <NavBlock title="Form class" color="text-brand-orange" items={form} pathname={pathname} />
        ) : null}

        <button
          type="button"
          onClick={logout}
          aria-label="Sign out"
          title="Sign out"
          className="portal-nav-link text-left hover:!border-red-500/15 hover:!bg-red-500/10 hover:!text-red-400"
        >
          <span className="portal-nav-icon">
            <LogOut size={16} strokeWidth={1.85} />
          </span>
          <span className="portal-nav-label">Sign out</span>
        </button>
      </div>
    </ResponsiveSidebar>
  );
}
