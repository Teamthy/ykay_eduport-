"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminSidebar from "@/components/AdminSidebar";
import {
  ArrowUpCircle,
  BarChart3,
  CreditCard,
  Download,
  LoaderCircle,
  PiggyBank,
  Wallet,
} from "lucide-react";

type FinanceOverviewResponse = {
  cards: Array<{
    period: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  totals: {
    totalIncome: number;
    totalBilled: number;
    totalOutstanding: number;
    collectionRate: number;
  };
  recentIncome: Array<{
    id: string;
    date: string;
    category: string;
    amount: number;
    desc: string;
    receiptNumber: string;
  }>;
  classCollections: Array<{
    className: string;
    billed: number;
    paid: number;
    balance: number;
    collectionRate: number;
  }>;
};

export default function FinanceDashboardPage() {
  const [data, setData] = useState<FinanceOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadFinance() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/finances/overview", { cache: "no-store" });
        const body = (await response.json()) as FinanceOverviewResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load finance overview.");
        if (!active) return;
        setData(body);
      } catch (financeError) {
        if (!active) return;
        setData(null);
        setError(financeError instanceof Error ? financeError.message : "Unable to load finance overview.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFinance();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pb-10 pt-24">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
            <div>
              <h1 className="font-display text-4xl tracking-widest text-white md:text-5xl">
                FINANCE <span className="text-brand-green">DASHBOARD</span>
              </h1>
              <p className="mt-2 text-sm text-white/60">Live income visibility, class collection performance, and fee cashflow summaries.</p>
            </div>
            <button className="hidden items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-brand-green-dark md:inline-flex">
              <Download size={14} /> Reports
            </button>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <AdminSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {loading ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading finance dashboard...
                  </div>
                </div>
              ) : null}

              {!loading && error ? (
                <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/10 p-6 shadow-[var(--card-shadow)] text-sm text-[var(--text-secondary)]">
                  {error}
                </div>
              ) : null}

              {!loading && data ? (
                <>
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                    <h3 className="mb-4 font-bold text-brand-green">Quick Actions</h3>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: "Record Income", icon: ArrowUpCircle, color: "bg-brand-green text-white" },
                        { label: "Invoice Registry", icon: CreditCard, color: "bg-brand-orange text-white" },
                        { label: "Collections", icon: Wallet, color: "bg-blue-500 text-white" },
                        { label: "Fee Savings", icon: PiggyBank, color: "bg-brand-green text-white" },
                      ].map((action) => (
                        <button key={action.label} className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-lg transition-all hover:opacity-90 ${action.color}`}>
                          <action.icon size={14} /> {action.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {data.cards.map((card) => (
                      <div key={card.period} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)]">
                        <div className="mb-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{card.period}</div>
                        <div className="font-display text-3xl text-brand-green">â‚¦{card.income.toLocaleString()}</div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">Net: â‚¦{card.net.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                      <h3 className="font-display text-xl text-[var(--text-primary)]">Recent Income</h3>
                      <div className="mt-5 space-y-3">
                        {data.recentIncome.length ? (
                          data.recentIncome.map((item) => (
                            <div key={item.id} className="rounded-xl bg-[var(--surface-disabled)] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-[var(--text-primary)]">{item.desc}</div>
                                  <div className="text-xs text-[var(--text-muted)]">{new Date(item.date).toLocaleDateString()} Â· {item.category}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-display text-xl text-brand-green">â‚¦{item.amount.toLocaleString()}</div>
                                  <div className="text-[10px] font-mono text-[var(--text-muted)]">{item.receiptNumber}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[var(--text-muted)]">No recent income entries found.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                      <h3 className="font-display text-xl text-[var(--text-primary)]">Class Collection Performance</h3>
                      <div className="mt-5 space-y-4">
                        {data.classCollections.length ? (
                          data.classCollections.map((item) => (
                            <div key={item.className} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-disabled)] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-[var(--text-primary)]">{item.className}</div>
                                  <div className="text-xs text-[var(--text-muted)]">Billed: â‚¦{item.billed.toLocaleString()} Â· Paid: â‚¦{item.paid.toLocaleString()}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-display text-xl text-brand-green">{item.collectionRate}%</div>
                                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">collection</div>
                                </div>
                              </div>
                              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                                <div className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-green-light" style={{ width: `${item.collectionRate}%` }} />
                              </div>
                              <div className="mt-3 text-xs text-brand-orange">Outstanding: â‚¦{item.balance.toLocaleString()}</div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[var(--text-muted)]">No class finance data found.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                    <h3 className="mb-4 font-bold text-brand-green text-lg">Yearly Summary</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      {[
                        { label: "Total Income", value: data.totals.totalIncome, accent: "text-brand-green" },
                        { label: "Total Billed", value: data.totals.totalBilled, accent: "text-[var(--text-primary)]" },
                        { label: "Outstanding", value: data.totals.totalOutstanding, accent: "text-brand-orange" },
                        { label: "Collection Rate", value: `${data.totals.collectionRate}%`, accent: "text-brand-green", raw: true },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl bg-[var(--surface-disabled)] p-5 text-center">
                          <div className="mb-1 text-xs text-[var(--text-muted)]">{item.label}</div>
                          <div className={`font-display text-2xl ${item.accent}`}>{item.raw ? item.value : `â‚¦${Number(item.value).toLocaleString()}`}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}