"use client";

import { motion } from "framer-motion";

export default function About() {
  return (
    <section id="about" className="w-full bg-white pt-16 md:pt-24 pb-8 md:pb-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="font-body text-[10px] font-bold tracking-[0.25em] uppercase text-white/30 mb-4 block">
              ABOUT US
            </span>
            <h2 className="font-display text-[32px] md:text-[48px] lg:text-[56px] leading-[0.95] tracking-[2px] md:tracking-[4px] text-ykay-navy mb-8">
              RAISING LEADERS THROUGH EXCELLENCE IN EDUCATION
            </h2>
            <p className="font-body text-base md:text-lg text-ykay-navy/70 leading-relaxed mb-4">
              Ykay College & Leadership Academy is a premium day secondary school located in Sango Ota, Ogun State. Established with a clear vision: to raise role models driven by excellence, leadership, and character, the school provides a rigorous NERDC-aligned curriculum for students in JSS1 through SS3.
            </p>
            <p className="font-body text-sm text-muted-foreground leading-relaxed mb-6">
              Our approach combines academic rigor with leadership development, digital literacy, and moral formation. We believe education is the foundation of national transformation — and our students are being prepared to lead that transformation.
            </p>
            <div className="flex flex-wrap gap-3">
              {["NERDC Aligned", "JSS1 — SS3", "Day School", "Digital Learning", "Leadership Training", "WAEC / BECE Ready"].map((tag) => (
                <span key={tag} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-[0.1em] uppercase text-white/50">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Images */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
                <img
                  src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80"
                  alt="Modern classroom at Ykay College"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl shadow-black/30 mt-12">
                <img
                  src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80"
                  alt="Students engaged in learning"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>
            <div className="mt-6 bg-card-bg border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="font-display text-xl tracking-[2px] text-white mb-2">Dr. Adeyemi Ogunlade</h3>
              <p className="font-body text-xs text-muted-foreground tracking-[0.2em] uppercase mb-3">Director &amp; Proprietor — Ykay College</p>
              <blockquote className="font-body text-sm text-ykay-navy/70 leading-relaxed italic">
                "Our mission is not just to teach — it is to build leaders who will transform their communities, their nation, and the world."
              </blockquote>
            </div>
          </motion.div>
        </div>

        {/* Mission / Vision / Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-16 md:mt-24 grid md:grid-cols-3 gap-6"
        >
          {[
            {
              title: "Our Vision",
              body: "To be the leading secondary school in Ogun State, recognized for academic excellence, digital innovation, and the development of ethical, future-ready leaders.",
            },
            {
              title: "Our Mission",
              body: "To provide a rigorous, technology-enhanced education that develops the intellectual, moral, and leadership capacity of every student — preparing them for success in higher education, professional life, and citizenship.",
            },
            {
              title: "Core Values",
              body: "Excellence in all things. Integrity without compromise. Leadership through service. Innovation through digital literacy. Community through collaboration.",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-[2rem] bg-card-bg border border-white/5 p-8 md:p-10 hover:border-white/15 transition-all duration-300 hover:-translate-y-1">
              <h3 className="font-display text-xl md:text-2xl tracking-[2px] text-white mb-4">{card.title}</h3>
              <p className="font-body text-sm text-white/50 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
