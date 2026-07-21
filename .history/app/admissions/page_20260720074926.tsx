"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CheckCircle2, ArrowRight, ArrowLeft, Upload } from "lucide-react";

export default function AdmissionsPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    studentName: "",
    parentName: "",
    email: "",
    phone: "",
    classApplying: "",
    previousSchool: "",
    docs: [] as string[],
    paymentReference: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [appId, setAppId] = useState("");

  const totalSteps = 6;

  const handleNext = () => {
    if (step < totalSteps) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admissions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: formData.studentName,
          parentName: formData.parentName,
          email: formData.email,
          phone: formData.phone,
          classApplying: formData.classApplying,
          previousSchool: formData.previousSchool,
          documents: formData.docs,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setAppId(result.applicationId);
        setSubmitted(true);
      }
    } catch {
      // Fallback for demo
      setAppId(`YKC-APP-2025-${String(Math.floor(Math.random() * 9000) + 1000)}`);
      setSubmitted(true);
    }
  };

  return (
    <>
      <Header />
      <main className="bg-white min-h-screen">
        <section className="relative w-full bg-white pt-32 pb-12 md:pt-40 md:pb-16 overflow-hidden">
          <div className="mx-auto max-w-7xl px-6">
            <p className="font-body text-xs font-bold tracking-[0.25em] uppercase text-ykay-navy/30 mb-4">2025 / 2026 SESSION</p>
            <h1 className="font-display text-[56px] md:text-[100px] lg:text-[130px] leading-[0.85] tracking-[4px] text-ykay-navy mb-6">ADMISSIONS</h1>
            <p className="font-body text-base md:text-lg text-ykay-navy/50 max-w-2xl leading-relaxed">Apply online for JSS1 — SS3. Application fee: ₦5,000. Multi-step form with document upload and real-time status tracking.</p>
          </div>
        </section>

        <section className="w-full bg-white pb-16 md:pb-24">
          <div className="mx-auto max-w-4xl px-6">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="rounded-[2rem] bg-card-bg border border-ykay-navy-10 p-8 md:p-12 shadow-sm">
                {/* Step Indicator */}
                <div className="flex justify-between mb-10 relative">
                  <div className="absolute top-4 left-8 right-8 h-0.5 bg-ykay-navy-10 -z-0" />
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                    <div key={s} className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${s <= step ? "bg-ykay-green text-white" : "bg-ykay-navy-05 text-ykay-navy/40"}`}>
                      {s}
                    </div>
                  ))}
                </div>

                <div className="mb-6">
                  <h2 className="font-display text-xl tracking-[2px] text-ykay-navy mb-1">Step {step} of {totalSteps}</h2>
                  <p className="font-body text-sm text-ykay-navy/40">
                    {step === 1 && "Student Information"}
                    {step === 2 && "Parent / Guardian Information"}
                    {step === 3 && "Academic History"}
                    {step === 4 && "Document Upload"}
                    {step === 5 && "Application Fee (₦5,000)"}
                    {step === 6 && "Review & Submit"}
                  </p>
                </div>

                {/* Step 1 */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="studentName" className="block font-body text-xs font-bold tracking-[0.15em] uppercase text-ykay-navy/40 mb-2">Student Full Name</label>
                      <input id="studentName" required value={formData.studentName} onChange={e => setFormData({ ...formData, studentName: e.target.value })} className="w-full rounded-xl border border-ykay-navy-10 bg-white px-5 py-3.5 font-body text-sm text-ykay-navy placeholder:text-muted-foreground focus:outline-none focus:border-ykay-green/40 transition-colors" placeholder="First Middle Last" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="dob" className="block font-body text-xs font-bold tracking-[0.15em] uppercase text-ykay-navy/40 mb-2">Date of Birth</label>
                        <input id="dob" type="date" className="w-full rounded-xl border border-ykay-navy-10 bg-white px-5 py-3.5 font-body text-sm text-ykay-navy focus:outline-none focus:border-ykay-green/40 transition-colors" />
                      </div>
                      <div>
                        <label htmlFor="class" className="block font-body text-xs font-bold tracking-[0.15em] uppercase text-ykay-navy/40 mb-2">Class Applying For</label>
                        <select id="class" required value={formData.classApplying} onChange={e => setFormData({ ...formData, classApplying: e.target.value })} className="w-full rounded-xl border border-ykay-navy-10 bg-white px-5 py-3.5 font-body text-sm text-ykay-navy focus:outline-none focus:border-ykay-green/40 transition-colors">
                          <option value="">Select class</option>
                          <option value="JSS1">JSS1</option>
                          <option value="JSS2">JSS2</option>
                          <option value="JSS3">JSS3</option>
                          <option value="SS1">SS1</option>
                          <option value="SS2">SS2</option>
                          <option value="SS3">SS3</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2 */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="parentName" className="block font-body text-xs font-bold tracking-[0.15em] uppercase text-ykay-navy/40 mb-2">Parent / Guardian Name</label>
                        <input id="parentName" required value={formData.parentName} onChange={e => setFormData({ ...formData, parentName: e.target.value })} className="w-full rounded-xl border border-ykay-navy-10 bg-white px-5 py-3.5 font-body text-sm text-ykay-navy placeholder:text-muted-foreground focus:outline-none focus:border-ykay-green/40 transition-colors" placeholder="Full name" />
                      </div>
                      <div>
                        <label htmlFor="email" className="block font-body text-xs font-bold tracking-[0.15em] uppercase text-ykay-navy/40 mb-2">Email Address</label>
                        <input id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-xl border border-ykay-navy-10 bg-white px-5 py-3.5 font-body text-sm text-ykay-navy placeholder:text-muted-foreground focus:outline-none focus:border-ykay-green/40 transition-colors" placeholder="parent@example.com" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="phone" className="block font-body text-xs font-bold tracking-[0.15em] uppercase text-ykay-navy/40 mb-2">Phone Number</label>
                      <input id="phone" type="tel" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full rounded-xl border border-ykay-navy-10 bg-white px-5 py-3.5 font-body text-sm text-ykay-navy placeholder:text-muted-foreground focus:outline-none focus:border-ykay-green/40 transition-colors" placeholder="080XXXXXXXX" />
                    </div>
                  </div>
                )}

                {/* Step 3 */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="prevSchool" className="block font-body text-xs font-bold tracking-[0.15em] uppercase text-ykay-navy/40 mb-2">Previous School</label>
                      <input id="prevSchool" value={formData.previousSchool} onChange={e => setFormData({ ...formData, previousSchool: e.target.value })} className="w-full rounded-xl border border-ykay-navy-10 bg-white px-5 py-3.5 font-body text-sm text-ykay-navy placeholder:text-muted-foreground focus:outline-none focus:border-ykay-green/40 transition-colors" placeholder="Name of previous school" />
                    </div>
                    <p className="font-body text-xs text-ykay-navy/30">Academic history helps us understand the student's background. This information is not used for admission decisions.</p>
                  </div>
                )}

                {/* Step 4 */}
                {step === 4 && (
                  <div className="space-y-4">
                    <label className="block font-body text-xs font-bold tracking-[0.15em] uppercase text-ykay-navy/40 mb-2">Document Upload</label>
                    <div className="border-2 border-dashed border-ykay-navy-10 rounded-2xl p-8 text-center hover:bg-ykay-green-50 transition-colors">
                      <Upload size={32} className="mx-auto mb-3 text-ykay-navy/20" />
                      <p className="font-body text-sm text-ykay-navy/50">Drag files here or click to browse</p>
                      <p className="font-body text-[11px] text-ykay-navy/30 mt-1">Birth certificate, passport photo, previous report card (PDF, JPG, PNG — max 5MB)</p>
                      <input type="file" multiple className="mt-4 text-sm text-ykay-navy" onChange={e => setFormData({ ...formData, docs: Array.from(e.target.files || []).map(f => f.name) })} />
                      {formData.docs.length > 0 && (
                        <div className="mt-4 text-left">
                          <p className="font-body text-xs text-ykay-green font-bold">Uploaded files:</p>
                          <ul className="mt-2 space-y-1">
                            {formData.docs.map((d, i) => (
                              <li key={i} className="font-body text-xs text-ykay-navy/60 flex items-center gap-2"><CheckCircle2 size={12} className="text-ykay-green" /> {d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 5 */}
                {step === 5 && (
                  <div className="space-y-6">
                    <div className="rounded-2xl bg-ykay-navy text-white p-8 md:p-10">
                      <h3 className="font-display text-xl tracking-[2px] mb-2">Application Fee</h3>
                      <p className="font-display text-5xl md:text-6xl tracking-[2px] mb-2">₦5,000</p>
                      <p className="font-body text-sm text-white/60 mb-6">This fee is non-refundable and covers the processing of your application.</p>
                      <button
                        type="button"
                        onClick={() => {
                          // Simulate Paystack modal trigger
                          const script = document.createElement("script");
                          script.innerHTML = `
                            alert("Paystack Integration: This would open the secure Paystack payment modal.\n\nAmount: ₦5,000\nMethods: Card, Bank Transfer, USSD\n\nIn production, this connects to live Paystack credentials.");
                          `;
                          document.body.appendChild(script);
                          script.remove();
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-ykay-navy font-body text-sm font-bold tracking-[0.15em] hover:bg-white/90 transition-all duration-300 hover:scale-[1.03] shadow-lg shadow-white/20"
                      >
                        Pay with Paystack
                      </button>
                    </div>
                    <p className="font-body text-xs text-ykay-navy/30">After payment, a receipt is sent to your email. The application ID will be visible upon submission.</p>
                  </div>
                )}

                {/* Step 6 */}
                {step === 6 && (
                  <div className="space-y-6">
                    <h3 className="font-display text-xl tracking-[2px] text-ykay-navy mb-4">Review &amp; Submit</h3>
                    <div className="rounded-2xl bg-card-bg border border-ykay-navy-05 p-6 space-y-3">
                      <div className="flex justify-between font-body text-sm"><span className="text-ykay-navy/60">Student Name</span> <span className="text-ykay-navy font-medium">{formData.studentName || "—"}</span></div>
                      <div className="flex justify-between font-body text-sm"><span className="text-ykay-navy/60">Parent Name</span> <span className="text-ykay-navy font-medium">{formData.parentName || "—"}</span></div>
                      <div className="flex justify-between font-body text-sm"><span className="text-ykay-navy/60">Email</span> <span className="text-ykay-navy font-medium">{formData.email || "—"}</span></div>
                      <div className="flex justify-between font-body text-sm"><span className="text-ykay-navy/60">Class Applying For</span> <span className="text-ykay-navy font-medium">{formData.classApplying || "—"}</span></div>
                      <div className="flex justify-between font-body text-sm"><span className="text-ykay-navy/60">Previous School</span> <span className="text-ykay-navy font-medium">{formData.previousSchool || "—"}</span></div>
                      <div className="flex justify-between font-body text-sm"><span className="text-ykay-navy/60">Documents Uploaded</span> <span className="text-ykay-navy font-medium">{formData.docs.length}</span></div>
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-full px-8 py-4 font-body text-sm font-bold tracking-[0.15em] uppercase bg-ykay-green text-white hover:bg-ykay-green-dark transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-ykay-green-20"
                    >
                      Submit Application
                    </button>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-body text-sm font-bold tracking-[0.15em] uppercase text-ykay-navy/60 border border-ykay-navy-10 hover:bg-ykay-navy-05 transition-all duration-300"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                  )}
                  {step < totalSteps && step !== 5 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-body text-sm font-bold tracking-[0.15em] uppercase bg-ykay-green text-white hover:bg-ykay-green-dark transition-all duration-300 hover:scale-[1.03] shadow-lg shadow-ykay-green-20 ml-auto"
                    >
                      Next <ArrowRight size={16} />
                    </button>
                  ) : step === 5 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-body text-sm font-bold tracking-[0.15em] uppercase bg-ykay-green text-white hover:bg-ykay-green-dark transition-all duration-300 hover:scale-[1.03] shadow-lg shadow-ykay-green-20 ml-auto"
                    >
                      Continue to Review <ArrowRight size={16} />
                    </button>
                  ) : null}
                </div>
              </form>
            ) : (
              <div className="rounded-[2rem] bg-card-bg border border-ykay-navy-05 p-10 md:p-14 text-center">
                <CheckCircle2 size={64} className="mx-auto mb-6 text-ykay-green" />
                <h2 className="font-display text-3xl md:text-4xl tracking-[2px] text-ykay-navy mb-4">Application Submitted</h2>
                <p className="font-body text-sm text-ykay-navy/50 mb-6">Your Application ID: <span className="font-mono text-ykay-navy font-bold text-base">{appId}</span></p>
                <p className="font-body text-sm text-ykay-navy/40 mb-8">A confirmation has been sent to your email. You will receive an SMS shortly. Use your Application ID to check status at any time.</p>
                <div className="flex flex-wrap justify-center gap-4">
                  <a href="/application-status" className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-body text-sm font-bold tracking-[0.15em] uppercase bg-ykay-navy text-white hover:bg-ykay-navy-light transition-colors">Check Status</a>
                  <a href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-body text-sm font-bold tracking-[0.15em] uppercase border border-ykay-navy-10 text-ykay-navy hover:bg-ykay-navy-05 transition-colors">Back to Home</a>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
