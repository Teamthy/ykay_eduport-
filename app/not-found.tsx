import Link from "next/link";
import { Home, ArrowLeft, MessageCircle } from "lucide-react";

export default function NotFound() {
  return (
    <main className="bg-[var(--bg-primary)] min-h-screen flex items-center justify-center px-6 theme-transition">
      <div className="max-w-2xl text-center">
        <div className="font-display text-[120px] md:text-[200px] text-brand-green leading-none mb-4">404</div>
        <h1 className="font-display text-3xl md:text-5xl text-[var(--text-primary)] mb-6 tracking-[2px]">PAGE NOT FOUND</h1>
        <p className="text-[var(--text-secondary)] mb-10 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-green text-white font-bold text-sm hover:bg-brand-green-dark transition-all shadow-lg">
            <Home size={16} /> Back to Homepage
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--border-default)] text-[var(--text-primary)] font-bold text-sm hover:bg-[var(--surface-disabled)] transition-all">
            <MessageCircle size={16} /> Contact Support
          </Link>
        </div>
      </div>
    </main>
  );
}
