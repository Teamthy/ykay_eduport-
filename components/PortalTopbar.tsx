"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Moon, ShieldCheck, Sun } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";

const ROUTE_TITLES: Record<string, string> = {
  "/admin": "Admin dashboard",
  "/admin-admissions": "Admissions queue",
  "/teacher/dashboard": "Teacher dashboard",
  "/student/dashboard": "Student dashboard",
  "/parent/dashboard": "Parent dashboard",
  "/settings/notifications": "Notification preferences",
  "/staff/attendance": "Staff attendance",
};

function readableRouteTitle(pathname: string) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  const segment = pathname.split("/").filter(Boolean).at(-1);
  if (!segment) return "Workspace";
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function initialsFor(name?: string | null) {
  const initials = name
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "YK";
}

export default function PortalTopbar({ title = "Workspace" }: { title?: string }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const pageTitle = title === "Workspace" ? readableRouteTitle(pathname) : title;
  const roleLabel = user?.role?.replaceAll("_", " ") || "Portal user";

  return (
    <header className="portal-topbar">
      <div className="portal-topbar__inner">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/portal" className="portal-topbar__brand" aria-label="Ykay EduPortal home">
            <span className="portal-topbar__mark">
              <ShieldCheck size={19} strokeWidth={1.8} />
            </span>
            <span className="portal-topbar__heading">
              <span className="portal-topbar__eyebrow block">YKAY · EduPortal</span>
              <span className="portal-topbar__title block">{pageTitle}</span>
            </span>
          </Link>
        </div>

        <div className="portal-topbar__actions">
          <Link
            href="/settings/notifications"
            aria-label="Notification settings"
            title="Notification settings"
            className="portal-topbar__action"
          >
            <Bell size={18} strokeWidth={1.8} />
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${resolvedTheme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${resolvedTheme === "light" ? "dark" : "light"} mode`}
            className="portal-topbar__action"
          >
            {resolvedTheme === "light" ? (
              <Moon size={18} strokeWidth={1.8} />
            ) : (
              <Sun size={18} strokeWidth={1.8} />
            )}
          </button>
          <div
            className="portal-topbar__account"
            title={`${user?.name || "Account"} · ${roleLabel}`}
          >
            <span className="portal-topbar__avatar" aria-hidden="true">
              {initialsFor(user?.name)}
            </span>
            <span className="portal-topbar__account-copy">
              <span className="portal-topbar__account-name block">{user?.name || "Account"}</span>
              <span className="portal-topbar__account-role block">{roleLabel}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="portal-topbar__action hover:!border-red-500/20 hover:!bg-red-500/10 hover:!text-red-400"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}
