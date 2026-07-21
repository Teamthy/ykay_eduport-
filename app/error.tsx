"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <main className="bg-[var(--bg-primary)] min-h-screen flex items-center justify-center px-6 theme-transition">
      <div className="max-w-2xl text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={40} />
        </div>
        <h1 className="font-display text-3xl md:text-5xl text-[var(--text-primary)] mb-6 tracking-[2px]">SOMETHING WENT WRONG</h1>
        <p className="text-[var(--text-secondary)] mb-10 max-w-md mx-auto">
          An unexpected error occurred. Our team has been notified. You can try again or return home.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={reset} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-green text-white font-bold text-sm hover:bg-brand-green-dark transition-all shadow-lg">
            <RefreshCw size={16} /> Try Again
          </button>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--border-default)] text-[var(--text-primary)] font-bold text-sm hover:bg-[var(--surface-disabled)] transition-all">
            <Home size={16} /> Back to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
