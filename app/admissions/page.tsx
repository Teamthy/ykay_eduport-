import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdmissionApplicationForm from "@/components/admissions/AdmissionApplicationForm";
import { CheckCircle2, Clock3, FileText, ShieldCheck } from "lucide-react";

const assurances = [
  { icon: FileText, title: "Six clear steps", text: "Complete the application at your own pace, from student details through final review." },
  { icon: ShieldCheck, title: "Private by design", text: "Sensitive documents are stored in a private, access-controlled admissions vault." },
  { icon: Clock3, title: "Know what happens next", text: "Track a submitted application online and expect an update within 3–5 business days." },
];

export default function AdmissionsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="relative overflow-hidden bg-brand-navy pb-16 pt-32 md:pb-20 md:pt-40">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 85% 15%, #4EC54D 0, transparent 30%), radial-gradient(circle at 20% 80%, #FF6E00 0, transparent 25%)" }} />
          <div className="relative mx-auto max-w-7xl px-6">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-green">2025 / 2026 admissions</p>
              <h1 className="mt-5 font-display text-5xl leading-[0.88] tracking-[0.08em] text-white sm:text-7xl md:text-8xl">START YOUR<br /><span className="text-brand-green">APPLICATION</span></h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-white/75 md:text-lg">Apply to Ykay College &amp; Leadership Academy for JSS1 through SS3. Before you begin, please prepare the applicant&apos;s birth certificate, passport photograph, and most recent report card.</p>
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/85"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2"><CheckCircle2 size={16} className="text-brand-green" />Application fee: ₦5,000</span><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2"><CheckCircle2 size={16} className="text-brand-green" />Average time: 12–15 minutes</span></div>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--section-divider)] bg-[var(--section-bg-alt)] py-7">
          <div className="mx-auto grid max-w-7xl gap-5 px-6 md:grid-cols-3">
            {assurances.map((item) => <div key={item.title} className="flex gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-green/10 text-brand-green"><item.icon size={19} /></div><div><h2 className="font-semibold text-[var(--text-primary)]">{item.title}</h2><p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">{item.text}</p></div></div>)}
          </div>
        </section>

        <section className="pt-12 md:pt-16">
          <AdmissionApplicationForm />
        </section>
      </main>
      <Footer />
    </>
  );
}
