"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { signInPathForRole } from "@/lib/auth-redirect";

// Re-exported for callers that imported it from here before the mapping moved
// to a framework-free module shared with the logout route.
export { signInPathForRole };

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
    setSigningOut(true);

    // Leave through the server, not through fetch().
    //
    // /api/auth/logout does the revocation and clears the cookie in the SAME
    // response that carries the redirect, so there is no window in which the
    // client believes it is signed out while the cookie is still valid — and no
    // fetch that can time out on a cold start and leave the dialog stuck
    // reporting a failure. A full navigation also works when this bundle has
    // thrown: the button is a plain link through the browser's navigation
    // machinery.
    const role = user?.role ?? "";
    const target = `/api/auth/logout${role ? `?role=${encodeURIComponent(role)}` : ""}`;
    // `replace`, not `assign`: the route we are leaving is a signed-in page and
    // must not be one Back-button press away. `/api/auth/logout` is a route
    // handler that answers with a 303, so this is a server redirect, not a
    // client-side one.
    window.location.replace(target);
  }, [user]);

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
