"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Users } from "lucide-react";

export default function ParentLoginPage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen flex items-center justify-center px-6 py-24 theme-transition">
        <div className="w-full max-w-md rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-10 md:p-12 shadow-[var(--card-shadow-hover)]">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/10 flex items-center justify-center mx-auto mb-4">
              <Users size={26} className="text-[var(--accent-primary)]" />
            </div>
            <h2 className="font-display text-2xl tracking-[2px] text-[var(--text-primary)] mb-2">
              Parent Portal
            </h2>
            <p className="font-body text-sm text-[var(--text-muted)]">
              Monitor grades, attendance, and fees
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Login endpoint: /api/auth/login");
            }}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="pemail"
                className="block font-body text-xs font-bold tracking-[0.15em] uppercase text-[var(--input-label)] mb-2"
              >
                Email Address
              </label>
              <input
                id="pemail"
                type="email"
                placeholder="parent@example.com"
                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-5 py-3.5 font-body text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--input-border-focus)]/20 transition-all"
              />
            </div>
            <div>
              <label
                htmlFor="ppass"
                className="block font-body text-xs font-bold tracking-[0.15em] uppercase text-[var(--input-label)] mb-2"
              >
                Password
              </label>
              <input
                id="ppass"
                type="password"
                placeholder="Enter your password"
                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-5 py-3.5 font-body text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--input-border-focus)]/20 transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full px-8 py-4 font-body text-sm font-bold tracking-[0.15em] uppercase bg-brand-green text-white hover:bg-brand-green-dark transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-brand-green/30"
            >
              Access Portal
            </button>
          </form>
          <div className="mt-6 text-center">
            <a
              href="/forgot-password"
              className="font-body text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors underline underline-offset-4"
            >
              Forgot your password?
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
