"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BellRing,
  LayoutDashboard,
  LogOut,
  School,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ResponsiveSidebar, { useResponsiveSidebar } from "@/components/ResponsiveSidebar";

const NAV_ITEMS = [
  { label: "Platform overview", href: "/super-admin", icon: LayoutDashboard },
  { label: "Portal hub", href: "/super-admin/portals", icon: Users },
  { label: "Schools overview", href: "/super-admin/schools", icon: School },
  { label: "System health", href: "/super-admin/health", icon: Activity },
  { label: "Broadcast", href: "/super-admin/broadcast", icon: BellRing },
];

function SidebarContent() {
  const pathname = usePathname();
  const { user, logout, logoutHref } = useAuth();
  const { collapsed } = useResponsiveSidebar();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "SA";

  return (
    <div className="space-y-4 px-1 pb-2">
      <div
        className="portal-sidebar-brand flex items-center gap-3 rounded-2xl p-3"
        title={collapsed ? "Platform control workspace" : undefined}
      >
        <span className="portal-sidebar-user-avatar" aria-hidden="true">
          <ShieldCheck size={19} strokeWidth={1.8} />
        </span>
        <span className="portal-sidebar-brandcopy min-w-0">
          <span className="block text-[9px] font-bold uppercase tracking-widest text-brand-green">
            Platform control
          </span>
          <span className="mt-0.5 block truncate font-display text-sm tracking-[1px] text-[var(--text-primary)]">
            Super Admin
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

      {isSuperAdmin ? (
        <nav aria-label="Platform administration" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/super-admin" && pathname.startsWith(`${item.href}/`));
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
              </Link>
            );
          })}
        </nav>
      ) : null}

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
  );
}

export default function SuperAdminSidebar() {
  return (
    <ResponsiveSidebar label="Super Admin">
      <SidebarContent />
    </ResponsiveSidebar>
  );
}
