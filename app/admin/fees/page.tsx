"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Receipt from "@/components/Receipt";
import {
  CreditCard, Landmark, Receipt as ReceiptIcon, Send, Plus, CheckCircle2,
  Search, ArrowDownToLine, BellRing, Eye, Trash2, Printer
} from "lucide-react";

export default function AdminFeesPage() {
  const [searchFees, setSearchFees] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);

  const stats = [
    { label: "Total Billed", value: "₦12,450,000", icon: ReceiptIcon, color: "text-brand-green" },
    { label: "Total Collected", value: "₦8,200,000", icon: CheckCircle2, color: "text-brand-orange" },
    { label: "Outstanding", value: "₦4,250,000", icon: ArrowDownToLine, color: "text-brand-green" },
    { label: "Collection Rate", value: "66%", icon: CreditCard, color: "text-brand-orange" },
  ];

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-32 pb-14 md:pt-40 md:pb-20 bg-brand-navy">
          <div className="mx-auto max-w-7xl px-6">
            <h1 className="font-display text-[42px] md:text-[72px] tracking-[4px] text-white leading-[1.05] mb-4">
              FEE <span className="text-brand-green">MANAGEMENT</span>
            </h1>
            <p className="font-body text-base md:text-lg text-white/50 max-w-2xl">
              Configure fee structures, generate term invoices, and process payments for Ykay College.
            </p>
          </div>
        </section>

        <section className="pb-20 md:pb-28 pt-10">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                   <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{stat.label}</span>
                      <stat.icon className={stat.color} size={18} />
                   </div>
                   <div className="font-display text-2xl text-[var(--text-primary)]">{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 shadow-[var(--card-shadow)]">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="font-display text-2xl text-[var(--text-primary)]">Invoice Registry</h2>
                  <button className="btn-primary text-xs px-5 py-2">Generate All Invoices</button>
               </div>
               <div className="text-center py-20 border-2 border-dashed border-[var(--border-subtle)] rounded-2xl">
                  <p className="text-[var(--text-muted)] font-body">Transaction ledger active. Database connection established.</p>
               </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
