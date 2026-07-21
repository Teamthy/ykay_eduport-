import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BookOpen, Award, GraduationCap, FlaskConical } from "lucide-react";

export default function AcademicsPage() {
  return (
    <>
      <Header />
      <main className="bg-white min-h-screen">
        <section className="relative w-full bg-white pt-32 pb-12 md:pt-40 md:pb-16">
          <div className="mx-auto max-w-7xl px-6">
            <p className="font-body text-xs font-bold tracking-[0.25em] uppercase text-ykay-navy/30 mb-4">PROGRAMMES</p>
            <h1 className="font-display text-[56px] md:text-[100px] lg:text-[130px] leading-[0.85] tracking-[4px] text-ykay-navy mb-4">ACADEMICS</h1>
            <p className="font-body text-base md:text-lg text-ykay-navy/50 max-w-2xl">A rigorous, NERDC-aligned curriculum spanning Junior Secondary (JSS1–JSS3) and Senior Secondary (SS1–SS3) — with Science, Arts, and Commercial tracks.</p>
          </div>
        </section>

        <section className="w-full bg-white pb-16 md:pb-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-3 gap-6 md:gap-8 mb-16">
              {[
                { icon: BookOpen, title: "Junior Secondary (JSS1 — JSS3)", desc: "Foundational education covering the full Nigerian curriculum with digital literacy, continuous assessment, and BECE preparation built into every term." },
                { icon: Award, title: "Senior Secondary — Science", desc: "Physics, Chemistry, Biology, Mathematics, Technical Drawing, and Further Mathematics. Designed for students pursuing medicine, engineering, and technology.", extra: "WAEC / NECO / JAMB Ready" },
                { icon: GraduationCap, title: "Senior Secondary — Arts", desc: "Literature in English, Government, History, Christian Religious Studies, Fine Arts, and French. Ideal for students with interests in humanities and creative fields." },
                { icon: FlaskConical, title: "Senior Secondary — Commercial", desc: "Economics, Commerce, Accounting, Business Studies, and Mathematics. Prepares students for business, finance, and entrepreneurship pathways.", extra: "Digital Business Skills" },
              ].map((item) => (
                <div key={item.title} className="rounded-[2rem] bg-card-bg border border-white/5 p-8 md:p-10 hover:border-white/15 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6">
                    <item.icon size={22} className="text-ykay-navy/70" />
                  </div>
                  <h3 className="font-display text-xl md:text-2xl tracking-[2px] text-ykay-navy mb-3">{item.title}</h3>
                  <p className="font-body text-sm text-ykay-navy/50 leading-relaxed">{item.desc}</p>
                  {item.extra && <span className="inline-block mt-4 px-3 py-1 rounded-full bg-purple/10 text-purple/70 text-[10px] font-bold tracking-[0.15em] uppercase">{item.extra}</span>}
                </div>
              ))}
            </div>

            <div className="rounded-[2rem] bg-gradient-to-r from-[#1a0a2e] to-[#0D0D0D] border border-white/5 p-10 md:p-14 md:p-16">
              <h2 className="font-display text-[28px] md:text-[36px] tracking-[2px] text-ykay-navy mb-6">Curriculum &amp; Assessment</h2>
              <p className="font-body text-base text-ykay-navy/60 leading-relaxed mb-8 max-w-4xl">
                All academic content is aligned with the Nigerian Educational Research and Development Council (NERDC) curriculum. Students sit continuous assessments (CA), mid-term examinations, and terminal examinations — with automated grading through our CBT engine. Report cards are generated automatically using the Nigerian A1–F9 grading scale, with class ranking included.
              </p>
              <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                {[
                  { label: "CBT Engine", value: "Anti-cheat controls, auto-grade, randomization, result release" },
                  { label: "Continuous Assessment", value: "CA1, CA2, Mid-term, Assignment — all computed digitally" },
                  { label: "Report Cards", value: "Branded PDF, WhatsApp delivery, QR verification, class position" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
                    <h4 className="font-display text-lg tracking-[2px] text-ykay-navy mb-2">{item.label}</h4>
                    <p className="font-body text-sm text-ykay-navy/40 leading-relaxed">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
