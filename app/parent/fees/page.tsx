"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import PaystackModal from "@/components/PaystackModal";
import ReceiptModal from "@/components/ReceiptModal";
import { useToast } from "@/components/Toast";
import { LayoutDashboard, CalendarDays, CreditCard, FileText, MessageCircle, Calendar, Download, Receipt as ReceiptIcon } from "lucide-react";
import { ReceiptData } from "@/lib/receipt";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/parent/attendance", icon: CalendarDays },
  { label: "Fees", href: "/parent/fees", icon: CreditCard },
  { label: "Report Cards", href: "/parent/report-cards", icon: FileText },
  { label: "Messages", href: "/parent/messages", icon: MessageCircle, badge: "1" },
  { label: "Events", href: "/parent/events", icon: Calendar },
];

const INVOICE = {
  invoiceNo: "YKC-INV-2025-003",
  studentName: "Adeola Ogunlade",
  studentClass: "JSS1",
  studentId: "YKC/2025/001",
  parentName: "Mrs. Chinwe Ogunlade",
  parentPhone: "07015374411",
  parentEmail: "parent.a@email.com",
  term: "First Term 2025/2026",
  feeItems: [
    { label: "Tuition Fee (JSS)", amount: 85000 },
    { label: "Development Levy", amount: 15000 },
    { label: "Exam Fee", amount: 8000 },
    { label: "ICT Levy", amount: 12000 },
    { label: "PTA Levy", amount: 5000 },
  ],
  total: 125000,
  dueDate: "2025-08-15",
};

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  ref: string;
  receiptNo: string;
}

const INITIAL_HISTORY: Payment[] = [
  { id: "1", date: "2025-07-19", amount: 80000, method: "Bank Transfer", ref: "TRF-7732-9901", receiptNo: "YKC-RCP-2025-0001" },
];

export default function ParentFeesPage() {
  const { toast } = useToast();
  const [showPaystack, setShowPaystack] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [history, setHistory] = useState<Payment[]>(INITIAL_HISTORY);

  const totalPaid = history.reduce((s, p) => s + p.amount, 0);
  const remaining = INVOICE.total - totalPaid;

  const buildReceiptData = (payment: Payment): ReceiptData => ({
    receiptNo: payment.receiptNo,
    date: payment.date,
    studentName: INVOICE.studentName,
    studentClass: INVOICE.studentClass,
    studentId: INVOICE.studentId,
    parentName: INVOICE.parentName,
    parentPhone: INVOICE.parentPhone,
    parentEmail: INVOICE.parentEmail,
    feeItems: INVOICE.feeItems,
    totalPaid: payment.amount,
    paymentMethod: payment.method,
    paymentReference: payment.ref,
    term: INVOICE.term,
  });

  const handlePaymentSuccess = (ref: string) => {
    const receiptNo = `YKC-RCP-${new Date().getFullYear()}-${String(history.length + 1).padStart(4, "0")}`;
    const newPayment: Payment = {
      id: String(history.length + 1),
      date: new Date().toISOString().split("T")[0],
      amount: remaining,
      method: "Paystack Card",
      ref,
      receiptNo,
    };

    setHistory([...history, newPayment]);
    toast(`Payment of ₦${remaining.toLocaleString()} successful!`, "success");

    // Auto-open receipt modal after payment
    setTimeout(() => {
      setReceiptData(buildReceiptData(newPayment));
      setShowReceipt(true);
    }, 500);
  };

  const viewReceipt = (payment: Payment) => {
    setReceiptData(buildReceiptData(payment));
    setShowReceipt(true);
  };

  return (
    <>
      <Header />
      <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">
        <section className="pt-32 pb-10 bg-brand-navy px-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-[42px] md:text-[64px] tracking-[3px] text-white mb-4">
              PARENT <span className="text-brand-green">FEES</span>
            </h1>
            <p className="text-white/60">Pay fees securely via Paystack. Save or share your receipt to WhatsApp instantly.</p>
          </div>
        </section>

        <section className="py-10 px-6">
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-8">
            <PortalSidebar portalName="Parent" portalType="parent" items={SIDEBAR_ITEMS} />

            <div className="flex-1 space-y-6">
              {/* Invoice Card */}
              <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] overflow-hidden shadow-[var(--card-shadow)]">
                <div className="bg-brand-navy p-8">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-display text-2xl text-white">Current Term Invoice</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                      remaining === 0 ? "bg-brand-green text-white" : "bg-brand-orange text-white"
                    }`}>
                      {remaining === 0 ? "Fully Paid ✓" : "Partial"}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm">{INVOICE.invoiceNo} · {INVOICE.term}</p>
                  <p className="text-white/60 text-xs mt-1">For: {INVOICE.studentName} · {INVOICE.studentClass}</p>
                </div>

                <div className="p-8">
                  <table className="w-full mb-6">
                    <tbody>
                      {INVOICE.feeItems.map((item, i) => (
                        <tr key={i} className="border-b border-[var(--border-subtle)]">
                          <td className="py-3 text-[var(--text-primary)]">{item.label}</td>
                          <td className="py-3 text-brand-green font-bold text-right">₦{item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-[var(--surface-disabled)]">
                        <td className="py-3 px-3 font-bold text-[var(--text-primary)]">Total Bill</td>
                        <td className="py-3 px-3 font-display text-xl text-[var(--text-primary)] text-right">₦{INVOICE.total.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className={`rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    remaining > 0 ? "bg-brand-orange/10 border border-brand-orange/30" : "bg-brand-green/10 border border-brand-green/30"
                  }`}>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-1">
                        {remaining > 0 ? "Outstanding Balance" : "Status"}
                      </div>
                      <div className={`font-display text-3xl ${remaining > 0 ? "text-brand-orange" : "text-brand-green"}`}>
                        {remaining > 0 ? `₦${remaining.toLocaleString()}` : "Fully Paid ✓"}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        {remaining > 0 ? `Paid so far: ₦${totalPaid.toLocaleString()}` : "Thank you for your prompt payment"}
                      </div>
                    </div>
                    {remaining > 0 && (
                      <button
                        onClick={() => setShowPaystack(true)}
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-brand-green text-white font-bold uppercase tracking-widest text-sm hover:bg-brand-green-dark transition-all shadow-lg animate-pulse"
                      >
                        <CreditCard size={18} /> Pay ₦{remaining.toLocaleString()} Now
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment History with clickable receipts */}
              <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 shadow-[var(--card-shadow)]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-xl text-[var(--text-primary)]">Payment History & Receipts</h3>
                  <span className="text-xs px-3 py-1 rounded-full bg-brand-green/10 text-brand-green font-bold">{history.length} receipts</span>
                </div>

                {history.length === 0 ? (
                  <p className="text-center py-8 text-[var(--text-muted)]">No payments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {history.map(p => (
                      <div key={p.id} className="p-5 rounded-xl bg-[var(--surface-disabled)] hover:bg-[var(--surface-card-hover)] transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                            <ReceiptIcon size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-bold text-[var(--text-primary)] text-lg">₦{p.amount.toLocaleString()}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green font-bold uppercase tracking-widest">
                                Paid
                              </span>
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {p.date} · {p.method}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                              {p.receiptNo}
                            </div>
                          </div>
                          <button
                            onClick={() => viewReceipt(p)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-green text-white font-bold text-xs uppercase tracking-widest hover:bg-brand-green-dark transition-all shrink-0"
                          >
                            <Download size={14} /> View & Save
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 p-4 rounded-xl bg-brand-orange/10 border border-brand-orange/30 text-xs text-brand-orange">
                  💡 <strong>Tip:</strong> Click "View & Save" on any receipt to download as PDF or share directly to WhatsApp.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Paystack Payment Modal */}
      <PaystackModal
        open={showPaystack}
        amount={remaining}
        email={INVOICE.parentEmail}
        onClose={() => setShowPaystack(false)}
        onSuccess={handlePaymentSuccess}
      />

      {/* Receipt Preview & Share Modal */}
      <ReceiptModal
        open={showReceipt}
        data={receiptData}
        onClose={() => setShowReceipt(false)}
      />
    </>
  );
}
