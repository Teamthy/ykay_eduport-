"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type User = { id: string; name: string; email: string; role: string };

type Value = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /**
   * Opens a confirmation dialog and only signs out if the user agrees.
   * Every sidebar/topbar sign-out button routes through this.
   */
  logout: () => void;
  /**
   * Signs out immediately, no prompt. Reserved for cases where the session is
   * already invalid and there is nothing to confirm — e.g. a wrong-role login
   * being cleared, or a failed re-authentication.
   */
  logoutImmediately: () => Promise<void>;
};

const Context = createContext<Value | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const refresh = async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      setUser(r.ok ? (await r.json()).user : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const logoutImmediately = useCallback(async () => {
    setLogoutError("");
    let timeoutId: number | undefined;

    try {
      // Do not navigate away until the same-origin API has acknowledged the
      // request. The previous fire-and-forget flow hid network/route failures,
      // so the browser appeared signed out while its session cookie remained
      // valid and the backend had never confirmed revocation.
      const response = await Promise.race([
        fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          keepalive: true,
        }),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error("The server did not confirm sign-out in time.")),
            10_000,
          );
        }),
      ]);

      if (!response.ok) {
        throw new Error(`The server returned ${response.status} while signing out.`);
      }

      const result = (await response.json().catch(() => null)) as { ok?: boolean } | null;
      if (result?.ok !== true) {
        throw new Error("The server did not confirm sign-out.");
      }

      setUser(null);
      // Replace rather than push so Back does not reopen the protected page.
      window.location.replace("/login");
    } catch {
      // Stay on the page and keep the retry action visible. Silently navigating
      // away here would mask a request that never reached the backend.
      setSigningOut(false);
      setLogoutError(
        "The server did not confirm that your session was revoked. Please retry before leaving this page; your session may still be active.",
      );
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    }
  }, []);

  // Confirmation lives here rather than in each sidebar so a new call site
  // cannot accidentally ship an unguarded sign-out. Previously four separate
  // components called logout() directly — one of them a bare icon button in
  // the topbar, one tap away on every portal page.
  const logout = useCallback(() => {
    setLogoutError("");
    setConfirming(true);
  }, []);

  return (
    <Context.Provider value={{ user, loading, refresh, logout, logoutImmediately }}>
      {children}
      <ConfirmDialog
        open={confirming}
        variant="danger"
        title="Sign out?"
        message={
          logoutError ||
          (user?.name
            ? `You're signed in as ${user.name}. You'll need your email and password to sign back in.`
            : "You'll need your email and password to sign back in.")
        }
        confirmText={signingOut ? "Signing out…" : "Yes, sign me out"}
        cancelText="Stay signed in"
        busy={signingOut}
        onCancel={() => {
          if (!signingOut) setConfirming(false);
        }}
        onConfirm={() => {
          if (signingOut) return; // guard against a double-click
          setSigningOut(true);
          void logoutImmediately();
        }}
      />
    </Context.Provider>
  );
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
