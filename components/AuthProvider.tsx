"use client";

import { createContext, useContext, useState, useEffect } from "react";

type Role = "admin" | "teacher" | "student" | "parent" | null;

interface User { role: Role; name: string; email: string; }
interface AuthContextValue {
  user: User | null;
  login: (role: Role, name?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_USERS: Record<string, User> = {
  admin: { role: "admin", name: "Mr. Adeyinka Oladimeji", email: "director@ykaycollege.com" },
  teacher: { role: "teacher", name: "Dr. Grace Okonkwo", email: "grace.o@ykaycollege.com" },
  student: { role: "student", name: "Emmanuel Adebayo", email: "emmanuel.a@student.ykay" },
  parent: { role: "parent", name: "Mrs. Ogunlade", email: "parent.a@email.com" },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ykay-demo-user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  const login = (role: Role) => {
    if (!role) return;
    const u = DEMO_USERS[role];
    setUser(u);
    try { localStorage.setItem("ykay-demo-user", JSON.stringify(u)); } catch {}
  };

  const logout = () => {
    setUser(null);
    try { localStorage.removeItem("ykay-demo-user"); } catch {}
    window.location.href = "/login";
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
