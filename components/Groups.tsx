"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { AnimatedText } from "@/components/AnimatedText";
const clubs = [
  {
    title: "Science & Technology Club",
    subtitle: "STEM Leadership",
    desc: "A community of students passionate about science, engineering, and technology. Through hands-on experiments, robotics, coding challenges, and science fairs, members develop the skills to lead Nigeria's future innovation economy.",
    image:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80",
    href: "/campus-life",
  },
  {
    title: "Debate & Public Speaking",
    subtitle: "Leadership & Communication",
    desc: "Students train in structured debate, persuasive speaking, and critical reasoning. Our debaters compete at regional and national levels, developing the communication skills essential for leadership in any field.",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
    href: "/campus-life",
  },
  {
    title: "Sports & Athletics",
    subtitle: "Physical Excellence",
    desc: "Football, basketball, athletics, table tennis, volleyball — our sports program builds discipline, teamwork, and resilience. Students compete in inter-house tournaments and external competitions across Ogun State.",
    image:
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80",
    href: "/campus-life",
  },
  {
    title: "Music & Creative Arts",
    subtitle: "Arts & Expression",
    desc: "A vibrant community for students passionate about music, drama, visual arts, and creative writing. Students prepare for NAFDAC arts competitions, school productions, and cultural festivals throughout the year.",
    image:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
    href: "/campus-life",
  },
  {
    title: "Leadership Council",
    subtitle: "Student Governance",
    desc: "An elected student government that represents student interests, organizes school-wide events, promotes positive school culture, and develops leadership capacity in a structured, mentored environment.",
    image:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
    href: "/campus-life",
  },
];

export default function Clubs() {
  return (
    <section id="clubs" className="w-full bg-[#0D0D0D] pt-12 md:pt-16 pb-16 md:pb-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12 md:mb-16">
          <div>
            <span className="font-body text-[10px] font-bold tracking-[0.25em] uppercase text-white/30 mb-3 block">
              CLUBS &amp; SOCIETIES
            </span>
            <AnimatedText
              as="h2"
              heavy
              stagger={0.03}
              className="font-display text-[clamp(2.25rem,6.5vw,5.5rem)] leading-[0.86] tracking-[-0.015em] text-white"
              text="CAMPUS LIFE"
            />
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          {clubs.map((club, i) => (
            <motion.a
              key={club.title}
              href={club.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group flex flex-col md:flex-row gap-6 md:gap-10 rounded-[2rem] overflow-hidden bg-card-bg border border-white/5 hover:border-white/15 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="relative w-full md:w-[320px] lg:w-[380px] shrink-0 aspect-[16/10] md:aspect-auto md:h-[260px] overflow-hidden">
                <img
                  src={club.image}
                  alt={club.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0D0D0D]/60 md:bg-gradient-to-t md:from-transparent md:to-[#0D0D0D]/30" />
              </div>
              <div className="p-6 md:p-8 md:py-8 flex flex-col justify-center">
                <span className="font-body text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2">
                  {club.subtitle}
                </span>
                <h3 className="font-display text-[clamp(1.5rem,2.4vw,2.25rem)] leading-[0.95] tracking-[-0.01em] text-white mb-3 group-hover:text-white/90 transition-colors">
                  {club.title}
                </h3>
                <p className="font-body text-sm text-white/50 leading-relaxed mb-5 max-w-xl">
                  {club.desc}
                </p>
                <span className="inline-flex items-center gap-2 font-body text-xs font-bold tracking-[0.15em] uppercase text-white/70 group-hover:text-white transition-colors w-fit">
                  Learn More{" "}
                  <ArrowRight
                    size={12}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
