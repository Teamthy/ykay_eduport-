"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  HelpCircle,
  IdCard,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  School,
  Send,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import Image from "next/image";

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

const ADMIN_NAV = [
  { label: "Admin Dashboard", href: "/admin", icon: LayoutDashboard, roles: ALL_ADMIN_AREA },
  {
    label: "Admissions Queue",
    href: "/admin-admissions",
    icon: ClipboardCheck,
    roles: PEOPLE_ADMIN,
  },
  { label: "Student Records", href: "/admin/students", icon: Users, roles: PEOPLE_ADMIN },
  { label: "Staff Accounts", href: "/admin/staff", icon: UserPlus, roles: PEOPLE_ADMIN },
  {
    label: "Staff QR Attendance",
    href: "/admin/staff-attendance",
    icon: ClipboardCheck,
    roles: PEOPLE_ADMIN,
  },
  { label: "Class Manager", href: "/admin/class-manager", icon: School, roles: ACADEMIC_ADMIN },
  { label: "Timetable", href: "/admin/timetable", icon: CalendarDays, roles: ACADEMIC_ADMIN },
  { label: "Subjects", href: "/admin/subjects", icon: BookOpen, roles: ACADEMIC_ADMIN },
  { label: "Messages", href: "/admin/messages", icon: MessageCircle, roles: ALL_ADMIN_AREA },
  { label: "Sessions & Terms", href: "/admin/sessions", icon: CalendarDays, roles: CORE_ADMIN },
  { label: "Promotion", href: "/admin/promotion", icon: GraduationCap, roles: ACADEMIC_ADMIN },
  {
    label: "Staff Assignments",
    href: "/admin/staff-assignments",
    icon: BookOpen,
    roles: ACADEMIC_ADMIN,
  },
  { label: "Fee Management", href: "/admin/fees", icon: CreditCard, roles: FINANCE_ADMIN },
  {
    label: "Fee Structures",
    href: "/admin/fees/structures",
    icon: CreditCard,
    roles: FINANCE_ADMIN,
  },
  {
    label: "Generate Invoices",
    href: "/admin/fees/generate",
    icon: CreditCard,
    roles: FINANCE_ADMIN,
  },
  {
    label: "Transfer Review",
    href: "/admin/fees/transfers",
    icon: CreditCard,
    roles: FINANCE_ADMIN,
  },
  { label: "Expenses", href: "/admin/expenses", icon: CreditCard, roles: FINANCE_ADMIN },
  { label: "Budgets", href: "/admin/budgets", icon: CreditCard, roles: FINANCE_ADMIN },
  { label: "Finances", href: "/admin/finances", icon: CreditCard, roles: FINANCE_ADMIN },
  {
    label: "Attendance Analytics",
    href: "/admin/attendance-analytics",
    icon: BarChart3,
    roles: PEOPLE_ADMIN,
  },
  {
    label: "Attendance Corrections",
    href: "/admin/attendance-corrections",
    icon: ClipboardCheck,
    roles: PEOPLE_ADMIN,
  },
  { label: "Report Cards", href: "/admin/report-cards", icon: FileText, roles: ACADEMIC_ADMIN },
  { label: "Gradebook Lock", href: "/admin/gradebook-lock", icon: Lock, roles: ACADEMIC_ADMIN },
  { label: "Broadsheet", href: "/admin/broadsheet", icon: BarChart3, roles: ACADEMIC_ADMIN },
  { label: "ID Cards", href: "/admin/id-cards", icon: IdCard, roles: PEOPLE_ADMIN },
  { label: "Post & News", href: "/admin/news", icon: Send, roles: PEOPLE_ADMIN },
  { label: "Notifications", href: "/admin/notifications", icon: Send, roles: PEOPLE_ADMIN },
  { label: "School Profile", href: "/admin/school-profile", icon: MapPin, roles: CORE_ADMIN },
  { label: "View Questions", href: "/admin/questions", icon: HelpCircle, roles: PEOPLE_ADMIN },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden w-[280px] shrink-0 lg:block">
      <div className="sticky top-24 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-brand-navy p-4">
          <div className="flex items-center gap-3">
            <Image
              src="/ykay-logo.png"
              alt="Ykay"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-brand-green">
                Admin workspace
              </div>
              <div className="font-display text-sm tracking-[1px] text-white">YKAY COLLEGE</div>
            </div>
          </div>
        </div>

        {user && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              <Shield size={12} /> Signed in
            </div>
            <div className="truncate text-sm font-bold text-[var(--text-primary)]">{user.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              {user.role?.replaceAll("_", " ")}
            </div>
          </div>
        )}

        <nav className="space-y-1">
          {ADMIN_NAV.filter(
            (item) => user?.role && (item.roles as readonly string[]).includes(user.role),
          ).map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "border-brand-green/20 bg-brand-green/10 text-brand-green"
                    : "border-transparent text-[var(--text-muted)] hover:bg-[var(--surface-disabled)] hover:text-[var(--text-primary)]"
                }`}
              >
                <item.icon size={16} />
                <span className="tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-xs text-[var(--text-muted)] hover:text-red-500"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}
