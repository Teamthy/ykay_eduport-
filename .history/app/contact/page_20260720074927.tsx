"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Mail, Phone, MessageCircle, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="bg-white min-h-screen">
        <section className="relative w-full bg-white pt-32 pb-20 md:pt-40 md:pb-28">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <p className="font-body text-xs font-bold tracking-[0.25em] uppercase text-ykay-navy/40 mb-4">GET IN TOUCH</p>
            <h1 className="font-display text-[72px] md:text-[120px] lg:text-[160px] leading-none text-ykay-navy tracking-[4px]">CONTACT US</h1>
            <p className="font-body text-base md:text-lg text-ykay-navy/50 mt-4 max-w-md mx-auto">We would love to hear from you.</p>
          </div>
        </section>

        <section className="w-full bg-white pb-20 md:pb-32">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
              <div>
                <h2 className="font-display text-[28px] md:text-[36px] text-ykay-navy mb-2 tracking-[2px]">SEND A MESSAGE</h2>
                <p className="font-body text-sm text-ykay-navy/40 mb-8">Fill out the form below and we will get back to you as soon as possible.</p>
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); alert("Form submitted! (Demo only)"); }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <input type="text" placeholder="First Name" required className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 font-body text-sm text-ykay-navy placeholder:text-ykay-navy/30 focus:outline-none focus:border-white/30 transition-colors" />
                    <input type="text" placeholder="Last Name" required className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 font-body text-sm text-ykay-navy placeholder:text-ykay-navy/30 focus:outline-none focus:border-white/30 transition-colors" />
                  </div>
                  <input type="email" placeholder="Email Address" required className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 font-body text-sm text-ykay-navy placeholder:text-ykay-navy/30 focus:outline-none focus:border-white/30 transition-colors" />
                  <input type="tel" placeholder="Phone Number (optional)" className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 font-body text-sm text-ykay-navy placeholder:text-ykay-navy/30 focus:outline-none focus:border-white/30 transition-colors" />
                  <textarea rows={4} placeholder="Your Message" required className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 font-body text-sm text-ykay-navy placeholder:text-ykay-navy/30 focus:outline-none focus:border-white/30 transition-colors resize-none" />
                  <button type="submit" className="inline-flex items-center justify-center rounded-full px-8 py-4 font-body text-sm font-semibold tracking-[0.15em] uppercase bg-white text-[#0D0D0D] hover:bg-white/90 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]">
                    Send Message
                  </button>
                </form>
              </div>

              <div>
                <h2 className="font-display text-[28px] md:text-[36px] text-ykay-navy mb-2 tracking-[2px]">REACH US</h2>
                <p className="font-body text-sm text-ykay-navy/40 mb-8">You can also reach us through any of the channels below.</p>
                <div className="space-y-4">
                  <a href="mailto:info@ykaycollege.com" className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06] transition-colors group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5"><Mail size={18} className="text-ykay-navy/50 group-hover:text-ykay-navy transition-colors" /></div>
                    <div>
                      <p className="font-body text-xs font-bold tracking-[0.15em] uppercase text-ykay-navy/30 mb-1">Email</p>
                      <p className="font-body text-sm text-ykay-navy/70 group-hover:text-ykay-navy transition-colors">info@ykaycollege.com</p>
                    </div>
                  </a>
                  <a href="tel:+2347015374411" className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06] transition-colors group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5"><Phone size={18} className="text-ykay-navy/50 group-hover:text-ykay-navy transition-colors" /></div>
                    <div>
                      <p className="font-body text-xs font-bold tracking-[0.15em] uppercase text-ykay-navy/30 mb-1">Phone</p>
                      <p className="font-body text-sm text-ykay-navy/70 group-hover:text-ykay-navy transition-colors">0701 537 4411</p>
                    </div>
                  </a>
                  <a href="https://wa.me/2347015374411" target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06] transition-colors group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5"><MessageCircle size={18} className="text-ykay-navy/50 group-hover:text-ykay-navy transition-colors" /></div>
                    <div>
                      <p className="font-body text-xs font-bold tracking-[0.15em] uppercase text-ykay-navy/30 mb-1">WhatsApp</p>
                      <p className="font-body text-sm text-ykay-navy/70 group-hover:text-ykay-navy transition-colors">0701 537 4411</p>
                    </div>
                  </a>
                  <a href="https://www.google.com/maps/search/Sango+Ota,+Ogun+State" target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06] transition-colors group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5"><MapPin size={18} className="text-ykay-navy/50 group-hover:text-ykay-navy transition-colors" /></div>
                    <div>
                      <p className="font-body text-xs font-bold tracking-[0.15em] uppercase text-ykay-navy/30 mb-1">Address</p>
                      <p className="font-body text-sm text-ykay-navy/70 group-hover:text-ykay-navy transition-colors leading-relaxed">Km 38, Lagos-Abeokuta Expressway, Sango Ota, Ogun State</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
