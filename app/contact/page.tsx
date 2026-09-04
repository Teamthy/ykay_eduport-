"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

import { AnimatedText } from "@/components/AnimatedText";
export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <Reveal>
          <section className="pt-32 pb-20 bg-brand-navy px-6">
            <div className="mx-auto max-w-7xl text-center">
              <h1 className="font-display text-white text-[clamp(3rem,11vw,9.5rem)]">
                <AnimatedText heavy stagger={0.034} text="CONTACT" delay={0.0} />
                <span className="text-brand-green">
                  <AnimatedText heavy stagger={0.034} text="US" delay={0.175} />
                </span>
              </h1>
              <p className="text-white/50 max-w-md mx-auto mt-4">
                We are here to answer your questions and welcome you to our campus.
              </p>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="py-20 px-6">
            <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-16">
              <div>
                <AnimatedText
                  as="h2"
                  className="font-display text-3xl text-[var(--text-primary)] mb-8"
                  text="Reach Out"
                />
                <div className="space-y-4">
                  {[
                    { icon: Mail, label: "Email", val: "info@ykaycollege.com" },
                    { icon: Phone, label: "Phone", val: "0701 537 4411" },
                    { icon: MessageCircle, label: "WhatsApp", val: "0701 537 4411" },
                    { icon: MapPin, label: "Address", val: "Sango Ota, Ogun State" },
                  ].map((i) => (
                    <div
                      key={i.label}
                      className="flex items-center gap-5 p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]"
                    >
                      <i.icon className="text-brand-green" size={20} />
                      <div>
                        <p className="text-[10px] font-bold uppercase text-brand-green tracking-widest">
                          {i.label}
                        </p>
                        <p className="text-sm text-[var(--text-primary)] font-medium">{i.val}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] p-10 rounded-[2.5rem] shadow-[var(--card-shadow)]">
                <AnimatedText
                  as="h2"
                  className="font-display text-3xl text-[var(--text-primary)] mb-8"
                  text="Send a Message"
                />
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    alert("Enquiry Sent");
                  }}
                >
                  <input
                    placeholder="Your Name"
                    className="w-full p-4 rounded-xl bg-[var(--input-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                  <input
                    placeholder="Email Address"
                    className="w-full p-4 rounded-xl bg-[var(--input-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                  <textarea
                    placeholder="How can we help?"
                    rows={4}
                    className="w-full p-4 rounded-xl bg-[var(--input-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] resize-none"
                  />
                  <button className="btn-primary w-full py-4">Send Message</button>
                </form>
              </div>
            </div>
          </section>
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
