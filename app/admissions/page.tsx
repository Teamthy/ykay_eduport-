import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdmissionApplicationForm from "@/components/admissions/AdmissionApplicationForm";
import { CheckCircle2, Clock3, FileText, ShieldCheck } from "lucide-react";

const assurances = [
  {
    icon: FileText,
    title: "Six clear steps",
    text: "Complete the application at your own pace, from student details through final review.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "Sensitive documents are stored in a private, access-controlled admissions vault.",
  },
  {
    icon: Clock3,
    title: "Know what happens next",
    text: "Track a submitted application online and expect an update within 3–5 business days.",
  },
];

export default function AdmissionsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="relative overflow-hidden pb-16 pt-32 md:pb-20 md:pt-40">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1920&q=80"
              alt="Students learning together"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/90 to-brand-navy/70" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-transparent to-brand-navy/50" />
          </div>
          <div className="relative mx-auto max-w-7xl px-6">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-green">2025 / 2026 admissions</p>
              <h1 className="mt-5 font-display text-5xl leading-[0.88] tracking-[0.08em] text-white sm:text-7xl md:text-8xl">
                START YOUR
                <br />
                <span className="text-brand-green">APPLICATION</span>
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-white md:text-lg">
                Apply to Ykay College &amp; Leadership Academy for JSS1 through SS3. Before you begin, please prepare the
                applicant&apos;s birth certificate, passport photograph, and most recent report card.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-white">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2">
                  <CheckCircle2 size={16} className="text-brand-green" /> JSS1 – SS3
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2">
                  <CheckCircle2 size={16} className="text-brand-green" /> Secure document upload
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2">
                  <CheckCircle2 size={16} className="text-brand-green" /> Online fee payment
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 md:grid-cols-3 md:py-12">
          {assurances.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-sm"
            >
              <item.icon className="text-brand-green" size={22} />
              <h2 className="mt-4 font-display text-xl tracking-wide text-[var(--text-primary)]">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto max-w-7xl">
            <AdmissionApplicationForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
