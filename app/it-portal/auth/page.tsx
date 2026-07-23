"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Award,
  BrainCircuit,
  LockKeyhole,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type Mode = "signin" | "signup";

export default function ItPortalAuthPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = mode === "signup" ? "/api/it/signup" : "/api/auth/login";
      const payload = mode === "signup" ? { name, email, password } : { email, password };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Something went wrong.");
      await refresh();
      router.replace("/it-portal/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to continue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-navy px-6 py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl md:grid-cols-2">
        {/* Brand panel */}
        <section className="bg-brand-navy p-9 text-white md:p-12">
          <Link href="/portal" className="text-xs font-bold uppercase tracking-widest text-brand-green">
            ← All Portals
          </Link>
          <MonitorSmartphone className="mt-14 text-brand-green" size={42} />
          <h1 className="mt-5 font-display text-4xl tracking-widest">
            IT EDUCATION
            <br />
            <span className="text-brand-green">DIGITAL SKILLS ACADEMY</span>
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">
            Certification-ready IT training for the next generation. Learn Python, AI, Cybersecurity, and
            the Microsoft Office suite with hands-on, project-driven lessons.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/70">
            <li className="flex items-center gap-3">
              <BrainCircuit size={16} className="shrink-0 text-brand-green" /> 8 industry-aligned course tracks
            </li>
            <li className="flex items-center gap-3">
              <Award size={16} className="shrink-0 text-brand-green" /> Certificates issued on completion
            </li>
            <li className="flex items-center gap-3">
              <Sparkles size={16} className="shrink-0 text-brand-green" /> Open to Ykay students and external learners
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck size={16} className="shrink-0 text-brand-green" /> Free account — start learning today
            </li>
          </ul>
        </section>

        {/* Form panel */}
        <section className="p-9 md:p-12">
          {/* Mode toggle */}
          <div className="mb-8 grid grid-cols-2 rounded-full border border-slate-200 bg-slate-50 p-1 text-center text-xs font-bold uppercase tracking-widest">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError("");
              }}
              className={`rounded-full px-4 py-2.5 transition-all ${
                mode === "signin" ? "bg-brand-green text-white shadow" : "text-slate-500 hover:text-brand-navy"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className={`rounded-full px-4 py-2.5 transition-all ${
                mode === "signup" ? "bg-brand-orange text-white shadow" : "text-slate-500 hover:text-brand-navy"
              }`}
            >
              Sign Up
            </button>
          </div>

          <h2 className="font-display text-3xl tracking-widest text-brand-navy">
            {mode === "signup" ? "CREATE ACCOUNT" : "WELCOME BACK"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "signup"
              ? "Join the Ykay IT Hub — free for Ykay students and external learners."
              : "Sign in to continue your IT learning journey."}
          </p>

          {error && (
            <p role="alert" className="mt-5 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={17} className="shrink-0" /> {error}
            </p>
          )}

          <form onSubmit={submit} className="mt-7 space-y-5">
            {mode === "signup" ? (
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-700">
                Full Name
                <input
                  required
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                  placeholder="e.g. Adaeze Okafor"
                />
              </label>
            ) : null}
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-700">
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="you@example.com"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-700">
              Password
              <input
                required
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                placeholder={mode === "signup" ? "Min. 8 characters with a number" : "Your password"}
              />
            </label>
            <button
              disabled={loading}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-bold uppercase tracking-widest text-white transition-all disabled:opacity-50 ${
                mode === "signup" ? "bg-brand-orange hover:bg-brand-orange-dark" : "bg-brand-green hover:bg-brand-green-dark"
              }`}
            >
              {mode === "signup" ? <UserPlus size={16} /> : <LockKeyhole size={16} />}
              {loading ? "Please wait…" : mode === "signup" ? "Create Free Account" : "Sign In"}
            </button>
          </form>

          {mode === "signin" ? (
            <Link
              href="/reset-password"
              className="mt-6 block text-center text-sm font-semibold text-brand-green hover:underline"
            >
              Forgot password?
            </Link>
          ) : (
            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              By creating an account you agree to receive learning updates from Ykay College. Your data is
              protected under our{" "}
              <Link href="/privacy-policy" className="font-semibold text-brand-green hover:underline">
                privacy policy
              </Link>
              .
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
