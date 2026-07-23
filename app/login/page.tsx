"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, ShieldCheck, AlertCircle, GraduationCap, User, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const destinations: Record<string, string> = {
  ADMIN: "/admin",
  DIRECTOR: "/admin",
  COORDINATOR: "/admin-admissions",
  BURSAR: "/admin/fees",
  HOD: "/teacher/dashboard",
  TEACHER: "/teacher/dashboard",
  PARENT: "/parent/dashboard",
  STUDENT: "/student/dashboard",
  IT_STUDENT: "/it-portal/dashboard",
};

const portalContext: Record<string, { heading: string; sub: string; icon: typeof GraduationCap }> = {
  staff: {
    heading: "STAFF SIGN IN",
    sub: "For teachers, form masters, and school administrators. Admins are routed to the admin console automatically.",
    icon: GraduationCap,
  },
  student: {
    heading: "STUDENT SIGN IN",
    sub: "Sign in with the student credentials issued by Ykay College.",
    icon: User,
  },
  parent: {
    heading: "PARENT SIGN IN",
    sub: "Sign in to monitor your child's attendance, results, and fees.",
    icon: Users,
  },
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const portal = searchParams.get("portal") || "";
  const context = portalContext[portal] || {
    heading: "SIGN IN",
    sub: "Use your registered school email address.",
    icon: ShieldCheck,
  };
  const ContextIcon = context.icon;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      await refresh();
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : destinations[body.user.role] || "/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-navy px-6 py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl md:grid-cols-2">
        <section className="bg-brand-navy p-9 text-white md:p-12">
          <Link href="/portal" className="text-xs font-bold uppercase tracking-widest text-brand-green">
            ← All Portals
          </Link>
          <ContextIcon className="mt-14 text-brand-green" size={42} />
          <h1 className="mt-5 font-display text-4xl tracking-widest">
            EDUPORTAL
            <br />
            <span className="text-brand-green">SECURE ACCESS</span>
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">
            Sign in with the credentials issued to you by Ykay College. For account help, contact the
            school administration.
          </p>
          <p className="mt-8 max-w-sm rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-6 text-white/55">
            Looking for IT Education courses?{" "}
            <Link href="/it-portal/auth" className="font-bold text-brand-green hover:underline">
              Go to the IT Education portal
            </Link>{" "}
            to sign in or create a free account.
          </p>
        </section>
        <section className="p-9 md:p-12">
          <h2 className="font-display text-3xl tracking-widest text-brand-navy">{context.heading}</h2>
          <p className="mt-2 text-sm text-slate-500">{context.sub}</p>
          {error && (
            <p role="alert" className="mt-5 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={17} /> {error}
            </p>
          )}
          <form onSubmit={submit} className="mt-7 space-y-5">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-700">
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-700">
              Password
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </label>
            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-green px-5 py-4 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-50"
            >
              <LockKeyhole size={16} /> {loading ? "Signing in" : "Sign in"}
            </button>
          </form>
          <Link
            href="/reset-password"
            className="mt-6 block text-center text-sm font-semibold text-brand-green hover:underline"
          >
            Forgot password?
          </Link>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-brand-navy" />}>
      <LoginForm />
    </Suspense>
  );
}
