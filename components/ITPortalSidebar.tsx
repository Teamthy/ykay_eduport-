"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, BookOpen, GraduationCap, LayoutDashboard, LogOut, UserCog } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ResponsiveSidebar, { useResponsiveSidebar } from "@/components/ResponsiveSidebar";

const NAV_ITEMS = [
  { label: "My courses", href: "/it-portal/dashboard", icon: LayoutDashboard },
  { label: "Certificates", href: "/it-portal/certificates", icon: Award },
  { label: "Profile & settings", href: "/it-portal/profile", icon: UserCog },
  { label: "Instructor dashboard", href: "/it-portal/instructor", icon: GraduationCap },
  { label: "Browse catalog", href: "/it-education", icon: BookOpen },
];

function SidebarContent() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { collapsed } = useResponsiveSidebar();
  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "IT";

  return (
    <div className="space-y-4 px-1 pb-2">
      <div
        className="portal-sidebar-brand flex items-center gap-3 rounded-2xl p-3"
        title={collapsed ? "IT learning workspace" : undefined}
      >
        <span className="portal-sidebar-user-avatar" aria-hidden="true">
          <GraduationCap size={19} strokeWidth={1.8} />
        </span>
        <span className="portal-sidebar-brandcopy min-w-0">
          <span className="block text-[9px] font-bold uppercase tracking-widest text-brand-green">
            Digital learning
          </span>
          <span className="mt-0.5 block truncate font-display text-sm tracking-[1px] text-[var(--text-primary)]">
            IT Learning Hub
          </span>
        </span>
      </div>

      {user ? (
        <div
          className="portal-sidebar-user flex items-center gap-2.5 rounded-xl px-3 py-2.5"
          title={collapsed ? `${user.name} · ${user.role.replaceAll("_", " ")}` : undefined}
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
              {user.role.replaceAll("_", " ")}
            </span>
          </span>
        </div>
      ) : null}

      <nav aria-label="IT learning pages" className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.href === "/it-portal/dashboard" && pathname.startsWith("/it-portal/courses/"));
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

      <div className="border-t border-[var(--border-subtle)] pt-3">
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
    </div>
  );
}

export default function ITPortalSidebar() {
  return (
    <ResponsiveSidebar label="IT Learning">
      <SidebarContent />
    </ResponsiveSidebar>
  );
}
