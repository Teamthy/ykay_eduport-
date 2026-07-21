"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AdminAdmissionsPage() {
  const applications = [
    { id: "YKC-APP-2025-0047", name: "Adeola Ogunlade", class: "JSS1", status: "Pending", date: "2025-07-15" },
    { id: "YKC-APP-2025-0032", name: "Emmanuel Adebayo", class: "SS2", status: "Approved", date: "2025-07-10" },
  ];

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-32 pb-14 bg-brand-navy">
          <div className="mx-auto max-w-7xl px-6">
            <h1 className="font-display text-[42px] md:text-[64px] tracking-[4px] text-white mb-3">
              ADMISSIONS <span className="text-brand-green">ADMIN</span>
            </h1>
            <p className="font-body text-base text-white/60 max-w-2xl">
              Review incoming applications, approve or request additional documents, and manage the admission pipeline.
            </p>
          </div>
        </section>

        <section className="py-16 px-6">
          <div className="max-w-7xl mx-auto rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-disabled)]">
                <tr>
                  {["Application ID", "Applicant", "Class", "Status", "Submitted", "Action"].map(h => (
                    <th key={h} className="text-left px-6 py-4 font-display text-xs tracking-wider uppercase text-[var(--text-secondary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id} className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-card-hover)] transition-colors">
                    <td className="px-6 py-4 font-body text-[var(--text-secondary)]">{app.id}</td>
                    <td className="px-6 py-4 font-body text-[var(--text-primary)] font-bold">{app.name}</td>
                    <td className="px-6 py-4 font-body text-[var(--text-secondary)]">{app.class}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${app.status === "Pending" ? "bg-brand-orange/20 text-brand-orange" : "bg-brand-green/20 text-brand-green"}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-body text-[var(--text-muted)]">{app.date}</td>
                    <td className="px-6 py-4">
                      <button className="font-body text-xs font-bold text-brand-green hover:text-brand-green-dark uppercase tracking-wide">Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

