"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Sun, Moon, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "./ThemeProvider";
import CommandSearch from "./CommandSearch";
import NotificationBell from "./NotificationBell";
import LiveClock from "./LiveClock";

const navLinks = [
  { label: "Home", href: "/" },
  {
    label: "About", href: "/about",
    dropdown: [
      { label: "Our Story", href: "/about" },
      { label: "Alumni", href: "/alumni" },
      { label: "Testimonials", href: "/testimonials" },
    ],
  },
  {
    label: "Academics", href: "/academics",
    dropdown: [
      { label: "Academic Programs", href: "/academics" },
      { label: "IT Education", href: "/it-education" },
    ],
  },
  { label: "Admissions", href: "/admissions" },
  { label: "Campus Life", href: "/campus-life" },
  { label: "News", href: "/news-events" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Portal", href: "/portal" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { resolvedTheme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled ? "bg-[var(--nav-bg-scrolled)] backdrop-blur-md border-b border-[var(--nav-border)] shadow-sm" : "bg-[var(--nav-bg)] border-b border-transparent"}`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="shrink-0 flex items-center gap-3">
          <Image src="/ykay-logo.png" alt="Ykay College Logo" width={50} height={50} className="h-12 w-12 object-contain" priority />
          <div className="hidden sm:block leading-tight">
            <div className="font-display text-lg md:text-xl tracking-[2px] text-[var(--nav-text)]">YKAY COLLEGE</div>
            <div className="text-[9px] tracking-widest text-brand-green font-bold">& LEADERSHIP ACADEMY</div>
          </div>
        </Link>

        <ul className="hidden lg:flex items-center gap-4 xl:gap-5">
          {navLinks.map(link => (
            <li key={link.href} className="relative"
              onMouseEnter={() => link.dropdown && setActiveDropdown(link.label)}
              onMouseLeave={() => link.dropdown && setActiveDropdown(null)}>

              {link.dropdown ? (
                <>
                  <button className="flex items-center gap-1 font-body text-xs xl:text-sm text-[var(--nav-text)] hover:text-[var(--nav-text-active)] transition-colors tracking-wide uppercase">
                    {link.label}
                    <ChevronDown size={12} className={`transition-transform ${activeDropdown === link.label ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {activeDropdown === link.label && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-4" style={{ zIndex: 60 }}>
                        <div className="w-56 rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ backgroundColor: "#0C1824" }}>
                          {link.dropdown.map(item => (
                            <Link key={item.href} href={item.href}
                              className="block px-5 py-3 font-body text-sm text-white hover:bg-brand-green/10 hover:text-brand-green transition-colors">
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <Link href={link.href} className="font-body text-xs xl:text-sm text-[var(--nav-text)] hover:text-[var(--nav-text-active)] transition-colors tracking-wide uppercase whitespace-nowrap">
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5 shrink-0">
          <LiveClock />
          <CommandSearch />
          <NotificationBell />

          <button onClick={toggleTheme} aria-label="Toggle theme"
            className="p-2 rounded-full text-[var(--nav-text)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--nav-text-active)] transition-all">
            {resolvedTheme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <Link href="/admissions"
            className="hidden md:inline-flex items-center justify-center rounded-full px-4 py-2 font-body text-[10px] font-bold tracking-[0.15em] uppercase transition-all hover:scale-[1.03] bg-[var(--btn-secondary-bg)] text-white hover:bg-[var(--btn-secondary-bg-hover)] shadow-[var(--btn-secondary-shadow)] whitespace-nowrap">
            Apply Now
          </Link>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-[var(--nav-text)]" aria-label="Menu">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden bg-[var(--nav-mobile-bg)] border-t border-[var(--nav-border)]">
            <div className="flex flex-col px-6 py-6 gap-3">
              {navLinks.map(link => (
                <div key={link.href}>
                  <Link href={link.href} onClick={() => setMobileOpen(false)}
                    className="font-body text-base text-[var(--nav-text)] hover:text-[var(--nav-text-active)] py-2 uppercase tracking-wide block">
                    {link.label}
                  </Link>
                  {link.dropdown && (
                    <div className="pl-4 space-y-2 mt-1">
                      {link.dropdown.map(item => (
                        <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                          className="font-body text-sm text-[var(--text-muted)] hover:text-[var(--accent-primary)] py-1 block">
                          — {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <Link href="/admissions" onClick={() => setMobileOpen(false)}
                className="mt-4 inline-flex items-center justify-center rounded-full px-6 py-3 font-body text-sm font-bold tracking-widest uppercase bg-[var(--btn-secondary-bg)] text-white shadow-[var(--btn-secondary-shadow)]">
                Apply Now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}