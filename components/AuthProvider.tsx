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
    // Keep the same-origin logout request alive if navigation happens first.
    // A slow session-revocation write must not leave the user stuck on a
    // "Signing out…" dialog indefinitely; after five seconds we still leave
    // the portal while the request continues in the background.
    let timeoutId: number | undefined;
    const logoutRequest = Promise.resolve()
      .then(() =>
        fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          keepalive: true,
        }),
      )
      .then(
        () => undefined,
        () => undefined,
      );

    try {
      await Promise.race([
        logoutRequest,
        new Promise<void>((resolve) => {
          timeoutId = window.setTimeout(resolve, 5_000);
        }),
      ]);
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      setUser(null);
      // Replace rather than push so Back does not reopen the protected page.
      window.location.replace("/login");
    }
  }, []);

  // Confirmation lives here rather than in each sidebar so a new call site
  // cannot accidentally ship an unguarded sign-out. Previously four separate
  // components called logout() directly — one of them a bare icon button in
  // the topbar, one tap away on every portal page.
  const logout = useCallback(() => setConfirming(true), []);

  return (
    <Context.Provider value={{ user, loading, refresh, logout, logoutImmediately }}>
      {children}
      <ConfirmDialog
        open={confirming}
        variant="danger"
        title="Sign out?"
        message={
          user?.name
            ? `You're signed in as ${user.name}. You'll need your email and password to sign back in.`
            : "You'll need your email and password to sign back in."
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
