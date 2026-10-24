"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Sun, Moon, ChevronDown } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import LiveClock from "./LiveClock";
import dynamic from "next/dynamic";
import { afterLoad } from "@/lib/after-lcp";

// Interactive header widgets (search palette, notifications). No visitor
// needs them in the first viewport, so they load after the LCP paint —
// their chunks stay off the critical path of every page's first paint.
const CommandSearch = dynamic(
  afterLoad(() => import("./CommandSearch")),
  { ssr: false },
);
const NotificationBell = dynamic(
  afterLoad(() => import("./NotificationBell")),
  { ssr: false },
);

const navLinks = [
  { label: "Home", href: "/" },
  {
    label: "About",
    href: "/about",
    dropdown: [
      { label: "Our Story", href: "/about" },
      { label: "Alumni", href: "/alumni" },
      { label: "Testimonials", href: "/testimonials" },
    ],
  },
  {
    label: "Academics",
    href: "/academics",
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
  { label: "CBT", href: "/login?next=/student/exams" },
  { label: "Virtual", href: "/virtual" },
  { label: "Portal", href: "/portal" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { resolvedTheme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled ? "bg-[var(--nav-bg-scrolled)] backdrop-blur-md border-b border-[var(--nav-border)] shadow-sm" : "bg-[var(--nav-bg)] border-b border-transparent"}`}
    >
      <nav className="mx-auto flex w-full items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3 md:px-10">
        <Link href="/" className="shrink-0 flex items-center gap-3">
          <Image
            src="/ykay-logo.png"
            alt="Ykay College Logo"
            width={50}
            height={50}
            className="h-12 w-12 object-contain"
            priority
          />
          <span className="font-display text-sm tracking-[1px] text-[var(--nav-text)] sm:hidden">
            YKAY
          </span>
          <div className="hidden leading-tight sm:block">
            <div className="font-display text-lg tracking-[2px] text-[var(--nav-text)] md:text-xl">
              YKAY COLLEGE
            </div>
            <div className="text-[9px] font-bold tracking-widest text-brand-green">
              & LEADERSHIP ACADEMY
            </div>
          </div>
        </Link>

        <ul className="hidden lg:flex items-center gap-4 xl:gap-5">
          {navLinks.map((link) => (
            <li
              key={link.href}
              className="relative"
              onMouseEnter={() => link.dropdown && setActiveDropdown(link.label)}
              onMouseLeave={() => link.dropdown && setActiveDropdown(null)}
            >
              {link.dropdown ? (
                <>
                  <button
                    type="button"
                    aria-expanded={activeDropdown === link.label}
                    onClick={() =>
                      setActiveDropdown((current) => (current === link.label ? null : link.label))
                    }
                    className="flex items-center gap-1 font-body text-xs uppercase tracking-wide text-[var(--nav-text)] transition-colors hover:text-[var(--nav-text-active)] xl:text-sm"
                  >
                    {link.label}
                    <ChevronDown
                      size={12}
                      className={`transition-transform ${activeDropdown === link.label ? "rotate-180" : ""}`}
                    />
                  </button>
                  {activeDropdown === link.label && (
                    <div
                      className="anim-slide-down absolute top-full left-1/2 -translate-x-1/2 pt-4"
                      style={{ zIndex: 60 }}
                    >
                      <div className="w-56 overflow-hidden rounded-2xl border border-white/10 bg-brand-navy shadow-2xl">
                        {link.dropdown.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="block px-5 py-3 font-body text-sm text-white hover:bg-brand-green/10 hover:text-brand-green transition-colors"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={link.href}
                  className="font-body text-xs xl:text-sm text-[var(--nav-text)] hover:text-[var(--nav-text-active)] transition-colors tracking-wide uppercase whitespace-nowrap"
                >
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
          <span className="hidden md:inline-flex">
            <LiveClock />
          </span>
          <CommandSearch />
          <NotificationBell />

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--nav-text)] transition-all hover:bg-[var(--surface-card-hover)] hover:text-[var(--nav-text-active)]"
          >
            {resolvedTheme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <Link
            href="/admissions"
            className="hidden md:inline-flex items-center justify-center rounded-full px-4 py-2 font-body text-[10px] font-bold tracking-[0.15em] uppercase transition-all hover:scale-[1.03] bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] hover:bg-[var(--btn-secondary-bg-hover)] shadow-[var(--btn-secondary-shadow)] whitespace-nowrap"
          >
            Apply Now
          </Link>

          <button
            type="button"
            onClick={() => {
              setMobileOpen((open) => !open);
              setMobileExpandedGroup(null);
            }}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--nav-text)] transition hover:bg-[var(--surface-card-hover)] hover:text-[var(--nav-text-active)] lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </nav>

      <div
        id="mobile-navigation"
        hidden={!mobileOpen}
        className="anim-slide-down max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-[var(--nav-border)] bg-[var(--nav-mobile-bg)] lg:hidden"
      >
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-3xl flex-col px-4 py-3 sm:px-6 sm:py-5"
        >
          {navLinks.map((link) => (
            <div key={link.href} className="border-b border-[var(--nav-border)] last:border-b-0">
              {link.dropdown ? (
                <>
                  <div className="flex items-center gap-2">
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex min-h-12 flex-1 items-center py-2 font-body text-base font-semibold uppercase tracking-wide text-[var(--nav-text)] transition-colors hover:text-[var(--nav-text-active)]"
                    >
                      {link.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        setMobileExpandedGroup((current) =>
                          current === link.label ? null : link.label,
                        )
                      }
                      aria-expanded={mobileExpandedGroup === link.label}
                      aria-controls={`mobile-group-${link.label.toLowerCase()}`}
                      aria-label={`${mobileExpandedGroup === link.label ? "Hide" : "Show"} ${link.label} links`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--nav-text)] hover:bg-[var(--surface-card-hover)]"
                    >
                      <ChevronDown
                        size={18}
                        className={`transition-transform ${mobileExpandedGroup === link.label ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                  <div
                    id={`mobile-group-${link.label.toLowerCase()}`}
                    hidden={mobileExpandedGroup !== link.label}
                    className="mb-3 ml-3 border-l-2 border-brand-green/40 pl-4"
                  >
                    {link.dropdown.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex min-h-11 items-center py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-accent)]"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-12 items-center py-2 font-body text-base font-semibold uppercase tracking-wide text-[var(--nav-text)] transition-colors hover:text-[var(--nav-text-active)]"
                >
                  {link.label}
                </Link>
              )}
            </div>
          ))}
          <Link
            href="/admissions"
            onClick={() => setMobileOpen(false)}
            className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--btn-secondary-bg)] px-6 py-3 font-body text-sm font-bold uppercase tracking-widest text-[var(--btn-secondary-text)] shadow-[var(--btn-secondary-shadow)] transition hover:bg-[var(--btn-secondary-bg-hover)]"
          >
            Apply Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
