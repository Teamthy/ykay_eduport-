import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ShieldCheck, GraduationCap, User, Users } from "lucide-react";

export default function PortalPage() {
  return (
    <>
      <Header />
      <main className="bg-white min-h-screen">
        <section className="relative w-full bg-white pt-32 pb-12 md:pt-40 md:pb-16 overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <p className="font-body text-xs font-bold tracking-[0.25em] uppercase text-white/30 mb-4">EDUPORTAL</p>
            <h1 className="font-display text-[56px] md:text-[100px] lg:text-[130px] leading-[0.85] tracking-[4px] text-white mb-6">YKAY PORTAL</h1>
            <p className="font-body text-base md:text-xl text-white/40 max-w-2xl mx-auto leading-relaxed">
              A unified digital platform for school management, academic delivery, examination, fee collection, and parent engagement. Select your portal to continue.
            </p>
          </div>
        </section>

        <section className="w-full bg-white pb-20 md:pb-32">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {[
                {
                  label: "Admin Portal",
                  title: "School Management",
                  desc: "Manage students, staff, fees, exams, attendance, reports, and school-wide settings. Full administrative control over all school operations.",
                  icon: ShieldCheck,
                  href: "#",
                  color: "text-purple",
                },
                {
                  label: "Teacher Portal",
                  title: "Teaching & Assessment",
                  desc: "Create exams, enter CA scores, manage attendance, create lesson plans, distribute assignments, and view class analytics.",
                  icon: GraduationCap,
                  href: "#",
                  color: "text-crimson",
                },
                {
                  label: "Student Portal",
                  title: "Learning & Results",
                  desc: "Access class notes, take CBT exams, submit assignments, view grades, check attendance, and explore the learning hub.",
                  icon: User,
                  href: "#",
                  color: "text-emerald-400",
                },
                {
                  label: "Parent Portal",
                  title: "Child Monitoring & Fees",
                  desc: "Track your child's grades, attendance, fee status, and school events. Pay fees online and communicate with teachers in real time.",
                  icon: Users,
                  href: "#",
                  color: "text-amber-300",
                },
              ].map((portal) => (
                <a
                  key={portal.title}
                  href={portal.href}
                  className="group relative overflow-hidden rounded-[2rem] bg-card-bg border border-white/5 p-8 md:p-10 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple/5"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-white/10 transition-colors">
                    <portal.icon size={26} className="text-white/70 group-hover:text-white transition-colors" />
                  </div>
                  <span className="font-body text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-2 block">{portal.label}</span>
                  <h3 className="font-display text-2xl md:text-3xl tracking-[2px] text-white mb-3">{portal.title}</h3>
                  <p className="font-body text-sm text-white/40 leading-relaxed mb-6">{portal.desc}</p>
                  <span className="inline-flex items-center gap-2 font-body text-xs font-bold tracking-[0.15em] uppercase text-white/50 group-hover:text-white transition-colors">
                    Access Portal <span aria-hidden className="group-hover:translate-x-1 transition-transform">→</span>
                  </span>
                  <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-tr from-purple/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </a>
              ))}
            </div>

            <div className="mt-12 md:mt-16 rounded-[2rem] bg-gradient-to-r from-[#1a0a2e] to-[#0D0D0D] border border-white/5 p-8 md:p-12 text-center">
              <h3 className="font-display text-2xl md:text-3xl tracking-[2px] text-white mb-3">Not Yet Registered?</h3>
              <p className="font-body text-sm text-white/40 mb-6 max-w-lg mx-auto">If you are a staff member, student, or parent and have not received your portal credentials, please contact the school administration or visit the admissions office.</p>
              <a href="/contact" className="inline-flex items-center gap-2 font-body text-sm font-bold tracking-[0.15em] uppercase text-white bg-white/5 border border-white/10 px-6 py-3 rounded-full hover:bg-white/10 transition-colors">
                Contact Administration
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
