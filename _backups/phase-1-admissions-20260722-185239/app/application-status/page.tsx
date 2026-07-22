"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search } from "lucide-react";

export default function StatusPage() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.currentTarget.querySelector("input") as HTMLInputElement)?.value;
    if (input) {
      window.location.href = `/api/admissions/status?id=${encodeURIComponent(input)}`;
    }
  };

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="relative w-full bg-[var(--bg-primary)] pt-32 pb-12 md:pt-40 md:pb-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <p className="font-body text-xs font-bold tracking-[0.25em] uppercase text-[var(--accent-primary)] mb-4">
              APPLICATION STATUS
            </p>
            <h1 className="font-display text-[56px] md:text-[100px] lg:text-[130px] leading-[0.85] tracking-[4px] text-[var(--text-primary)] mb-6">
              CHECK STATUS
            </h1>
            <p className="font-body text-base md:text-lg text-[var(--text-secondary)] max-w-lg mx-auto">
              Enter your Application ID to view the current status of your admission application.
            </p>
          </div>
        </section>

        <section className="w-full bg-[var(--bg-primary)] pb-20 md:pb-32">
          <div className="mx-auto max-w-md px-6">
            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] p-8"
            >
              <label
                htmlFor="appId"
                className="block font-body text-xs font-bold tracking-[0.25em] uppercase text-[var(--input-label)]"
              >
                Application ID
              </label>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                />
                <input
                  id="appId"
                  name="appId"
                  type="text"
                  placeholder="YKC-APP-2025-XXXX"
                  className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] pl-11 pr-6 py-4 font-body text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--input-border-focus)]/20 transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full px-8 py-4 font-body text-sm font-bold tracking-[0.15em] uppercase bg-brand-green text-white hover:bg-brand-green-dark transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-brand-green/30"
              >
                Check Status
              </button>
              <p className="font-body text-xs text-[var(--text-muted)] text-center pt-2">
                Example: YKC-APP-2025-0047
              </p>
            </form>

            <div className="mt-6 rounded-2xl bg-[var(--surface-disabled)] border border-[var(--border-subtle)] p-5">
              <p className="font-body text-xs text-[var(--text-secondary)] leading-relaxed">
                <strong className="text-[var(--text-primary)]">Lost your Application ID?</strong>{" "}
                Contact us at{" "}
                <a
                  href="mailto:info@ykaycollege.com"
                  className="text-[var(--accent-primary)] font-semibold hover:underline"
                >
                  info@ykaycollege.com
                </a>{" "}
                or call{" "}
                <a
                  href="tel:+2347015374411"
                  className="text-[var(--accent-primary)] font-semibold hover:underline"
                >
                  0701 537 4411
                </a>.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
