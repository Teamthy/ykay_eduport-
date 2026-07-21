import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main className="bg-[#F5F7FA] min-h-screen">
        <section className="pt-32 pb-10 md:pt-40 md:pb-16">
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-[2rem] bg-[#0F1F2E] border border-white/5 p-8 md:p-12 shadow-xl shadow-ykay-green/5 mb-8">
              <h1 className="font-display text-[36px] md:text-[56px] tracking-[3px] text-white mb-3">PRIVACY <span className="text-ykay-green">POLICY</span></h1>
              <p className="font-body text-base md:text-lg text-white/30">Ykay College &amp; Leadership Academy — NDPR Compliance Statement</p>
            </div>
          </div>
        </section>
        <section className="pb-20 md:pb-28">
          <div className="mx-auto max-w-4xl px-6 space-y-8">
            <div className="rounded-[2rem] bg-white border border-ykay-navy-05 p-8 md:p-10 shadow-sm shadow-ykay-green/5">
              <h2 className="font-display text-xl tracking-[2px] text-ykay-navy mb-4">Data Protection &amp; Privacy</h2>
              <p className="font-body text-sm text-ykay-navy/60 leading-relaxed mb-4">Ykay College &amp; Leadership Academy is committed to protecting the privacy and personal data of all students, parents, staff, and stakeholders in accordance with the Nigeria Data Protection Regulation (NDPR) 2019.</p>
              <p className="font-body text-sm text-ykay-navy/60 leading-relaxed">We collect, process, and store personal data only for legitimate educational, administrative, and operational purposes. All data is handled with strict confidentiality and secured using industry-standard practices.</p>
            </div>
            <div className="rounded-[2rem] bg-white border border-ykay-navy-05 p-8 md:p-10 shadow-sm shadow-ykay-green/5">
              <h2 className="font-display text-xl tracking-[2px] text-ykay-navy mb-6">What Data We Collect</h2>
              <ul className="space-y-3">
                {[
                  "Student registration details (name, date of birth, gender, class, health records)",
                  "Parent or guardian contact information (name, phone, email)",
                  "Academic records (grades, attendance, report cards, exam scores)",
                  "Financial information (fee invoices, payment records, bank references)",
                  "Health and wellbeing records (blood group, allergies, medical notes)",
                  "Communication records (notifications, SMS, WhatsApp, email)",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 font-body text-sm text-ykay-navy/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-ykay-green mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[2rem] bg-white border border-ykay-navy-05 p-8 md:p-10 shadow-sm shadow-ykay-green/5">
              <h2 className="font-display text-xl tracking-[2px] text-ykay-navy mb-6">Your Rights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Access", desc: "Request a copy of your personal data." },
                  { title: "Correction", desc: "Request correction of inaccurate data." },
                  { title: "Deletion", desc: "Request deletion of your data where applicable." },
                  { title: "Portability", desc: "Request your data in a portable format." },
                  { title: "Restriction", desc: "Restrict processing of your data." },
                  { title: "Objection", desc: "Object to processing based on legitimate interests." },
                ].map((right) => (
                  <div key={right.title} className="rounded-xl bg-[#F5F7FA] border border-ykay-navy-05 px-5 py-5">
                    <h3 className="font-display text-sm tracking-[2px] text-ykay-green mb-1">{right.title}</h3>
                    <p className="font-body text-xs text-ykay-navy/30">{right.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] bg-gradient-to-r from-[#0F1F2E] to-[#1A3148] border border-white/5 p-8 md:p-10 shadow-xl shadow-ykay-green/5">
              <h2 className="font-display text-xl tracking-[2px] text-white mb-4">Cookie Consent</h2>
              <p className="font-body text-sm text-white/30 mb-4">This website uses cookies and similar technologies to enhance user experience, remember preferences, and analyze traffic. By continuing to use this site, you consent to our use of cookies in accordance with this policy.</p>
              <div className="flex gap-3 mt-4">
                <span className="px-3 py-1 rounded-full bg-ykay-green/10 border border-ykay-green/20 text-ykay-green text-[10px] font-bold">Essential</span>
                <span className="px-3 py-1 rounded-full bg-ykay-orange/10 border border-ykay-orange/20 text-ykay-orange text-[10px] font-bold">Analytics</span>
                <span className="px-3 py-1 rounded-full bg-ykay-green/10 border border-ykay-green/20 text-ykay-green text-[10px] font-bold">Preferences</span>
              </div>
            </div>
            <div className="rounded-[2rem] bg-white border border-ykay-navy-05 p-8 md:p-10 shadow-sm shadow-ykay-green/5">
              <h2 className="font-display text-xl tracking-[2px] text-ykay-navy mb-4">Data Requests</h2>
              <p className="font-body text-sm text-ykay-navy/60 leading-relaxed">To request access to, correction of, or deletion of your personal data, please contact our Data Protection Officer at <a href="mailto:dpo@ykaycollege.com" className="text-ykay-green font-bold hover:underline">dpo@ykaycollege.com</a> or visit the school office. All requests will be processed within the timeframe required by NDPR.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
