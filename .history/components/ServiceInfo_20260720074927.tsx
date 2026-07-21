"use client";

import { motion } from "framer-motion";
import { Clock, MapPin } from "lucide-react";

export default function ServiceInfo() {
  return (
    <section className="relative z-20 -mt-16 md:-mt-24 mx-4 md:mx-auto max-w-5xl px-6 md:px-10">
      <div className="bg-white/95 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl shadow-black/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex-1">
            <h2 className="font-display text-2xl md:text-3xl tracking-[4px] text-ykay-navy mb-1">School Hours &amp; Location</h2>
            <p className="font-body text-sm text-muted">Ykay College &amp; Leadership Academy — Sango Ota, Ogun State</p>
          </div>
          <div className="flex flex-wrap gap-6 md:gap-10 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-muted-foreground" />
              <div>
                <p className="font-body text-xs uppercase tracking-[0.15em] text-muted-foreground">School Days</p>
                <p className="font-body text-sm font-medium">Monday — Friday</p>
                <p className="font-body text-sm font-medium">7:30 AM — 2:30 PM</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-muted-foreground" />
              <a
                href="https://www.google.com/maps/search/Km+38,+Lagos-Abeokuta+Expressway,+Sango+Ota"
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-sm text-ykay-navy hover:text-ykay-navy/70 transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-white/50"
              >
                Km 38, Lagos-Abeokuta Expressway, Sango Ota
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
