"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeftRight,
  Banknote,
  Bell,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Calculator,
  CreditCard,
  FilePlus2,
  FileSpreadsheet,
  Grid3X3,
  HelpCircle,
  IdCard,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Newspaper,
  QrCode,
  Receipt,
  School,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import Image from "next/image";
import ResponsiveSidebar, { useResponsiveSidebar } from "@/components/ResponsiveSidebar";
import { activeNavigationHref } from "@/lib/route-matching";

/**
 * Role-gated admin navigation (audit H9).
 *
 * Server APIs remain the authorization boundary; this list mirrors the
 * supported roles so a bursar sees finance tools (not academic pages that
 * return 401), and a coordinator's menu matches its permitted routes.
 */
const CORE_ADMIN = ["ADMIN", "DIRECTOR", "SUPER_ADMIN"] as const;
const PEOPLE_ADMIN = ["ADMIN", "DIRECTOR", "COORDINATOR", "SUPER_ADMIN"] as const;
const ACADEMIC_ADMIN = ["ADMIN", "DIRECTOR", "COORDINATOR", "SUPER_ADMIN"] as const;
const FINANCE_ADMIN = ["ADMIN", "DIRECTOR", "BURSAR", "COORDINATOR"] as const;
const ALL_ADMIN_AREA = ["ADMIN", "DIRECTOR", "BURSAR", "COORDINATOR", "SUPER_ADMIN"] as const;
const CBT_CONTENT_ADMIN = ["ADMIN", "SUPER_ADMIN"] as const;

const ADMIN_NAV = [
  { label: "Admin Dashboard", href: "/admin", icon: LayoutDashboard, roles: ALL_ADMIN_AREA },
  {
    label: "Admissions Queue",
    href: "/admin-admissions",
    icon: Inbox,
    roles: PEOPLE_ADMIN,
  },
  { label: "Student Records", href: "/admin/students", icon: Users, roles: PEOPLE_ADMIN },
  { label: "Staff Accounts", href: "/admin/staff", icon: UserPlus, roles: PEOPLE_ADMIN },
  {
    label: "Staff QR Attendance",
    href: "/admin/staff-attendance",
    icon: QrCode,
    roles: PEOPLE_ADMIN,
  },
  { label: "Class Manager", href: "/admin/class-manager", icon: School, roles: ACADEMIC_ADMIN },
  { label: "Timetable", href: "/admin/timetable", icon: CalendarClock, roles: ACADEMIC_ADMIN },
  { label: "Subjects", href: "/admin/subjects", icon: BookOpen, roles: ACADEMIC_ADMIN },
  { label: "Messages", href: "/admin/messages", icon: MessageCircle, roles: ALL_ADMIN_AREA },
  { label: "Sessions & Terms", href: "/admin/sessions", icon: CalendarDays, roles: CORE_ADMIN },
  { label: "Promotion", href: "/admin/promotion", icon: TrendingUp, roles: ACADEMIC_ADMIN },
  {
    label: "Staff Assignments",
    href: "/admin/staff-assignments",
    icon: ListChecks,
    roles: ACADEMIC_ADMIN,
  },
  { label: "Fee Management", href: "/admin/fees", icon: CreditCard, roles: FINANCE_ADMIN },
  {
    label: "Fee Structures",
    href: "/admin/fees/structures",
    icon: Receipt,
    roles: FINANCE_ADMIN,
  },
  {
    label: "Generate Invoices",
    href: "/admin/fees/generate",
    icon: FilePlus2,
    roles: FINANCE_ADMIN,
  },
  {
    label: "Transfer Review",
    href: "/admin/fees/transfers",
    icon: ArrowLeftRight,
    roles: FINANCE_ADMIN,
  },
  { label: "Expenses", href: "/admin/expenses", icon: Banknote, roles: FINANCE_ADMIN },
  { label: "Budgets", href: "/admin/budgets", icon: Calculator, roles: FINANCE_ADMIN },
  { label: "Finances", href: "/admin/finances", icon: Wallet, roles: FINANCE_ADMIN },
  {
    label: "Attendance Analytics",
    href: "/admin/attendance-analytics",
    icon: Activity,
    roles: PEOPLE_ADMIN,
  },
  {
    label: "Attendance Corrections",
    href: "/admin/attendance-corrections",
    icon: CalendarCheck,
    roles: PEOPLE_ADMIN,
  },
  {
    label: "Report Cards",
    href: "/admin/report-cards",
    icon: FileSpreadsheet,
    roles: ACADEMIC_ADMIN,
  },
  {
    label: "Gradebook Lock",
    href: "/admin/gradebook-lock",
    icon: LockKeyhole,
    roles: ACADEMIC_ADMIN,
  },
  { label: "Broadsheet", href: "/admin/broadsheet", icon: Grid3X3, roles: ACADEMIC_ADMIN },
  { label: "Leaderboards", href: "/admin/leaderboards", icon: TrendingUp, roles: ACADEMIC_ADMIN },
  { label: "ID Cards", href: "/admin/id-cards", icon: IdCard, roles: PEOPLE_ADMIN },
  { label: "Post & News", href: "/admin/news", icon: Newspaper, roles: PEOPLE_ADMIN },
  { label: "Notifications", href: "/admin/notifications", icon: Bell, roles: PEOPLE_ADMIN },
  { label: "School Profile", href: "/admin/school-profile", icon: Building2, roles: CORE_ADMIN },
  { label: "View Questions", href: "/admin/questions", icon: HelpCircle, roles: PEOPLE_ADMIN },
  {
    label: "CBT Question Review",
    href: "/admin/cbt-bank",
    icon: HelpCircle,
    roles: CBT_CONTENT_ADMIN,
  },
];

function AdminSidebarContent() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { collapsed } = useResponsiveSidebar();
  const visibleNavigation = ADMIN_NAV.filter(
    (item) => user?.role && (item.roles as readonly string[]).includes(user.role),
  );
  const activeHref = activeNavigationHref(
    pathname,
    visibleNavigation.map((item) => item.href),
  );
  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "YK";

  return (
    <div className="space-y-4 px-1 pb-2">
      <div
        className="portal-sidebar-brand flex items-center gap-3 rounded-2xl p-3"
        title={collapsed ? "Ykay College admin workspace" : undefined}
      >
        <Image
          src="/ykay-logo.png"
          alt="Ykay"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 object-contain"
        />
        <span className="portal-sidebar-brandcopy min-w-0">
          <span className="block text-[9px] font-bold uppercase tracking-widest text-brand-green">
            Admin workspace
          </span>
          <span className="block truncate font-display text-sm tracking-[1px] text-[var(--text-primary)]">
            YKAY COLLEGE
          </span>
        </span>
      </div>

      {user ? (
        <div
          className="portal-sidebar-user flex items-center gap-2.5 rounded-xl px-3 py-2.5"
          title={
            collapsed ? `${user.name} · ${user.role?.replaceAll("_", " ") || "Account"}` : undefined
          }
        >
          <span className="portal-sidebar-user-avatar" aria-hidden="true">
            {initials}
          </span>
          <span className="portal-sidebar-usercopy min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Signed in
            </span>
            <span className="block truncate text-xs font-bold text-[var(--text-primary)]">
              {user.name}
            </span>
            <span className="block truncate text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
              {user.role?.replaceAll("_", " ")}
            </span>
          </span>
        </div>
      ) : null}

      <nav aria-label="Admin pages" className="space-y-1">
        {visibleNavigation.map((item) => {
          const isActive = activeHref === item.href;
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
                <item.icon size={17} strokeWidth={1.85} />
              </span>
              <span className="portal-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={logout}
        aria-label="Sign out"
        title={collapsed ? "Sign out" : undefined}
        className="portal-nav-link text-left hover:!border-red-500/15 hover:!bg-red-500/10 hover:!text-red-400"
      >
        <span className="portal-nav-icon">
          <LogOut size={16} strokeWidth={1.85} />
        </span>
        <span className="portal-nav-label">Sign out</span>
      </button>
    </div>
  );
}

export default function AdminSidebar() {
  return (
    <ResponsiveSidebar label="Admin">
      <AdminSidebarContent />
    </ResponsiveSidebar>
  );
}
