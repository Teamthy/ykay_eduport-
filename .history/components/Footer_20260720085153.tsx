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
    <footer className="w-full bg-[#0a0a0a] border-t border-white/5 pt-16 md:pt-20 pb-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <img src="/logo-ykay.svg" alt="Ykay College Logo" className="h-10 w-auto brightness-0 invert filter" />
              <h2 className="font-display text-3xl md:text-4xl tracking-[4px] text-white mb-0">YKAY COLLEGE</h2>
            </div>
            <p className="font-body text-xs font-bold tracking-[0.2em] uppercase text-white/30 mb-4">
              &amp; LEADERSHIP ACADEMY
            </p>
            <p className="font-body text-sm text-white/30 max-w-sm leading-relaxed">
              A premium day secondary school in Sango Ota, Ogun State, raising role models through excellence in education, leadership, and character development. JSS1 — SS3.
            </p>
          </div>
          <nav className="flex flex-wrap gap-6 md:gap-10 md:justify-end">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-body text-xs font-bold tracking-[0.15em] uppercase text-white/30 hover:text-white/70 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-10 text-white/20 text-xs border-t border-white/5 pt-8">
          <div>
            <h4 className="font-display text-sm text-white/60 mb-2 tracking-[2px]">LOCATION</h4>
            <p className="font-body leading-relaxed">Km 38, Lagos-Abeokuta Expressway</p>
            <p className="font-body leading-relaxed">No 1 Iwalewa Street</p>
            <p className="font-body leading-relaxed">Opposite Matrix Filling Station</p>
            <p className="font-body leading-relaxed">Beside Alishiba Junction, Sango Ota, Ogun State</p>
          </div>
          <div>
            <h4 className="font-display text-sm text-white/60 mb-2 tracking-[2px]">CONTACT</h4>
            <p className="font-body leading-relaxed">Phone: 0701 537 4411</p>
            <p className="font-body leading-relaxed">Email: <a href="mailto:info@ykaycollege.com" className="hover:text-white/50 transition-colors">info@ykaycollege.com</a></p>
            <p className="font-body leading-relaxed">Web: <a href="https://ykaycollege.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">ykaycollege.com</a></p>
          </div>
          <div>
            <h4 className="font-display text-sm text-white/60 mb-2 tracking-[2px]">HOURS</h4>
            <p className="font-body leading-relaxed">Monday — Friday: 7:30 AM — 2:30 PM</p>
            <p className="font-body leading-relaxed">Admissions: Monday — Friday, 9:00 AM — 4:00 PM</p>
            <p className="font-body leading-relaxed">Portal Support: 24/7 (Online)</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-white/5 pt-6 mt-6">
          <p className="font-body text-[10px] text-white/15 tracking-[0.1em]">
            © {new Date().getFullYear()} YKAY COLLEGE &amp; LEADERSHIP ACADEMY. ALL RIGHTS RESERVED.
          </p>
          <button
            onClick={scrollToTop}
            aria-label="Back to top"
            className="inline-flex items-center gap-2 font-body text-xs font-bold tracking-[0.15em] uppercase text-white/20 hover:text-white/60 transition-colors"
          >
            Back to Top <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
}
