"use client";

import { useState } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminSidebar from "@/components/AdminSidebar";
import { MOCK_STUDENTS, MOCK_STAFF, MOCK_ACTIVITY } from "@/lib/mockData";
import {
  School, Users, GraduationCap, TrendingUp, Activity, Shield,
  CheckCircle2, ChevronDown, ChevronUp, Edit3, Mail, Phone,
  MapPin, Calendar, Award, BarChart3, Settings, ListChecks
, CreditCard} from "lucide-react";

export default function AdminDashboardPage() {
  const [showDetails, setShowDetails] = useState(true);

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        {/* Hero Banner */}
        <section className="pt-24 pb-10 bg-brand-navy px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 bg-gradient-to-l from-brand-green to-transparent" />
          <div className="mx-auto max-w-7xl relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-block px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-bold uppercase tracking-widest">
                <Shield size={10} className="inline mr-1" /> Admin Portal · Session 2025/2026
              </span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <p className="text-brand-green text-sm mb-2 flex items-center gap-1.5">
                  <Award size={14} /> Welcome, Administrator
                </p>
                <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-3">
                  ADMIN <span className="text-brand-green">DASHBOARD</span>
                </h1>
                <p className="text-white/60 text-sm max-w-2xl">
                  Complete school administration — manage students, staff, finances, and academic operations from a single interface.
                </p>
                <div className="flex gap-3 mt-4">
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all">
                    <ListChecks size={14} /> View Tasks
                  </button>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all">
                    <Settings size={14} /> Settings
                  </button>
                </div>
              </div>
              <div className="relative group">
                <div className="w-32 h-32 rounded-3xl bg-white p-3 shadow-2xl border-4 border-brand-green/30">
                  <Image src="/ykay-logo.png" alt="Ykay College" width={120} height={120} className="w-full h-full object-contain" />
                </div>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-green text-white text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 size={10} /> Administrator
                </span>
              </div>
            </div>

            {/* System Reminder */}
            <div className="mt-6 p-4 rounded-2xl bg-brand-navy-light border border-white/10 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-green/20 text-brand-green flex items-center justify-center shrink-0 mt-0.5">
                <Activity size={16} />
              </div>
              <p className="text-sm text-white/80">
                <strong className="text-brand-green">Reminder:</strong> At the beginning of a new term or session, please go to{" "}
                <a href="/admin/academic-overview" className="text-brand-green underline">Academic Overview → Session/Term</a>{" "}
                to set the current term or session.
              </p>
            </div>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <AdminSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {/* School Profile Card */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] overflow-hidden shadow-[var(--card-shadow)]">
                <div className="p-6 bg-gradient-to-r from-brand-green to-brand-green-dark flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white p-2 shadow-lg">
                    <Image src="/ykay-logo.png" alt="Ykay" width={60} height={60} className="w-full h-full object-contain" />
                  </div>
                  <div className="text-white">
                    <h2 className="font-display text-2xl tracking-widest">Ykay Training College</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Excellence in Education</span>
                      <span className="text-[10px] flex items-center gap-1 bg-brand-green-dark px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={10} /> Verified
                      </span>
                    </div>
                    <div className="text-xs text-white/80 mt-1 flex items-center gap-1">
                      <Users size={11} /> Owner: Mr. Adeyinka Oladimeji, MSc
                    </div>
                  </div>
                </div>

                <button onClick={() => setShowDetails(!showDetails)} className="w-full p-3 bg-[var(--surface-disabled)] text-sm text-[var(--text-primary)] font-bold flex items-center justify-center gap-2 hover:bg-[var(--surface-card-hover)] transition-colors">
                  {showDetails ? "Hide" : "Show"} Details {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showDetails && (
                  <div className="p-6 grid md:grid-cols-2 gap-6">
                    {/* School Info */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <School className="text-brand-green" size={18} />
                        <h3 className="font-bold text-[var(--text-primary)]">School Information</h3>
                      </div>
                      <div className="space-y-3">
                        {[
                          { label: "Address", value: "Km 38, Lagos-Abeokuta Expressway, Sango Ota, Ogun State", icon: MapPin },
                          { label: "Type", value: "Day Secondary School", icon: School },
                          { label: "Email", value: "info@ykaycollege.com", icon: Mail },
                          { label: "Phone", value: "0701 537 4411", icon: Phone },
                          { label: "Status", value: "Approved", icon: CheckCircle2 },
                        ].map(item => (
                          <div key={item.label} className="flex items-start gap-3 pb-3 border-b border-[var(--border-subtle)] last:border-0">
                            <item.icon size={14} className="text-brand-green mt-0.5 shrink-0" />
                            <div>
                              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{item.label}</div>
                              <div className="text-sm text-[var(--text-primary)]">
                                {item.label === "Status" ? (
                                  <span className="text-brand-green font-bold flex items-center gap-1"><CheckCircle2 size={12} /> {item.value}</span>
                                ) : item.value}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[10px] text-[var(--text-muted)]">Last updated: July 20, 2025</span>
                          <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-green text-white text-xs font-bold hover:bg-brand-green-dark transition-all">
                            <Edit3 size={11} /> Update
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* School Statistics */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="text-brand-green" size={18} />
                        <h3 className="font-bold text-[var(--text-primary)]">School Statistics</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {[
                          { label: "Classes", value: 12, icon: School },
                          { label: "Students", value: MOCK_STUDENTS.length, icon: Users },
                          { label: "Teachers", value: MOCK_STAFF.length, icon: GraduationCap },
                        ].map(s => (
                          <div key={s.label} className="p-4 rounded-xl bg-[var(--surface-disabled)] text-center">
                            <div className="font-display text-3xl text-brand-green">{s.value}</div>
                            <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-[var(--text-muted)]">
                              <s.icon size={11} /> {s.label}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)]">Automatically generated from school records</p>

                      {/* Additional Stats */}
                      <div className="mt-4 space-y-2">
                        {[
                          { label: "Fee Collection Rate", value: "72%", color: "brand-green" },
                          { label: "Average Attendance", value: "88%", color: "brand-orange" },
                          { label: "WAEC Pass Rate", value: "92%", color: "brand-green" },
                        ].map(s => (
                          <div key={s.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[var(--text-muted)]">{s.label}</span>
                              <span className={`font-bold text-${s.color}`}>{s.value}</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-[var(--surface-disabled)] overflow-hidden">
                              <div className={`h-full bg-${s.color}`} style={{ width: s.value }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                <h3 className="text-brand-green font-bold text-lg mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Add Student", href: "/admin/students", icon: Users, color: "brand-green" },
                    { label: "Record Payment", href: "/admin/fees", icon: CreditCard, color: "brand-orange" },
                    { label: "Send Broadcast", href: "/admin/broadcasts", icon: Mail, color: "blue-500" },
                    { label: "View Reports", href: "/admin/report-cards", icon: BarChart3, color: "purple-500" },
                  ].map(a => (
                    <a key={a.label} href={a.href} className={`p-4 rounded-xl bg-[var(--surface-disabled)] hover:bg-brand-green/10 hover:border-brand-green transition-all border border-transparent text-center group`}>
                      <div className={`w-10 h-10 rounded-xl bg-${a.color}/10 text-${a.color} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                        <a.icon size={18} />
                      </div>
                      <div className="font-bold text-[var(--text-primary)] text-xs">{a.label}</div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg text-[var(--text-primary)]">Recent Activity</h3>
                  <Activity size={16} className="text-brand-green" />
                </div>
                <div className="space-y-3">
                  {MOCK_ACTIVITY.slice(0, 6).map(item => (
                    <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-[var(--border-subtle)] last:border-0">
                      <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center shrink-0">
                        <Activity size={12} className="text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[var(--text-primary)] font-medium">{item.action}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">{item.detail}</div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-1">{item.user} · {item.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enrollment by Class */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                <h3 className="font-display text-lg text-[var(--text-primary)] mb-4">Enrollment by Class</h3>
                <div className="space-y-3">
                  {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"].map(cls => {
                    const count = MOCK_STUDENTS.filter(s => s.class === cls).length;
                    const percent = Math.max((count / MOCK_STUDENTS.length) * 100, 8);
                    return (
                      <div key={cls}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-[var(--text-secondary)] font-medium">{cls}</span>
                          <span className="text-brand-green font-bold">{count} students</span>
                        </div>
                        <div className="h-3 rounded-full bg-[var(--surface-disabled)] overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-green-light transition-all" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

