"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  User,
  Bell,
  ClipboardCheck,
  GraduationCap,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Heart,
  Shield,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/student/attendance", icon: CalendarDays },
  { label: "Timetable", href: "/student/timetable", icon: CalendarDays },
  { label: "CBT Tests", href: "/student/exams", icon: ClipboardCheck },
  { label: "Report Cards", href: "/student/report-cards", icon: FileText },
  { label: "Announcements", href: "/student/announcements", icon: Bell },
  { label: "My Profile", href: "/student/profile", icon: User },
  { label: "Teachers", href: "/student/teachers", icon: GraduationCap },
];

export default function StudentProfilePage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              MY <span className="text-brand-green">PROFILE</span>
            </h1>
            <p className="text-white/60 text-sm">View your personal and academic information.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <PortalSidebar portalName="Student" portalType="student" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Profile Card */}
              <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] overflow-hidden shadow-[var(--card-shadow)]">
                <div className="h-28 bg-gradient-to-br from-brand-navy to-brand-navy-light" />
                <div className="px-8 pb-8 -mt-16">
                  <div className="flex items-end gap-6 mb-6">
                    <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center text-white font-display text-3xl border-4 border-[var(--bg-primary)] shadow-2xl">
                      EA
                    </div>
                    <div className="pb-2">
                      <h2 className="font-display text-3xl text-[var(--text-primary)]">
                        EMMANUEL ADEBAYO
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green font-bold uppercase tracking-widest">
                          Student
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-green text-white font-bold uppercase tracking-widest">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-brand-green">
                        Personal Info
                      </h3>
                      {[
                        { icon: User, label: "Full Name", value: "Emmanuel Oluwaseun Adebayo" },
                        { icon: Calendar, label: "Date of Birth", value: "November 22, 2009" },
                        { icon: User, label: "Gender", value: "Male" },
                        { icon: MapPin, label: "State of Origin", value: "Ogun State" },
                        { icon: Shield, label: "Student ID", value: "YKC/2025/002" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-disabled)]"
                        >
                          <item.icon size={14} className="text-brand-green mt-0.5 shrink-0" />
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                              {item.label}
                            </div>
                            <div className="text-sm text-[var(--text-primary)] font-medium">
                              {item.value}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-brand-orange">
                        Academic Info
                      </h3>
                      {[
                        { icon: GraduationCap, label: "Class", value: "SS2 · Arm B" },
                        { icon: FileText, label: "Track", value: "Science" },
                        { icon: Calendar, label: "Session", value: "2025/2026" },
                        { icon: Calendar, label: "Entry Type", value: "New Student" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-disabled)]"
                        >
                          <item.icon size={14} className="text-brand-orange mt-0.5 shrink-0" />
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                              {item.label}
                            </div>
                            <div className="text-sm text-[var(--text-primary)] font-medium">
                              {item.value}
                            </div>
                          </div>
                        </div>
                      ))}

                      <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 pt-2">
                        Health
                      </h3>
                      {[
                        { icon: Heart, label: "Blood Group", value: "AB+" },
                        { icon: Heart, label: "Genotype", value: "AS" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-disabled)]"
                        >
                          <item.icon size={14} className="text-red-500 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                              {item.label}
                            </div>
                            <div className="text-sm text-[var(--text-primary)] font-medium">
                              {item.value}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Parent Contact */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                <h3 className="font-display text-lg text-[var(--text-primary)] mb-4">
                  Parent / Guardian
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { icon: User, label: "Name", value: "Mr. Adebayo" },
                    { icon: Phone, label: "Phone", value: "0802 123 4567" },
                    { icon: Mail, label: "Email", value: "adebayo@email.com" },
                    { icon: MapPin, label: "Address", value: "12 Admiralty Way, Lekki Phase 1" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-disabled)]"
                    >
                      <item.icon size={14} className="text-blue-500 shrink-0" />
                      <div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
                          {item.label}
                        </div>
                        <div className="text-sm text-[var(--text-primary)]">{item.value}</div>
                      </div>
                    </div>
                  ))}
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
