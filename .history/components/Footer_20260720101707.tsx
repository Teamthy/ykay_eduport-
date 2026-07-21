"use client";

import Link from "next/link";
import { ArrowUp } from "lucide-react";

const footerLinks = [
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

export default function Footer() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="w-full bg-[var(--footer-bg)] border-t border-[var(--footer-border)] pt-16 md:pt-20 pb-8">
      <div className="mx-auto max-w-7xl px-6">
        {/* Top row — Brand + nav */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 mb-12">
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-3">
              {/* Logo placeholder — replace when you provide */}
              <h2 className="font-display text-3xl md:text-4xl tracking-[4px] text-[var(--footer-text-heading)] mb-0">
                YKAY COLLEGE
              </h2>
            </div>
            <p className="font-body text-xs font-bold tracking-[0.2em] uppercase text-brand-green mb-4">
              &amp; LEADERSHIP ACADEMY
            </p>
            <p className="font-body text-sm text-[var(--footer-text-body)] leading-relaxed">
              A premium day secondary school in Sango Ota, Ogun State, raising role models through excellence in education, leadership, and character development. JSS1 — SS3.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-3 md:justify-end md:max-w-md">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-body text-xs font-bold tracking-[0.15em] uppercase text-[var(--footer-text-link)] hover:text-[var(--footer-text-hover)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Middle — 3 columns */}
        <div className="grid md:grid-cols-3 gap-8 md:gap-10 border-t border-[var(--footer-border)] pt-10">
          <div>
            <h4 className="font-display text-sm text-[var(--footer-text-heading)] mb-3 tracking-[2px]">
              LOCATION
            </h4>
            <div className="space-y-1 text-sm text-[var(--footer-text-body)]">
              <p className="font-body leading-relaxed">Km 38, Lagos-Abeokuta Expressway</p>
              <p className="font-body leading-relaxed">No 1 Iwalewa Street</p>
              <p className="font-body leading-relaxed">Opposite Matrix Filling Station</p>
              <p className="font-body leading-relaxed">Beside Alishiba Junction, Sango Ota, Ogun State</p>
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm text-[var(--footer-text-heading)] mb-3 tracking-[2px]">
              CONTACT
            </h4>
            <div className="space-y-1 text-sm text-[var(--footer-text-body)]">
              <p className="font-body leading-relaxed">
                Phone:{" "}
                <a href="tel:+2347015374411" className="hover:text-[var(--footer-text-hover)] transition-colors">
                  0701 537 4411
                </a>
              </p>
              <p className="font-body leading-relaxed">
                Email:{" "}
                <a href="mailto:info@ykaycollege.com" className="hover:text-[var(--footer-text-hover)] transition-colors">
                  info@ykaycollege.com
                </a>
              </p>
              <p className="font-body leading-relaxed">
                Web:{" "}
                <a
                  href="https://ykaycollege.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--footer-text-hover)] transition-colors"
                >
                  ykaycollege.com
                </a>
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm text-[var(--footer-text-heading)] mb-3 tracking-[2px]">
              HOURS
            </h4>
            <div className="space-y-1 text-sm text-[var(--footer-text-body)]">
              <p className="font-body leading-relaxed">Monday — Friday: 7:30 AM — 2:30 PM</p>
              <p className="font-body leading-relaxed">Admissions: Mon — Fri, 9:00 AM — 4:00 PM</p>
              <p className="font-body leading-relaxed">Portal Support: 24/7 (Online)</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-[var(--footer-border)] pt-6 mt-10">
          <p className="font-body text-[11px] text-[var(--footer-text-body)] tracking-[0.1em]">
            © {new Date().getFullYear()} YKAY COLLEGE &amp; LEADERSHIP ACADEMY. ALL RIGHTS RESERVED.
          </p>
          <button
            onClick={scrollToTop}
            aria-label="Back to top"
            className="inline-flex items-center gap-2 font-body text-xs font-bold tracking-[0.15em] uppercase text-[var(--footer-text-link)] hover:text-[var(--footer-text-hover)] transition-colors"
          >
            Back to Top <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
}