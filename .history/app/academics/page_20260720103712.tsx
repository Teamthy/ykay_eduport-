import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BookOpen, Award, GraduationCap, FlaskConical } from "lucide-react";

export default function AcademicsPage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        {/* Hero */}
        <section className="relative w-full bg-[var(--bg-primary)] pt-32 pb-12 md:pt-40 md:pb-16">
          <div className="mx-auto max-w-7xl px-6">
            <p className="font-body text-xs font-bold tracking-[0.25em] uppercase text-[var(--accent-primary)] mb-4">
              PROGRAMMES
            </p>
            <h1 className="font-display text-[56px] md:text-[100px] lg:text-[130px] leading-[0.85] tracking-[4px] text-[var(--text-primary)] mb-4">
              ACADEMICS
            </h1>
            <p className="font-body text-base md:text-lg text-[var(--text-secondary)] max-w-2xl">
              A rigorous, NERDC-aligned curriculum spanning Junior Secondary (JSS1–JSS3) and Senior Secondary (SS1–SS3) — with Science, Arts, and Commercial tracks.
            </p>
          </div>
        </section>

        {/* Programmes grid + Curriculum */}
        <section className="w-full bg-[var(--bg-primary)] pb-16 md:pb-24">
          <div className="mx-auto max-w-7xl px-6">
            {/* Tracks */}
            <div className="grid lg:grid-cols-3 gap-6 md:gap-8 mb-16">
              {[
                {
                  icon: BookOpen,
                  title: "Junior Secondary (JSS1 — JSS3)",
                  desc: "Foundational education covering the full Nigerian curriculum with digital literacy, continuous assessment, and BECE preparation built into every term.",
                  extra: "BECE Ready",
                },
                {
                  icon: Award,
                  title: "Senior Secondary — Science",
                  desc: "Physics, Chemistry, Biology, Mathematics, Technical Drawing, and Further Mathematics. Designed for students pursuing medicine, engineering, and technology.",
                  extra: "WAEC / NECO / JAMB Ready",
                },
                {
                  icon: GraduationCap,
                  title: "Senior Secondary — Arts",
                  desc: "Literature in English, Government, History, Christian Religious Studies, Fine Arts, and French. Ideal for students with interests in humanities and creative fields.",
                  extra: "Humanities Track",
                },
                {
                  icon: FlaskConical,
                  title: "Senior Secondary — Commercial",
                  desc: "Economics, Commerce, Accounting, Business Studies, and Mathematics. Prepares students for business, finance, and entrepreneurship pathways.",
                  extra: "Digital Business Skills",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:border-[var(--accent-primary)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-1 transition-all duration-300 p-8 md:p-10"
                >
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center mb-6">
                    <item.icon size={22} className="text-[var(--accent-primary)]" />
                  </div>
                  <h3 className="font-display text-xl md:text-2xl tracking-[2px] text-[var(--text-primary)] mb-3">
                    {item.title}
                  </h3>
                  <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed">
                    {item.desc}
                  </p>
                  {item.extra && (
                    <span className="inline-block mt-4 px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-bold tracking-[0.15em] uppercase">
                      {item.extra}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Curriculum & Assessment banner */}
            <div className="rounded-[2rem] bg-gradient-to-br from-brand-navy via-green-900 to-brand-green p-10 md:p-14 lg:p-16 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-brand-orange/20 blur-3xl" />

              <div className="relative z-10">
                <h2 className="font-display text-[28px] md:text-[36px] tracking-[2px] text-white mb-6">
                  Curriculum &amp; Assessment
                </h2>
                <p className="font-body text-base text-white/85 leading-relaxed mb-8 max-w-4xl">
                  All academic content is aligned with the Nigerian Educational Research and Development Council (NERDC) curriculum. Students sit continuous assessments (CA), mid-term examinations, and terminal examinations — with automated grading through our CBT engine. Report cards are generated automatically using the Nigerian A1–F9 grading scale, with class ranking included.
                </p>
                <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                  {[
                    {
                      label: "CBT Engine",
                      value: "Anti-cheat controls, auto-grade, randomization, result release",
                    },
                    {
                      label: "Continuous Assessment",
                      value: "CA1, CA2, Mid-term, Assignment — all computed digitally",
                    },
                    {
                      label: "Report Cards",
                      value: "Branded PDF, WhatsApp delivery, QR verification, class position",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6"
                    >
                      <h4 className="font-display text-lg tracking-[2px] text-white mb-2">
                        {item.label}
                      </h4>
                      <p className="font-body text-sm text-white/80 leading-relaxed">
                        {item.value}
                      </p>
                    </div>
                  ))}
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