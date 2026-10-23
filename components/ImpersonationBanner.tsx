"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, LoaderCircle, LogOut } from "lucide-react";

/**
 * Persistent super-admin impersonation banner (audit AUTH-01 / H12).
 *
 * The previous banner lived only in React state on /super-admin: it was
 * invisible inside the impersonated portal, and a page reload removed the
 * only "End" control while the session quietly remained the victim's.
 * This banner is driven by the session itself (`/api/auth/me` returns
 * `impersonatedBy`), is mounted in the root layout so it follows the
 * operator into every portal, and survives reloads. Ending impersonation
 * restores the super-admin session via DELETE /api/super-admin/impersonate.
 */

type MeUser = {
  name?: string;
  email?: string;
  role?: string;
  impersonatedBy?: string;
} | null;

export default function ImpersonationBanner() {
  const [user, setUser] = useState<MeUser>(null);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setUser(null);
        return;
      }
      const body = (await response.json()) as { user?: MeUser };
      setUser(body.user ?? null);
    } catch {
      // A failed identity probe must never break the page underneath.
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user?.impersonatedBy) return null;

  async function endImpersonation() {
    setEnding(true);
    setError("");
    try {
      const response = await fetch("/api/super-admin/impersonate", { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not end impersonation.");
      window.location.href = "/super-admin";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not end impersonation.");
      setEnding(false);
    }
  }

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[100] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-amber-400 px-4 py-2 text-center text-xs font-bold text-amber-950 shadow-lg"
    >
      <span className="inline-flex items-center gap-1.5">
        <Eye size={14} aria-hidden />
        Viewing as {user.name || user.email || "user"}
        {user.role ? ` (${user.role.replaceAll("_", " ")})` : ""} — read-only impersonation. Writes
        are blocked.
      </span>
      <button
        type="button"
        onClick={() => void endImpersonation()}
        disabled={ending}
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-950 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-50 transition hover:bg-black disabled:opacity-60"
      >
        {ending ? (
          <LoaderCircle size={12} className="animate-spin" aria-hidden />
        ) : (
          <LogOut size={12} aria-hidden />
        )}
        End impersonation
      </button>
      {error ? (
        <span className="w-full text-[11px] font-semibold text-red-900">{error}</span>
      ) : null}
    </div>
  );
}
