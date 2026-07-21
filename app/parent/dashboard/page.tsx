"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FileText, CreditCard, CalendarDays, Award, TrendingUp, BookOpen } from "lucide-react";

const CHILDREN = [
  { name: "Adeola Ogunlade", class: "JSS1", id: "YKC/2025/001", grade: "B2", attendance: 85 },
];

const NOTIFICATIONS = [
  { title: "New Report Card Released", desc: "First Term 2025/2026 report card available.", time: "2h ago", type: "success" },
  { title: "Fee Reminder", desc: "Term fee balance of ₦45,000 due by 15 Aug.", time: "5h ago", type: "warning" },
  { title: "Attendance Alert", desc: "Adeola was absent on 10 July 2025.", time: "1d ago", type: "alert" },
];

export default function ParentDashboardPage() {
  const [selectedChild, setSelectedChild] = useState(CHILDREN[0]);

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-32 pb-10 md:pt-40 md:pb-16 px-6">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[2rem] bg-gradient-to-br from-brand-navy to-brand-navy-light border border-white/5 p-8 md:p-12 shadow-xl">
              <h1 className="font-display text-[36px] md:text-[56px] tracking-[3px] text-white mb-4">
                PARENT <span className="text-brand-green">DASHBOARD</span>
              </h1>
              <p className="font-body text-base md:text-lg text-white/60 max-w-2xl">
                Monitor your child&apos;s academic progress, attendance, and fees in real time.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-20 px-6">
          <div className="mx-auto max-w-7xl space-y-8">
            {/* Child Switcher */}
            <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
              <h3 className="font-display text-sm tracking-[2px] text-[var(--text-primary)] mb-4">My Children</h3>
              <div className="flex flex-wrap gap-3">
                {CHILDREN.map(child => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChild(child)}
                    className={`rounded-xl px-5 py-4 border text-left transition-all ${
                      selectedChild.id === child.id
                        ? "bg-brand-green/5 border-brand-green/30"
                        : "bg-[var(--surface-disabled)] border-[var(--border-subtle)] hover:border-brand-green/20"
                    }`}
                  >
                    <div className="font-display text-base tracking-[2px] text-[var(--text-primary)]">{child.name}</div>
                    <div className="font-body text-[10px] text-[var(--text-muted)]">{child.class} · ID: {child.id}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Current Grade", value: selectedChild.grade, icon: Award },
                    { label: "Attendance", value: `${selectedChild.attendance}%`, icon: TrendingUp },
                    { label: "Fee Balance", value: "₦45,000", icon: CreditCard },
                    { label: "Report Cards", value: "1 Released", icon: FileText },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-5 shadow-[var(--card-shadow)]">
                      <div className="font-body text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">{stat.label}</div>
                      <div className="font-display text-2xl tracking-[2px] text-brand-green">{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Quick Access */}
                <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 shadow-[var(--card-shadow)]">
                  <h2 className="font-display text-xl tracking-[2px] text-[var(--text-primary)] mb-6">Academics</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: "Term Scores", desc: "View CA and exam scores.", link: "/parent/report-cards", icon: BookOpen },
                      { title: "Report Cards", desc: "Download official reports.", link: "/parent/report-cards", icon: FileText },
                      { title: "Attendance", desc: "View attendance calendar.", link: "/parent/attendance", icon: CalendarDays },
                      { title: "Fees & Payments", desc: "View and pay fees.", link: "/parent/fees", icon: CreditCard },
                    ].map(item => (
                      <Link
                        key={item.title}
                        href={item.link}
                        className="group rounded-xl bg-[var(--surface-disabled)] border border-[var(--border-subtle)] p-5 hover:border-brand-green/30 hover:-translate-y-0.5 transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center mb-3 text-brand-green group-hover:bg-brand-green group-hover:text-white transition-colors">
                          <item.icon size={20} />
                        </div>
                        <h3 className="font-body text-sm font-bold text-[var(--text-primary)] mb-1">{item.title}</h3>
                        <p className="font-body text-xs text-[var(--text-muted)]">{item.desc}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Notifications */}
                <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 shadow-[var(--card-shadow)]">
                  <h2 className="font-display text-xl tracking-[2px] text-[var(--text-primary)] mb-6">Notifications</h2>
                  <div className="space-y-3">
                    {NOTIFICATIONS.map((n, i) => (
                      <div key={i} className="flex items-start gap-4 rounded-xl bg-[var(--surface-disabled)] px-5 py-4">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.type === "success" ? "bg-brand-green" : n.type === "warning" ? "bg-brand-orange" : "bg-red-500"}`} />
                        <div className="flex-1">
                          <div className="font-body text-sm font-bold text-[var(--text-primary)]">{n.title}</div>
                          <div className="font-body text-xs text-[var(--text-muted)]">{n.desc}</div>
                        </div>
                        <div className="font-body text-[10px] text-[var(--text-muted)]">{n.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <aside>
                <div className="rounded-[2rem] bg-gradient-to-br from-brand-navy to-brand-navy-light border border-white/5 p-8 shadow-xl">
                  <h3 className="font-display text-xl tracking-[2px] text-white mb-5">Coming Soon</h3>
                  <div className="flex flex-wrap gap-2">
                    {["CBT Exams", "Assignments", "Learning Hub", "Virtual Classroom", "Timetable", "Canteen Wallet", "Health Records"].map(tag => (
                      <span key={tag} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-body font-bold text-white/60">{tag}</span>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
