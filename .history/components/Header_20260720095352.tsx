"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "./ThemeProvider";

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
  const { resolvedTheme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled
          ? "bg-[var(--nav-bg-scrolled)] backdrop-blur-md border-b border-[var(--nav-border)] shadow-sm"
          : "bg-[var(--nav-bg)] border-b border-transparent"
        }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        {/* Brand — logo placeholder ready */}
        <Link href="/" className="shrink-0 flex items-center gap-2.5">
          {/* Logo will be placed here */}
          <span className="font-display text-xl md:text-2xl tracking-[3px] text-[var(--nav-text)] leading-none whitespace-nowrap">
            YKAY COLLEGE
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <ul className="hidden lg:flex items-center gap-5 xl:gap-7">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="font-body text-xs xl:text-sm text-[var(--nav-text)] hover:text-[var(--nav-text-active)] transition-colors duration-200 tracking-wide uppercase whitespace-nowrap"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right Side: Theme Toggle + Apply Button + Mobile Menu */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${resolvedTheme === "light" ? "dark" : "light"} mode`}
            className="p-2 rounded-full text-[var(--nav-text)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--nav-text-active)] transition-all duration-300 cursor-pointer"
          >
            {resolvedTheme === "light" ? (
              <Moon size={18} strokeWidth={2} />
            ) : (
              <Sun size={18} strokeWidth={2} />
            )}
          </button>

          {/* Apply Now Button — Desktop */}
          <a
            href="/admissions"
            className="hidden md:inline-flex items-center justify-center rounded-full px-5 py-2.5 font-body text-[11px] font-bold tracking-[0.15em] uppercase transition-all duration-300 ease-in-out cursor-pointer hover:scale-[1.03] active:scale-[0.97] bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] hover:bg-[var(--btn-secondary-bg-hover)] shadow-[var(--btn-secondary-shadow)] whitespace-nowrap"
          >
            Apply Now
          </a>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-[var(--nav-text)] cursor-pointer"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden overflow-hidden bg-[var(--nav-mobile-bg)] border-t border-[var(--nav-border)]"
          >
            <div className="flex flex-col px-6 py-6 gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="font-body text-base text-[var(--nav-text)] hover:text-[var(--nav-text-active)] transition-colors py-2 uppercase tracking-wide"
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="/admissions"
                onClick={() => setMobileOpen(false)}
                className="mt-4 inline-flex items-center justify-center rounded-full px-6 py-3 font-body text-sm font-bold tracking-[0.15em] uppercase bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] text-center shadow-[var(--btn-secondary-shadow)]"
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