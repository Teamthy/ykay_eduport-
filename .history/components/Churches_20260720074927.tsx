"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const departments = [
  { name: "Junior Secondary (JSS1 — JSS3)", desc: "Foundational education with BECE preparation and digital literacy.", href: "/academics" },
  { name: "Senior Secondary — Science", desc: "Physics, Chemistry, Biology, Mathematics, Technical Drawing.", href: "/academics" },
  { name: "Senior Secondary — Arts", desc: "Literature, Government, History, Religious Studies, Fine Arts.", href: "/academics" },
  { name: "Senior Secondary — Commercial", desc: "Economics, Commerce, Accounting, Business Studies.", href: "/academics" },
  { name: "STEM & Digital Learning", desc: "Computer science, robotics programs, and technology-enhanced instruction.", href: "/academics" },
  { name: "Sports & Physical Education", desc: "Football, basketball, athletics, table tennis, and inter-house competitions.", href: "/campus-life" },
  { name: "Library & E-Resources", desc: "Curated digital textbooks, past exam archives, and study materials.", href: "/campus-life" },
  { name: "Science Laboratories", desc: "Fully equipped biology, chemistry, and physics laboratories.", href: "/campus-life" },
  { name: "Leadership & Character", desc: "Ethics, public speaking, debate, and student government programs.", href: "/campus-life" },
];

export default function Departments() {
  return (
    <section id="departments" className="w-full bg-[#0D0D0D] pt-16 md:pt-24 pb-16 md:pb-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl mb-12 md:mb-16">
          <span className="font-body text-[10px] font-bold tracking-[0.25em] uppercase text-white/30 mb-3 block">
            DEPARTMENTS &amp; PROGRAMMES
          </span>
          <h2 className="font-display text-[32px] md:text-[48px] lg:text-[56px] leading-[0.9] tracking-[2px] md:tracking-[4px] text-white mb-4">
            A COMPLETE EDUCATIONAL ECOSYSTEM
          </h2>
          <p className="font-body text-sm md:text-base text-white/50 leading-relaxed">
            From Junior Secondary through Senior Secondary, Ykay College offers rigorous academic tracks, world-class facilities, and leadership training designed to prepare students for university and life.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {departments.map((dept, i) => (
            <motion.a
              key={dept.name}
              href={dept.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="group flex items-center justify-between rounded-2xl bg-card-bg border border-white/5 p-6 hover:border-white/15 hover:bg-white/[0.05] transition-all duration-300"
            >
              <div>
                <h3 className="font-display text-lg md:text-xl tracking-[2px] text-white mb-1 group-hover:text-white/90 transition-colors">
                  {dept.name}
                </h3>
                <p className="font-body text-xs text-white/30 tracking-wide">{dept.desc}</p>
              </div>
              <ArrowUpRight size={18} className="text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
