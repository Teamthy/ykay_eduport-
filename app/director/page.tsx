import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Quote, GraduationCap, Award, Users, Mail, Phone } from "lucide-react";

export default function DirectorPage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        {/* Hero */}
        <section className="pt-24 pb-16 bg-brand-navy px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 bg-gradient-to-l from-brand-green to-transparent" />
          <div className="mx-auto max-w-7xl relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold tracking-[0.3em] uppercase mb-6">
                Leadership · Vision · Excellence
              </span>
              <h1 className="font-display text-5xl md:text-7xl text-white leading-[0.95] mb-6">
                FROM THE <br/><span className="text-brand-green">DIRECTOR'S</span> DESK
              </h1>
              <p className="text-white/70 text-lg font-body italic border-l-4 border-brand-green pl-6 mb-8">
                &ldquo;Education is not the filling of a pail, but the lighting of a fire. At Ykay, we light fires that illuminate the future.&rdquo;
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="mailto:director@ykaycollege.com" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-green text-white text-sm font-bold hover:bg-brand-green-dark transition-all">
                  <Mail size={14} /> Contact Director
                </a>
                <Link href="/contact" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-all">
                  <Phone size={14} /> Book Visit
                </Link>
              </div>
            </div>

            {/* Director photo with green offset accent */}
            <div className="relative group max-w-md mx-auto lg:ml-auto">
              <div className="absolute inset-0 bg-brand-green rounded-[3rem] rotate-3 group-hover:rotate-0 transition-transform duration-500" />
              <div className="relative z-10 rounded-[3rem] overflow-hidden border-4 border-brand-navy shadow-2xl">
                <Image
                  src="/director-adeyinka.jpg"
                  alt="Mr. Adeyinka Oladimeji, MSc — Director"
                  width={600}
                  height={800}
                  className="w-full h-auto object-cover"
                  priority
                />
              </div>
              {/* Name plate */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white rounded-2xl px-6 py-4 shadow-2xl text-center min-w-[280px]">
                <div className="font-display text-lg tracking-widest text-brand-navy">MR. ADEYINKA OLADIMEJI</div>
                <div className="text-xs text-brand-green font-bold tracking-widest uppercase mt-1">MSc · Director & Proprietor</div>
              </div>
            </div>
          </div>
        </section>

        {/* Credentials Bar */}
        <section className="py-8 bg-[var(--section-bg-alt)] border-y border-[var(--border-subtle)] px-6">
          <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: GraduationCap, label: "MSc Holder", value: "Educational Leadership" },
              { icon: Award, label: "13+ Years", value: "In Education" },
              { icon: Users, label: "1,200+", value: "Students Impacted" },
              { icon: Quote, label: "Since 2012", value: "Ykay Founder" },
            ].map(item => (
              <div key={item.label} className="text-center">
                <item.icon className="mx-auto text-brand-green mb-2" size={24} />
                <div className="font-display text-lg text-[var(--text-primary)]">{item.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Speech */}
        <section className="py-24 px-6">
          <div className="mx-auto max-w-4xl">
            <div className="flex justify-center mb-12">
              <Quote size={48} className="text-brand-green opacity-20" />
            </div>
            <div className="space-y-8 text-[var(--text-secondary)] font-body text-lg leading-relaxed">
              <p className="first-letter:text-5xl first-letter:font-display first-letter:text-brand-green first-letter:mr-3 first-letter:float-left">
                Welcome to Ykay Training College & Leadership Academy. It is my profound honor to lead an institution that prioritizes character just as highly as academic brilliance. We believe that a student without a moral compass is like a ship without a rudder.
              </p>
              <p>
                My journey in education began with a simple conviction: every Nigerian child deserves world-class education delivered with integrity, discipline, and love. Since founding Ykay in 2012, we have grown from a small class of 48 students to a thriving community that spans JSS1 through SS3 — with graduates now studying at top universities across Nigeria and beyond.
              </p>
              <p>
                Our vision has never been about producing students who merely pass exams. We aim to shape thinkers, innovators, and ethical leaders. We elevate the NERDC curriculum with digital literacy, hands-on STEM programs, leadership training, and character formation. Every student here is known by name, and every parent has a direct line to their child&apos;s progress through our EduPortal.
              </p>
              <p>
                As you navigate our website and explore our portal, I invite you to see the heart of our school. We are a family. We are a laboratory of ideas. We are a training ground for the next generation of role models — the men and women who will shape Nigeria&apos;s future.
              </p>
              <p>
                Whether you are a prospective parent, a current student, or an alumnus, I welcome you personally. Come visit our campus. Sit in on a class. Speak with our teachers. See for yourself why so many families in Sango Ota and beyond call Ykay home.
              </p>

              {/* Signature */}
              <div className="pt-12 border-t border-[var(--border-subtle)]">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl text-[var(--text-primary)]">Mr. Adeyinka Oladimeji, MSc</p>
                    <p className="text-sm text-brand-green font-bold tracking-widest uppercase mt-1">Director & Proprietor</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Ykay Training College & Leadership Academy</p>
                  </div>
                  <div className="flex gap-3">
                    <a href="mailto:director@ykaycollege.com" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-brand-green text-brand-green text-sm font-bold hover:bg-brand-green hover:text-white transition-all">
                      <Mail size={14} /> Email
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 bg-brand-navy">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-4xl md:text-5xl text-white mb-6">
              Ready to Join <span className="text-brand-green">Ykay Family?</span>
            </h2>
            <p className="text-white/70 mb-8 max-w-2xl mx-auto">
              Applications for the 2025/2026 academic session are now open. Take the first step toward giving your child a transformative education.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/admissions" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-brand-orange text-white font-bold uppercase tracking-widest text-sm hover:bg-brand-orange-dark transition-all shadow-lg">
                Apply Now
              </Link>
              <Link href="/about" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/10 text-white font-bold uppercase tracking-widest text-sm hover:bg-white/20 transition-all">
                Learn More
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
