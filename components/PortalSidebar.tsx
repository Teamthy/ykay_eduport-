"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileSpreadsheet,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  School,
  User,
  Users,
  Trophy,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import ResponsiveSidebar, { useResponsiveSidebar } from "@/components/ResponsiveSidebar";
import { activeNavigationHref } from "@/lib/route-matching";

interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

interface PortalSidebarProps {
  portalName: string;
  portalType: "admin" | "teacher" | "student" | "parent";
  items: SidebarItem[];
}

const STUDENT_ICON_BY_ROUTE: Record<string, LucideIcon> = {
  "/student/dashboard": LayoutDashboard,
  "/student/attendance": CalendarCheck,
  "/student/timetable": CalendarClock,
  "/student/exams": ClipboardCheck,
  "/student/waec-practice": BrainCircuit,
  "/student/personal-practice": BrainCircuit,
  "/student/leaderboards": Trophy,
  "/student/report-cards": FileSpreadsheet,
  "/student/messages": MessageSquare,
  "/student/announcements": Megaphone,
  "/student/profile": User,
  "/student/teachers": GraduationCap,
  "/student/id-card": IdCard,
};

const PARENT_ICON_BY_ROUTE: Record<string, LucideIcon> = {
  "/parent/dashboard": LayoutDashboard,
  "/parent/attendance": CalendarCheck,
  "/parent/fees": CreditCard,
  "/parent/report-cards": FileSpreadsheet,
  "/parent/exam-results": Award,
  "/parent/leaderboards": Trophy,
  "/parent/messages": MessageSquare,
  "/parent/events": CalendarDays,
};

const PORTAL_MARK: Record<PortalSidebarProps["portalType"], LucideIcon> = {
  admin: School,
  teacher: BookOpen,
  student: GraduationCap,
  parent: Users,
};

function getInitials(name?: string | null) {
  const initials = name
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "YK";
}

function PortalSidebarContent({ portalName, portalType, items }: PortalSidebarProps) {
  const pathname = usePathname();
  const { user, logout, logoutHref } = useAuth();
  const { collapsed } = useResponsiveSidebar();
  const activeHref = activeNavigationHref(
    pathname,
    items.map((item) => item.href),
  );
  const PortalIcon = PORTAL_MARK[portalType];
  const iconByRoute = portalType === "student" ? STUDENT_ICON_BY_ROUTE : PARENT_ICON_BY_ROUTE;

  return (
    <div className="space-y-4 px-1 pb-2">
      <div
        className="portal-sidebar-brand flex items-center gap-3 rounded-2xl p-3"
        title={collapsed ? `${portalName} workspace` : undefined}
      >
        <span className="portal-sidebar-user-avatar">
          <PortalIcon size={19} strokeWidth={1.8} />
        </span>
        <span className="portal-sidebar-brandcopy min-w-0">
          <span className="block text-[9px] font-extrabold uppercase tracking-[0.16em] text-brand-green">
            Active workspace
          </span>
          <span className="mt-0.5 block truncate font-display text-sm tracking-[1px] text-[var(--text-primary)]">
            {portalName}
          </span>
          <span className="portal-sidebar-workspace-meta mt-0.5 block text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {portalType} portal
          </span>
        </span>
      </div>

      {user ? (
        <div
          className="portal-sidebar-user flex items-center gap-3 rounded-xl px-3 py-2.5"
          title={
            collapsed ? `${user.name} · ${user.role?.replaceAll("_", " ") || "Account"}` : undefined
          }
        >
          <span className="portal-sidebar-user-avatar" aria-hidden="true">
            {getInitials(user.name)}
          </span>
          <span className="portal-sidebar-usercopy min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Signed in
            </span>
            <span className="block truncate text-xs font-bold text-[var(--text-primary)]">
              {user.name}
            </span>
            <span className="block truncate text-[9px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {user.role?.replaceAll("_", " ")}
            </span>
          </span>
        </div>
      ) : null}

      <nav aria-label={`${portalName} pages`} className="space-y-1">
        {items.map((item) => {
          const isActive = activeHref === item.href;
          const Icon = iconByRoute[item.href] ?? item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className="portal-nav-link"
            >
              <span className="portal-nav-icon">
                <Icon size={17} strokeWidth={1.85} />
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

      <div className="space-y-1 border-t border-[var(--border-subtle)] pt-3">
        <a
          href={logoutHref}
          onClick={(event) => {
            // Progressive enhancement: with JavaScript this opens the confirmation
            // dialog; without it (a bundle that never hydrated, or has thrown) the
            // href still signs out, because /api/auth/logout answers a plain
            // navigation with a 303 to the sign-in page.
            event.preventDefault();
            logout();
          }}
          aria-label="Sign out"
          title={collapsed ? "Sign out" : undefined}
          className="portal-nav-link text-left hover:!border-red-500/15 hover:!bg-red-500/10 hover:!text-red-400"
        >
          <span className="portal-nav-icon">
            <LogOut size={16} strokeWidth={1.85} />
          </span>
          <span className="portal-nav-label">Sign out</span>
        </a>
      </div>
    </div>
  );
}

/** Role-locked portal nav. Cross-portal switcher removed for production hygiene. */
export default function PortalSidebar(props: PortalSidebarProps) {
  return (
    <ResponsiveSidebar label={props.portalName}>
      <PortalSidebarContent {...props} />
    </ResponsiveSidebar>
  );
}
