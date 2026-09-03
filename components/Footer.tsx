"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUp, Phone, Mail, MapPin, Facebook, Instagram } from "lucide-react";

const linkGroups = {
  School: [
    { label: "About", href: "/about" },

    { label: "Academics", href: "/academics" },
    { label: "Campus Life", href: "/campus-life" },
  ],
  Community: [
    { label: "Alumni", href: "/alumni" },
    { label: "Testimonials", href: "/testimonials" },
    { label: "News & Events", href: "/news-events" },
    { label: "Gallery", href: "/gallery" },
    { label: "Ykay Virtual", href: "/virtual" },
  ],
  "Get Started": [
    { label: "Admissions", href: "/admissions" },
    { label: "Portal", href: "/portal" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  Resources: [
    { label: "FAQ", href: "/faq" },
    { label: "What's New", href: "/whats-new" },
    { label: "Privacy Policy", href: "/privacy-policy" },
  ],
};

export default function Footer() {
  return (
    <footer className="w-full bg-[var(--footer-bg)] border-t border-[var(--footer-border)] pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center">
                <Image
                  src="/ykay-logo.png"
                  alt="Ykay College Logo"
                  width={60}
                  height={60}
                  className="object-contain"
                />
              </div>
              <div>
                <h2 className="font-display text-2xl tracking-[3px] text-white">YKAY COLLEGE</h2>
                <p className="text-[10px] font-bold tracking-widest uppercase text-brand-green">
                  & LEADERSHIP ACADEMY
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--footer-text-body)] leading-relaxed mb-6">
              A premium day secondary school in Sango Ota, Ogun State. Raising future leaders
              through excellence in education.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-brand-green text-white flex items-center justify-center transition-colors"
              >
                <Facebook size={16} />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-brand-green text-white flex items-center justify-center transition-colors"
              >
                <Instagram size={16} />
              </a>
            </div>
          </div>

          {Object.entries(linkGroups).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-display text-sm text-white mb-4 tracking-widest">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--footer-text-body)] hover:text-brand-green transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 py-8 border-t border-[var(--footer-border)]">
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-brand-green shrink-0 mt-0.5" />
            <div>
              <div className="text-xs uppercase tracking-widest text-white/40 mb-1">Address</div>
              <div className="text-sm text-white/80">
                Km 38, Lagos-Abeokuta Expressway, Sango Ota, Ogun State
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone size={18} className="text-brand-green shrink-0 mt-0.5" />
            <div>
              <div className="text-xs uppercase tracking-widest text-white/40 mb-1">Phone</div>
              <a href="tel:+2347015374411" className="text-sm text-white/80 hover:text-brand-green">
                0701 537 4411
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail size={18} className="text-brand-green shrink-0 mt-0.5" />
            <div>
              <div className="text-xs uppercase tracking-widest text-white/40 mb-1">Email</div>
              <a
                href="mailto:info@ykaycollege.com"
                className="text-sm text-white/80 hover:text-brand-green"
              >
                info@ykaycollege.com
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-[var(--footer-border)]">
          <p className="text-xs text-[var(--footer-text-body)]">
            © {new Date().getFullYear()} Ykay Training College & Leadership Academy. All rights
            reserved.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-white/40 hover:text-brand-green transition-colors"
          >
            Back to Top <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
}
