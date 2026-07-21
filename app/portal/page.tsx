import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ShieldCheck, GraduationCap, User, Users, ArrowRight, Eye } from "lucide-react";

const portals = [
  {
    label: "Admin Portal",
    title: "School Management",
    desc: "Full control over student records, staff management, admissions review, and school-wide finance settings.",
    icon: ShieldCheck,
    href: "/admin",
    features: ["Student Management", "Staff Invitations", "Fee Structure", "Report Cards"],
  },
  {
    label: "Teacher Portal",
    title: "Teaching & Assessment",
    desc: "Digital attendance register with real-time parent SMS alerts, CA gradebook, and lesson planning tools.",
    icon: GraduationCap,
    href: "/teacher/attendance",
    features: ["Digital Attendance", "CA Gradebook", "Score Entry", "Class Management"],
  },
  {
    label: "Student Portal",
    title: "Learning & Results",
    desc: "Access your personalized dashboard, view CA scores, check attendance, and download term report cards.",
    icon: User,
    href: "/student/dashboard",
    features: ["Personal Dashboard", "Attendance View", "Report Cards", "Announcements"],
  },
  {
    label: "Parent Portal",
    title: "Child Monitoring & Fees",
    desc: "Monitor your child's grades, attendance, fee balance, and pay school fees online via Paystack.",
    icon: Users,
    href: "/parent/dashboard",
    features: ["Child Dashboard", "Fee Payment", "Attendance Alerts", "Report Downloads"],
  },
];

export default function PortalPage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        {/* Hero */}
        <section className="pt-32 pb-16 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-green/10 border border-brand-green/30 text-brand-green text-[10px] font-bold tracking-[0.2em] uppercase mb-6">
              EduPortal · Demo Mode
            </span>
            <h1 className="font-display text-[52px] md:text-[80px] text-white leading-[0.95]">
              YKAY <span className="text-brand-green">EDUPORTAL</span>
            </h1>
            <p className="text-white/60 font-body max-w-2xl mx-auto mt-6 text-base md:text-lg">
              Explore the complete digital ecosystem powering Ykay College. All portals below are populated with demonstration data to showcase real-world workflows.
            </p>
          </div>
        </section>

        {/* Demo Notice */}
        <section className="py-6 bg-brand-orange/10 border-y border-brand-orange/20 px-6">
          <div className="mx-auto max-w-7xl flex items-center justify-center gap-3 text-center">
            <Eye size={16} className="text-brand-orange shrink-0" />
            <p className="font-body text-sm text-brand-orange">
              <strong>Demo Mode Active:</strong> All portals below use mock data. Real credentials will be issued for the 2025/2026 session.
            </p>
          </div>
        </section>

        {/* Portal Cards */}
        <section className="py-20 px-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid md:grid-cols-2 gap-8">
              {portals.map((p) => (
                <Link
                  key={p.label}
                  href={p.href}
                  className="group relative p-10 rounded-[2.5rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] hover:border-brand-green hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green group-hover:bg-brand-green group-hover:text-white transition-colors">
                      <p.icon size={28} strokeWidth={1.75} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange bg-brand-orange/10 px-3 py-1 rounded-full">
                      Live Demo
                    </span>
                  </div>

                  <span className="font-body text-[10px] font-bold uppercase tracking-widest text-brand-green mb-2 block">
                    {p.label}
                  </span>
                  <h3 className="font-display text-3xl text-[var(--text-primary)] mb-4 tracking-[2px]">
                    {p.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                    {p.desc}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-8">
                    {p.features.map((f) => (
                      <span
                        key={f}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--surface-disabled)] text-[var(--text-muted)] font-medium"
                      >
                        {f}
                      </span>
                    ))}
                  </div>

                  <div className="inline-flex items-center gap-2 text-sm font-bold text-brand-green group-hover:gap-3 transition-all">
                    Explore Portal <ArrowRight size={16} />
                  </div>
                </Link>
              ))}
            </div>

            {/* Bottom Info */}
            <div className="mt-16 p-10 rounded-[2rem] bg-gradient-to-br from-brand-navy to-brand-navy-light border border-white/5 text-center">
              <h3 className="font-display text-2xl text-white mb-4">
                Full Launch: 2025/2026 Session
              </h3>
              <p className="font-body text-white/60 max-w-2xl mx-auto mb-6">
                All parents, students, and staff will receive individual login credentials at the beginning of term. Until then, explore these demonstrations to see what's coming.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-brand-orange text-white font-body text-sm font-bold tracking-widest hover:bg-brand-orange-dark transition-all shadow-lg"
              >
                Contact Admin
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
