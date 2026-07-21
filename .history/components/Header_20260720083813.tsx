"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Academics", href: "/academics" },
  { label: "Admissions", href: "/admissions" },
  { label: "Campus Life", href: "/campus-life" },
  { label: "Gallery", href: "/gallery" },
  { label: "News", href: "/news-events" },
  { label: "Contact", href: "/contact" },
  { label: "Portal", href: "/portal" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 border-b ${scrolled
          ? "bg-white/90 backdrop-blur-md border-neutral-100 shadow-sm"
          : "bg-white/90 backdrop-blur-md border-neutral-100/60"
        }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 md:py-4">
        <Link href="/" className="shrink-0 flex items-center gap-2">
          <span className="font-display text-xl md:text-2xl tracking-[3px] text-neutral-900 leading-none">
            YKAY COLLEGE
          </span>
        </Link>

        <ul className="hidden lg:flex items-center gap-6 xl:gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="font-body text-xs md:text-sm text-neutral-800 hover:text-neutral-500 transition-colors duration-200 tracking-wide uppercase"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <a
            href="/admissions"
            className="inline-flex items-center justify-center rounded-full px-6 py-2.5 font-body text-[11px] font-bold tracking-[0.15em] uppercase transition-all duration-300 ease-in-out cursor-pointer hover:scale-[1.05] active:scale-[0.97] bg-neutral-900 text-white hover:bg-white hover:text-neutral-900 border border-neutral-900"
          >
            Apply Now
          </a>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 text-neutral-900 cursor-pointer"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden overflow-hidden bg-white border-t border-neutral-100"
          >
            <div className="flex flex-col px-6 py-6 gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="font-body text-base text-neutral-800 hover:text-neutral-500 transition-colors py-2 uppercase tracking-wide"
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="/admissions"
                onClick={() => setMobileOpen(false)}
                className="mt-4 inline-flex items-center justify-center rounded-full px-6 py-3 font-body text-sm font-bold tracking-[0.15em] uppercase bg-neutral-900 text-white text-center"
              >
                Apply Now
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
