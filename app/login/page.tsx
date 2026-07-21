"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, GraduationCap, User, Users, ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";

const ROLES = [
  { role: "admin" as const, label: "Admin", icon: ShieldCheck, redirect: "/admin", email: "admin@ykaycollege.com" },
  { role: "teacher" as const, label: "Teacher", icon: GraduationCap, redirect: "/teacher/dashboard", email: "grace.o@ykaycollege.com" },
  { role: "student" as const, label: "Student", icon: User, redirect: "/student/dashboard", email: "emmanuel.a@student.ykay" },
  { role: "parent" as const, label: "Parent", icon: Users, redirect: "/parent/dashboard", email: "parent.a@email.com" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<typeof ROLES[0] | null>(null);
  const [password, setPassword] = useState("demo");
  const [showPassword, setShowPassword] = useState(false);

  const handleQuickLogin = (role: typeof ROLES[0]) => {
    login(role.role);
    toast(`Welcome, ${role.label}!`, "success");
    router.push(role.redirect);
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    login(selectedRole.role);
    toast(`Logged in as ${selectedRole.label}`, "success");
    router.push(selectedRole.redirect);
  };

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6 py-16 theme-transition">
      <div className="max-w-5xl w-full grid md:grid-cols-2 gap-8">
        {/* Left: Quick Demo Access */}
        <div className="bg-brand-navy rounded-[2.5rem] p-10 text-white">
          <Link href="/" className="text-brand-green text-xs font-bold tracking-widest uppercase mb-4 block hover:underline">← YKAY COLLEGE</Link>
          <h1 className="font-display text-4xl md:text-5xl leading-tight mb-3">DEMO <span className="text-brand-green">ACCESS</span></h1>
          <p className="text-white/60 text-sm mb-8">Click any role below to instantly explore that portal — no password required for the demo.</p>

          <div className="space-y-3">
            {ROLES.map(r => (
              <button
                key={r.role}
                onClick={() => handleQuickLogin(r)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-brand-green/10 hover:border-brand-green/50 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-green/20 flex items-center justify-center text-brand-green group-hover:bg-brand-green group-hover:text-white transition-colors">
                  <r.icon size={22} />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-white">{r.label} Portal</div>
                  <div className="text-xs text-white/50">{r.email}</div>
                </div>
                <ArrowRight size={18} className="text-white/40 group-hover:text-brand-green group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-xl bg-brand-orange/10 border border-brand-orange/30">
            <p className="text-xs text-brand-orange"><strong>Demo Mode:</strong> All data is simulated. In production, real credentials will be issued per user.</p>
          </div>
        </div>

        {/* Right: Formal Login Form */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[2.5rem] p-10 shadow-[var(--card-shadow)]">
          <h2 className="font-display text-3xl text-[var(--text-primary)] mb-2">SIGN IN</h2>
          <p className="text-sm text-[var(--text-muted)] mb-8">Traditional login form (for demo demonstration).</p>

          <form onSubmit={handleFormLogin} className="space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)] mb-2 block">Select Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${
                      selectedRole?.role === r.role
                        ? "bg-brand-green/10 border-brand-green text-brand-green"
                        : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-brand-green/30"
                    }`}
                  >
                    <r.icon size={16} /> {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)] mb-2 block">Email</label>
              <input
                type="email"
                value={selectedRole?.email || ""}
                readOnly
                placeholder="Select role first"
                className="w-full px-5 py-3.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)] mb-2 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-5 py-3.5 pr-12 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-2">Demo password: <code className="text-brand-green font-mono">demo</code></p>
            </div>

            <button
              type="submit"
              disabled={!selectedRole}
              className="w-full py-4 rounded-full bg-brand-green text-white font-bold uppercase tracking-widest text-sm hover:bg-brand-green-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
            >
              <Lock size={16} /> Sign In
            </button>

            <div className="text-center text-xs text-[var(--text-muted)]">
              <Link href="/" className="hover:text-brand-green">← Back to Homepage</Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
