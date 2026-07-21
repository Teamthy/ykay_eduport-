"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminSidebar from "@/components/AdminSidebar";
import {
  CreditCard, TrendingUp, TrendingDown, DollarSign, Calendar,
  Download, BarChart3, ArrowUpCircle, ArrowDownCircle, Wallet,
  PiggyBank, Receipt
} from "lucide-react";

const FINANCE_CARDS = [
  { period: "Today", income: 285000, expenses: 45000 },
  { period: "This Week", income: 1250000, expenses: 320000 },
  { period: "This Month", income: 4850000, expenses: 1200000 },
  { period: "This Year", income: 28500000, expenses: 8400000 },
];

const RECENT_INCOME = [
  { date: "Jul 21", category: "Tuition", amount: 125000, desc: "Emmanuel Adebayo — SS2 fees" },
  { date: "Jul 20", category: "Tuition", amount: 85000, desc: "Adeola Ogunlade — JSS1 fees" },
  { date: "Jul 19", category: "Application", amount: 5000, desc: "New application fee" },
  { date: "Jul 18", category: "PTA", amount: 15000, desc: "PTA levy collection" },
];

const RECENT_EXPENSES = [
  { date: "Jul 21", category: "Utilities", amount: 25000, desc: "Generator fuel" },
  { date: "Jul 20", category: "Supplies", amount: 15000, desc: "Lab chemicals restock" },
  { date: "Jul 18", category: "Maintenance", amount: 45000, desc: "Classroom repairs" },
];

export default function FinanceDashboardPage() {
  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-24 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <div>
              <h1 className="font-display text-4xl md:text-5xl tracking-widest text-white mb-2">
                FINANCE <span className="text-brand-green">DASHBOARD</span>
              </h1>
              <p className="text-white/60 text-sm">Track income, expenses, and financial health.</p>
            </div>
            <button className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-green text-white text-sm font-bold hover:bg-brand-green-dark transition-all shadow-lg">
              <Download size={14} /> Reports
            </button>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <AdminSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {/* Quick Actions */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                <h3 className="text-brand-green font-bold mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "Record Income", icon: ArrowUpCircle, color: "bg-brand-green text-white" },
                    { label: "Record Expense", icon: ArrowDownCircle, color: "bg-red-500 text-white" },
                    { label: "Budgets", icon: Wallet, color: "bg-blue-500 text-white" },
                    { label: "Savings", icon: PiggyBank, color: "bg-brand-orange text-white" },
                  ].map(a => (
                    <button key={a.label} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full ${a.color} text-sm font-bold hover:opacity-90 transition-all shadow-lg`}>
                      <a.icon size={14} /> {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Finance Cards Grid */}
              {FINANCE_CARDS.map(fc => {
                const net = fc.income - fc.expenses;
                const isProfit = net >= 0;
                return (
                  <div key={fc.period}>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">{fc.period}</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] text-center">
                        <div className="w-12 h-12 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-3">
                          <ArrowUpCircle className="text-brand-green" size={22} />
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mb-1">{fc.period}&apos;s Income</div>
                        <div className="font-display text-xl text-[var(--text-primary)]">₦{fc.income.toLocaleString()}</div>
                      </div>
                      <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--card-shadow)] text-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                          <ArrowDownCircle className="text-red-500" size={22} />
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mb-1">{fc.period}&apos;s Expenses</div>
                        <div className="font-display text-xl text-[var(--text-primary)]">₦{fc.expenses.toLocaleString()}</div>
                      </div>
                      <div className={`p-5 rounded-2xl border-l-4 ${isProfit ? "border-brand-green" : "border-red-500"} bg-[var(--surface-card)] border-y border-r border-[var(--border-subtle)] shadow-[var(--card-shadow)] text-center`}>
                        <div className={`w-12 h-12 rounded-full ${isProfit ? "bg-brand-green/10" : "bg-red-500/10"} flex items-center justify-center mx-auto mb-3`}>
                          <TrendingUp className={isProfit ? "text-brand-green" : "text-red-500"} size={22} />
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mb-1">{fc.period}&apos;s Net</div>
                        <div className={`font-display text-xl ${isProfit ? "text-brand-green" : "text-red-500"}`}>
                          {isProfit ? "+" : ""}₦{net.toLocaleString()}
                        </div>
                        <div className={`text-[10px] ${isProfit ? "text-brand-green" : "text-red-500"} uppercase font-bold`}>
                          {isProfit ? "Profit" : "Loss"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Recent Income & Expenses */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-brand-green font-bold">Recent Income</h3>
                    <button className="text-xs text-brand-green font-bold hover:underline">View All</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-[var(--border-subtle)]">
                        <th className="text-left py-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Date</th>
                        <th className="text-left py-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Category</th>
                        <th className="text-right py-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Amount</th>
                      </tr></thead>
                      <tbody>
                        {RECENT_INCOME.length > 0 ? RECENT_INCOME.map((r, i) => (
                          <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
                            <td className="py-2 text-xs text-[var(--text-muted)]">{r.date}</td>
                            <td className="py-2 text-xs text-[var(--text-primary)]">{r.category}</td>
                            <td className="py-2 text-xs text-brand-green font-bold text-right">₦{r.amount.toLocaleString()}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={3} className="py-6 text-center text-sm text-[var(--text-muted)]">No recent income</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-red-500 font-bold">Recent Expenses</h3>
                    <button className="text-xs text-red-500 font-bold hover:underline">View All</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-[var(--border-subtle)]">
                        <th className="text-left py-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Date</th>
                        <th className="text-left py-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Category</th>
                        <th className="text-right py-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Amount</th>
                      </tr></thead>
                      <tbody>
                        {RECENT_EXPENSES.length > 0 ? RECENT_EXPENSES.map((r, i) => (
                          <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
                            <td className="py-2 text-xs text-[var(--text-muted)]">{r.date}</td>
                            <td className="py-2 text-xs text-[var(--text-primary)]">{r.category}</td>
                            <td className="py-2 text-xs text-red-500 font-bold text-right">₦{r.amount.toLocaleString()}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={3} className="py-6 text-center text-sm text-[var(--text-muted)]">No recent expenses</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Yearly Summary */}
              <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                <h3 className="text-brand-green font-bold text-lg mb-4">Yearly Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-5 rounded-xl bg-[var(--surface-disabled)] text-center">
                    <div className="text-xs text-[var(--text-muted)] mb-1">Total Income</div>
                    <div className="font-display text-2xl text-brand-green">₦28.5M</div>
                    <div className="text-[10px] text-brand-green mt-1">+12% from last year</div>
                  </div>
                  <div className="p-5 rounded-xl bg-[var(--surface-disabled)] text-center">
                    <div className="text-xs text-[var(--text-muted)] mb-1">Total Expenses</div>
                    <div className="font-display text-2xl text-red-500">₦8.4M</div>
                    <div className="text-[10px] text-red-500 mt-1">+8% from last year</div>
                  </div>
                  <div className="p-5 rounded-xl bg-[var(--surface-disabled)] text-center">
                    <div className="text-xs text-[var(--text-muted)] mb-1">Net Balance</div>
                    <div className="font-display text-2xl text-brand-green">₦20.1M</div>
                    <div className="text-[10px] text-brand-green mt-1">Profit</div>
                  </div>
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
