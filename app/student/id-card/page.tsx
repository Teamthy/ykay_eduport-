"use client";

import { useState } from "react";
import PortalTopbar from "@/components/PortalTopbar";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import { useToast } from "@/components/Toast";
import Image from "next/image";
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  User,
  Bell,
  ClipboardCheck,
  GraduationCap,
  IdCard,
  Download,
  Printer,
  QrCode,
  School,
  Phone,
  Calendar,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "My Profile", href: "/student/profile", icon: User },
  { label: "ID Card", href: "/student/id-card", icon: IdCard },
  { label: "Report Cards", href: "/student/report-cards", icon: FileText },
  { label: "Announcements", href: "/student/announcements", icon: Bell },
];

export default function IDCardPage() {
  const { toast } = useToast();

  const handleDownload = () => toast("ID Card downloaded as PDF", "success");
  const handlePrint = () => {
    window.print();
    toast("Opening print dialog", "info");
  };

  return (
    <>
      <PortalTopbar />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
              STUDENT <span className="text-brand-green">ID CARD</span>
            </h1>
            <p className="text-white/60 text-sm">Your digital school identity card.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <PortalSidebar portalName="Student" portalType="student" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 flex flex-col items-center space-y-8">
              {/* ID Card — Front */}
              <div className="w-full max-w-md">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-2 text-center">
                  Front
                </div>
                <div className="rounded-3xl overflow-hidden border-2 border-brand-green/40 shadow-2xl">
                  {/* Header */}
                  <div className="bg-brand-navy p-5 text-center relative">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <Image
                        src="/ykay-logo.png"
                        alt="Logo"
                        width={40}
                        height={40}
                        className="w-10 h-10 object-contain"
                      />
                      <div>
                        <div className="font-display text-lg text-white tracking-widest">
                          YKAY COLLEGE
                        </div>
                        <div className="text-[8px] text-brand-green font-bold tracking-widest">
                          & LEADERSHIP ACADEMY
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] text-white/60">
                      Km 38, Lagos-Abeokuta Expressway, Sango Ota
                    </div>
                  </div>

                  {/* Body */}
                  <div className="bg-white p-6 text-center">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-brand-green to-brand-green-dark mx-auto mb-4 flex items-center justify-center text-white font-display text-4xl border-4 border-brand-green/30 shadow-xl">
                      EA
                    </div>
                    <h2 className="font-display text-2xl text-brand-navy tracking-widest mb-1">
                      EMMANUEL ADEBAYO
                    </h2>
                    <div className="text-xs text-gray-600 mb-3">
                      Student · SS2 B · Science Track
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-left mb-4">
                      <div className="p-2 rounded-lg bg-gray-50">
                        <div className="text-[9px] text-gray-400 uppercase">Student ID</div>
                        <div className="font-bold text-brand-navy">YKC/2025/002</div>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50">
                        <div className="text-[9px] text-gray-400 uppercase">Session</div>
                        <div className="font-bold text-brand-navy">2025/2026</div>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50">
                        <div className="text-[9px] text-gray-400 uppercase">Blood Group</div>
                        <div className="font-bold text-brand-navy">AB+</div>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50">
                        <div className="text-[9px] text-gray-400 uppercase">Genotype</div>
                        <div className="font-bold text-brand-navy">AS</div>
                      </div>
                    </div>

                    {/* QR Code placeholder */}
                    <div className="w-24 h-24 mx-auto rounded-lg bg-brand-navy/10 border border-brand-navy/20 flex items-center justify-center mb-2">
                      <QrCode size={48} className="text-brand-navy" />
                    </div>
                    <div className="text-[8px] text-gray-400">Scan QR for verification</div>
                  </div>

                  {/* Footer */}
                  <div className="bg-brand-green p-3 text-center">
                    <div className="text-white text-[10px] font-bold">
                      <Phone size={10} className="inline mr-1" /> 0701 537 4411 ·
                      info@ykaycollege.com
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-green text-white font-bold text-sm hover:bg-brand-green-dark transition-all shadow-lg"
                >
                  <Download size={14} /> Download PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--surface-disabled)] text-[var(--text-primary)] font-bold text-sm hover:bg-brand-green hover:text-white transition-all"
                >
                  <Printer size={14} /> Print
                </button>
              </div>

              {/* Info */}
              <div className="max-w-md w-full p-4 rounded-2xl bg-brand-orange/10 border border-brand-orange/30 text-center">
                <p className="text-xs text-brand-orange">
                  This is a digital ID card. Physical cards are issued by the school administration.
                  Present this QR code for verification at school events.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
