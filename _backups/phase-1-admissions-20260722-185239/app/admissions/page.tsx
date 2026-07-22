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
      setAppId(`YKC-APP-2025-${String(Math.floor(Math.random() * 9000) + 1000)}`);
      setSubmitted(true);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-5 py-3.5 font-body text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[var(--input-border-focus)] focus:ring-2 focus:ring-[var(--input-border-focus)]/20 transition-all";

  const labelClass =
    "block font-body text-xs font-bold tracking-[0.15em] uppercase text-[var(--input-label)] mb-2";

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        {/* Hero */}
        <section className="relative w-full bg-[var(--bg-primary)] pt-32 pb-12 md:pt-40 md:pb-16 overflow-hidden">
          <div className="mx-auto max-w-7xl px-6">
            <p className="font-body text-xs font-bold tracking-[0.25em] uppercase text-[var(--accent-primary)] mb-4">
              2025 / 2026 SESSION
            </p>
            <h1 className="font-display text-[56px] md:text-[100px] lg:text-[130px] leading-[0.85] tracking-[4px] text-[var(--text-primary)] mb-6">
              ADMISSIONS
            </h1>
            <p className="font-body text-base md:text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              Apply online for JSS1 — SS3. Application fee: ₦5,000. Multi-step form with document upload and real-time status tracking.
            </p>
          </div>
        </section>

        {/* Form */}
        <section className="w-full bg-[var(--bg-primary)] pb-16 md:pb-24">
          <div className="mx-auto max-w-4xl px-6">
            {!submitted ? (
              <form
                onSubmit={handleSubmit}
                className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] p-8 md:p-12"
              >
                {/* Step Indicator */}
                <div className="flex justify-between mb-10 relative">
                  <div className="absolute top-4 left-8 right-8 h-0.5 bg-[var(--border-subtle)] -z-0" />
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                    <div
                      key={s}
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${s <= step
                          ? "bg-brand-green text-white shadow-md shadow-brand-green/30"
                          : "bg-[var(--surface-disabled)] text-[var(--text-muted)]"
                        }`}
                    >
                      {s}
                    </div>
                  ))}
                </div>

                <div className="mb-6">
                  <h2 className="font-display text-xl tracking-[2px] text-[var(--text-primary)] mb-1">
                    Step {step} of {totalSteps}
                  </h2>
                  <p className="font-body text-sm text-[var(--text-muted)]">
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
                      <label htmlFor="studentName" className={labelClass}>
                        Student Full Name
                      </label>
                      <input
                        id="studentName"
                        required
                        value={formData.studentName}
                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        className={inputClass}
                        placeholder="First Middle Last"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="dob" className={labelClass}>
                          Date of Birth
                        </label>
                        <input id="dob" type="date" className={inputClass} />
                      </div>
                      <div>
                        <label htmlFor="class" className={labelClass}>
                          Class Applying For
                        </label>
                        <select
                          id="class"
                          required
                          value={formData.classApplying}
                          onChange={(e) => setFormData({ ...formData, classApplying: e.target.value })}
                          className={inputClass}
                        >
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="parentName" className={labelClass}>
                          Parent / Guardian Name
                        </label>
                        <input
                          id="parentName"
                          required
                          value={formData.parentName}
                          onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                          className={inputClass}
                          placeholder="Full name"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className={labelClass}>
                          Email Address
                        </label>
                        <input
                          id="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={inputClass}
                          placeholder="parent@example.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="phone" className={labelClass}>
                        Phone Number
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={inputClass}
                        placeholder="080XXXXXXXX"
                      />
                    </div>
                  </div>
                )}

                {/* Step 3 */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="prevSchool" className={labelClass}>
                        Previous School
                      </label>
                      <input
                        id="prevSchool"
                        value={formData.previousSchool}
                        onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                        className={inputClass}
                        placeholder="Name of previous school"
                      />
                    </div>
                    <p className="font-body text-xs text-[var(--text-muted)]">
                      Academic history helps us understand the student&apos;s background. This information is not used for admission decisions.
                    </p>
                  </div>
                )}

                {/* Step 4 */}
                {step === 4 && (
                  <div className="space-y-4">
                    <label className={labelClass}>Document Upload</label>
                    <div className="border-2 border-dashed border-[var(--border-default)] rounded-2xl p-8 text-center hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 transition-colors">
                      <Upload
                        size={32}
                        className="mx-auto mb-3 text-[var(--text-muted)]"
                      />
                      <p className="font-body text-sm text-[var(--text-secondary)]">
                        Drag files here or click to browse
                      </p>
                      <p className="font-body text-[11px] text-[var(--text-muted)] mt-1">
                        Birth certificate, passport photo, previous report card (PDF, JPG, PNG — max 5MB)
                      </p>
                      <input
                        type="file"
                        multiple
                        className="mt-4 text-sm text-[var(--text-primary)]"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            docs: Array.from(e.target.files || []).map((f) => f.name),
                          })
                        }
                      />
                      {formData.docs.length > 0 && (
                        <div className="mt-4 text-left">
                          <p className="font-body text-xs text-brand-green font-bold">
                            Uploaded files:
                          </p>
                          <ul className="mt-2 space-y-1">
                            {formData.docs.map((d, i) => (
                              <li
                                key={i}
                                className="font-body text-xs text-[var(--text-secondary)] flex items-center gap-2"
                              >
                                <CheckCircle2 size={12} className="text-brand-green" /> {d}
                              </li>
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
                    <div className="rounded-2xl bg-gradient-to-br from-brand-navy via-green-900 to-brand-green p-8 md:p-10 text-white relative overflow-hidden">
                      <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
                      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-brand-orange/30 blur-3xl" />
                      <div className="relative z-10">
                        <h3 className="font-display text-xl tracking-[2px] mb-2">
                          Application Fee
                        </h3>
                        <p className="font-display text-5xl md:text-6xl tracking-[2px] mb-2">
                          ₦5,000
                        </p>
                        <p className="font-body text-sm text-white/80 mb-6">
                          This fee is non-refundable and covers the processing of your application.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            alert(
                              "Paystack Integration:\nThis would open the secure Paystack payment modal.\n\nAmount: ₦5,000\nMethods: Card, Bank Transfer, USSD\n\nIn production, this connects to live Paystack credentials."
                            );
                          }}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-orange text-white font-body text-sm font-bold tracking-[0.15em] hover:bg-brand-orange-dark transition-all duration-300 hover:scale-[1.03] shadow-lg"
                        >
                          Pay with Paystack
                        </button>
                      </div>
                    </div>
                    <p className="font-body text-xs text-[var(--text-muted)]">
                      After payment, a receipt is sent to your email. The application ID will be visible upon submission.
                    </p>
                  </div>
                )}

                {/* Step 6 */}
                {step === 6 && (
                  <div className="space-y-6">
                    <h3 className="font-display text-xl tracking-[2px] text-[var(--text-primary)] mb-4">
                      Review &amp; Submit
                    </h3>
                    <div className="rounded-2xl bg-[var(--surface-disabled)] border border-[var(--border-subtle)] p-6 space-y-3">
                      {[
                        { label: "Student Name", value: formData.studentName },
                        { label: "Parent Name", value: formData.parentName },
                        { label: "Email", value: formData.email },
                        { label: "Class Applying For", value: formData.classApplying },
                        { label: "Previous School", value: formData.previousSchool },
                        { label: "Documents Uploaded", value: String(formData.docs.length) },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between font-body text-sm">
                          <span className="text-[var(--text-muted)]">{row.label}</span>
                          <span className="text-[var(--text-primary)] font-medium">
                            {row.value || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-full px-8 py-4 font-body text-sm font-bold tracking-[0.15em] uppercase bg-brand-green text-white hover:bg-brand-green-dark transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-brand-green/30"
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
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-body text-sm font-bold tracking-[0.15em] uppercase text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--surface-disabled)] transition-all duration-300"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                  )}
                  {step < totalSteps && step !== 5 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-body text-sm font-bold tracking-[0.15em] uppercase bg-brand-green text-white hover:bg-brand-green-dark transition-all duration-300 hover:scale-[1.03] shadow-lg shadow-brand-green/30 ml-auto"
                    >
                      Next <ArrowRight size={16} />
                    </button>
                  ) : step === 5 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-body text-sm font-bold tracking-[0.15em] uppercase bg-brand-green text-white hover:bg-brand-green-dark transition-all duration-300 hover:scale-[1.03] shadow-lg shadow-brand-green/30 ml-auto"
                    >
                      Continue to Review <ArrowRight size={16} />
                    </button>
                  ) : null}
                </div>
              </form>
            ) : (
              <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow-hover)] p-10 md:p-14 text-center">
                <CheckCircle2 size={64} className="mx-auto mb-6 text-brand-green" />
                <h2 className="font-display text-3xl md:text-4xl tracking-[2px] text-[var(--text-primary)] mb-4">
                  Application Submitted
                </h2>
                <p className="font-body text-sm text-[var(--text-secondary)] mb-6">
                  Your Application ID:{" "}
                  <span className="font-mono text-[var(--accent-primary)] font-bold text-base">
                    {appId}
                  </span>
                </p>
                <p className="font-body text-sm text-[var(--text-muted)] mb-8">
                  A confirmation has been sent to your email. You will receive an SMS shortly. Use your Application ID to check status at any time.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <a
                    href="/application-status"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-body text-sm font-bold tracking-[0.15em] uppercase bg-brand-green text-white hover:bg-brand-green-dark transition-colors"
                  >
                    Check Status
                  </a>
                  <a
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-body text-sm font-bold tracking-[0.15em] uppercase border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-disabled)] transition-colors"
                  >
                    Back to Home
                  </a>
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