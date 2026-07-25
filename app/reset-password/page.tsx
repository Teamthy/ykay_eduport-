"use client";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
export default function ResetPassword() {
  const token = useSearchParams().get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const url = token ? "/api/auth/password-reset/confirm" : "/api/auth/password-reset/request";
    const body = token ? { token, password } : { email };
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    setMsg(
      j.message ||
        j.error ||
        (r.ok ? "Password updated. You may now sign in." : "Unable to continue."),
    );
  };
  return (
    <main className="grid min-h-screen place-items-center bg-brand-navy p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] bg-white p-9 shadow-2xl">
        <Link
          href="/login"
          className="text-xs font-bold uppercase tracking-widest text-brand-green"
        >
          ← Sign in
        </Link>
        <h1 className="mt-6 font-display text-3xl tracking-widest text-brand-navy">
          {token ? "NEW PASSWORD" : "RESET PASSWORD"}
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          {token
            ? "Choose a password with at least 12 characters."
            : "Enter your school email and we will send a secure reset link if the account exists."}
        </p>
        {msg && <p className="mt-5 rounded-xl bg-green-50 p-3 text-sm text-green-800">{msg}</p>}
        <div className="mt-6">
          {token ? (
            <input
              required
              minLength={12}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded-xl border p-3"
            />
          ) : (
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border p-3"
            />
          )}
        </div>
        <button className="mt-5 w-full rounded-full bg-brand-green py-3 font-bold text-white">
          {token ? "Reset password" : "Send reset link"}
        </button>
      </form>
    </main>
  );
}
