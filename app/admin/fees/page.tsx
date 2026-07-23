"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminSidebar from "@/components/AdminSidebar";
import {
  ArrowDownToLine,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  Receipt as ReceiptIcon,
  Search,
} from "lucide-react";

type FeesOverviewResponse = {
  summary: {
    totalBilled: number;
    totalCollected: number;
    totalOutstanding: number;
    collectionRate: number;
    invoiceCount: number;
    paidInvoices: number;
    partialInvoices: number;
    unpaidInvoices: number;
  };
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    title: string;
    termLabel: string;
    status: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    dueDate: string | null;
    issuedAt: string;
    student: {
      studentId: string;
      displayName: string;
      className: string;
    };
    parent: {
      displayName: string;
    };
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    method: string;
    reference: string;
    receiptNumber: string;
    paidAt: string;
    student: {
      studentId: string;
      displayName: string;
      className: string;
    };
  }>;
};

export default function AdminFeesPage() {
  const [data, setData] = useState<FeesOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchFees, setSearchFees] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/fees/overview", { cache: "no-store" });
        const body = (await response.json()) as FeesOverviewResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load fee management data.");
        if (!active) return;
        setData(body);
      } catch (overviewError) {
        if (!active) return;
        setData(null);
        setError(overviewError instanceof Error ? overviewError.message : "Unable to load fee management data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadOverview();
    return () => {
      active = false;
    };
  }, []);

  const filteredInvoices = useMemo(() => {
    if (!data) return [];
    const query = searchFees.trim().toLowerCase();
    if (!query) return data.invoices;
    return data.invoices.filter((invoice) =>
      [
        invoice.invoiceNumber,
        invoice.termLabel,
        invoice.student.displayName,
        invoice.student.studentId,
        invoice.student.className,
        invoice.parent.displayName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [data, searchFees]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy pb-14 pt-24 md:pb-20 md:pt-32">
          <div className="mx-auto max-w-7xl px-6">
            <h1 className="font-display text-[42px] leading-[1.05] tracking-[4px] text-white md:text-[72px]">
              FEE <span className="text-brand-green">MANAGEMENT</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/50 md:text-lg">
              Live invoice registry, collection status, and recent parent payments for the school finance team.
            </p>
          </div>
        </section>

        <section className="pb-20 pt-10 md:pb-28">
          <div className="mx-auto max-w-7xl px-6 flex flex-col lg:flex-row gap-8">
            <AdminSidebar />

            <div className="flex-1 space-y-6 min-w-0">
              {loading ? (
                <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading fee management data...
                  </div>
                </div>
              ) : null}

              {!loading && error ? (
                <div className="rounded-[2rem] border border-brand-orange/30 bg-brand-orange/10 p-6 shadow-[var(--card-shadow)] text-sm text-[var(--text-secondary)]">
                  {error}
                </div>
              ) : null}

              {!loading && data ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: "Total Billed", value: data.summary.totalBilled, icon: ReceiptIcon, color: "text-brand-green" },
                      { label: "Total Collected", value: data.summary.totalCollected, icon: CheckCircle2, color: "text-brand-orange" },
                      { label: "Outstanding", value: data.summary.totalOutstanding, icon: ArrowDownToLine, color: "text-brand-green" },
                      { label: "Collection Rate", value: `${data.summary.collectionRate}%`, icon: CreditCard, color: "text-brand-orange", raw: true },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{stat.label}</span>
                          <stat.icon className={stat.color} size={18} />
                        </div>
                        <div className="font-display text-2xl text-[var(--text-primary)]">{stat.raw ? stat.value : `â‚¦${Number(stat.value).toLocaleString()}`}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 shadow-[var(--card-shadow)]">
                      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h2 className="font-display text-2xl text-[var(--text-primary)]">Invoice Registry</h2>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">{data.summary.invoiceCount} invoice(s) across paid, partial, and unpaid states.</p>
                        </div>
                        <div className="relative md:w-[280px]">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                          <input
                            value={searchFees}
                            onChange={(event) => setSearchFees(event.target.value)}
                            placeholder="Search invoice, student, class..."
                            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-3 pl-10 pr-4 text-sm text-[var(--input-text)] outline-none focus:border-[var(--input-border-focus)]"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[var(--border-subtle)] text-left text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                              <th className="py-3 pr-4">Invoice</th>
                              <th className="py-3 pr-4">Student</th>
                              <th className="py-3 pr-4">Status</th>
                              <th className="py-3 pr-4 text-right">Billed</th>
                              <th className="py-3 pr-4 text-right">Paid</th>
                              <th className="py-3 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredInvoices.map((invoice) => (
                              <tr key={invoice.id} className="border-b border-[var(--border-subtle)] last:border-0">
                                <td className="py-4 pr-4">
                                  <div className="font-semibold text-[var(--text-primary)]">{invoice.invoiceNumber}</div>
                                  <div className="text-xs text-[var(--text-muted)]">{invoice.termLabel}</div>
                                </td>
                                <td className="py-4 pr-4">
                                  <div className="font-medium text-[var(--text-primary)]">{invoice.student.displayName}</div>
                                  <div className="text-xs text-[var(--text-muted)]">{invoice.student.className} Â· {invoice.parent.displayName}</div>
                                </td>
                                <td className="py-4 pr-4">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${invoice.status === "PAID" ? "bg-brand-green/15 text-brand-green" : invoice.status === "PARTIAL" ? "bg-brand-orange/15 text-brand-orange" : "bg-red-500/15 text-red-500"}`}>
                                    {invoice.status}
                                  </span>
                                </td>
                                <td className="py-4 pr-4 text-right font-semibold text-[var(--text-primary)]">â‚¦{invoice.totalAmount.toLocaleString()}</td>
                                <td className="py-4 pr-4 text-right text-brand-green">â‚¦{invoice.amountPaid.toLocaleString()}</td>
                                <td className="py-4 text-right text-brand-orange">â‚¦{invoice.balanceDue.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 shadow-[var(--card-shadow)]">
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <h2 className="font-display text-2xl text-[var(--text-primary)]">Recent Payments</h2>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">Latest successful payments recorded in the finance ledger.</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {data.recentPayments.length ? (
                          data.recentPayments.map((payment) => (
                            <div key={payment.id} className="rounded-xl bg-[var(--surface-disabled)] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-[var(--text-primary)]">{payment.student.displayName}</div>
                                  <div className="text-xs text-[var(--text-muted)]">{payment.student.className} Â· {new Date(payment.paidAt).toLocaleDateString()}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-display text-xl text-brand-green">â‚¦{payment.amount.toLocaleString()}</div>
                                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{payment.method}</div>
                                </div>
                              </div>
                              <div className="mt-3 text-[10px] font-mono text-[var(--text-muted)]">{payment.receiptNumber}</div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[var(--text-muted)]">No payment history found.</p>
                        )}
                      </div>
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