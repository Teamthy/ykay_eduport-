"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import PaystackModal from "@/components/PaystackModal";
import ReceiptModal from "@/components/ReceiptModal";
import { useToast } from "@/components/Toast";
import { ReceiptData } from "@/lib/receipt";
import {
  Calendar,
  CalendarDays,
  CreditCard,
  Download,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  MessageCircle,
  Receipt as ReceiptIcon,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/parent/attendance", icon: CalendarDays },
  { label: "Fees", href: "/parent/fees", icon: CreditCard },
  { label: "Report Cards", href: "/parent/report-cards", icon: FileText },
  { label: "Messages", href: "/parent/messages", icon: MessageCircle, badge: "1" },
  { label: "Events", href: "/parent/events", icon: Calendar },
];

type ParentFeesResponse = {
  parent: {
    displayName: string;
    phone: string | null;
    email: string | null;
  };
  children: Array<{
    id: string;
    studentId: string;
    displayName: string;
    className: string;
    relationship?: string | null;
    isPrimary: boolean;
  }>;
  selectedChild: {
    id: string;
    studentId: string;
    displayName: string;
    className: string;
    relationship?: string | null;
    isPrimary: boolean;
  } | null;
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
  }>;
  selectedInvoice: {
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
    items: Array<{ id: string; label: string; amount: number; mandatory: boolean }>;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    reference: string;
    receiptNumber: string;
    paidAt: string;
  }>;
  summary: {
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
  };
};

type PaymentResponse = {
  payment: {
    id: string;
    amount: number;
    method: string;
    status: string;
    reference: string;
    receiptNumber: string;
    paidAt: string;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    title: string;
    termLabel: string;
    status: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    dueDate: string | null;
    items: Array<{ id: string; label: string; amount: number; mandatory: boolean }>;
    student: {
      studentId: string;
      displayName: string;
      className: string;
    };
  };
};

function formatMethod(method: string) {
  return method.replaceAll("_", " ");
}

export default function ParentFeesPage() {
  const { toast } = useToast();
  const [data, setData] = useState<ParentFeesResponse | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPaystack, setShowPaystack] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  async function loadFees(opts?: { studentId?: string; invoiceId?: string }) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      const studentId = opts?.studentId || selectedStudentId;
      const invoiceId = opts?.invoiceId || selectedInvoiceId;
      if (studentId) params.set("studentId", studentId);
      if (invoiceId) params.set("invoiceId", invoiceId);
      const response = await fetch(`/api/parent/fees?${params.toString()}`, { cache: "no-store" });
      const body = (await response.json()) as ParentFeesResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load fee records.");
      setData(body);
      if (body.selectedChild?.id) setSelectedStudentId(body.selectedChild.id);
      if (body.selectedInvoice?.id) setSelectedInvoiceId(body.selectedInvoice.id);
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load fee records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, selectedInvoiceId]);

  const selectedInvoice = data?.selectedInvoice || null;
  const remaining = selectedInvoice?.balanceDue || 0;

  const paymentSummary = useMemo(() => {
    if (!data) return { receipts: 0 };
    return { receipts: data.payments.length };
  }, [data]);

  const buildReceiptData = (result: PaymentResponse): ReceiptData => ({
    receiptNo: result.payment.receiptNumber,
    date: new Date(result.payment.paidAt).toLocaleDateString(),
    studentName: result.invoice.student.displayName,
    studentClass: result.invoice.student.className,
    studentId: result.invoice.student.studentId,
    parentName: data?.parent.displayName || "Parent",
    parentPhone: data?.parent.phone || "",
    parentEmail: data?.parent.email || "",
    feeItems: result.invoice.items.map((item) => ({ label: item.label, amount: item.amount })),
    totalPaid: result.payment.amount,
    paymentMethod: formatMethod(result.payment.method),
    paymentReference: result.payment.reference,
    term: result.invoice.termLabel,
  });

  async function handlePaymentSuccess(reference: string) {
    if (!selectedInvoice) return;
    setProcessingPayment(true);
    try {
      const response = await fetch("/api/parent/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: selectedInvoice.balanceDue,
          reference,
          method: "PAYSTACK",
        }),
      });
      const body = (await response.json()) as PaymentResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to record payment.");
      toast(`Payment of â‚¦${body.payment.amount.toLocaleString()} recorded successfully.`, "success");
      setReceiptData(buildReceiptData(body));
      setShowReceipt(true);
      await loadFees({ studentId: selectedStudentId, invoiceId: selectedInvoice.id });
    } catch (paymentError) {
      toast(paymentError instanceof Error ? paymentError.message : "Unable to record payment.", "error");
    } finally {
      setProcessingPayment(false);
      setShowPaystack(false);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pb-10 pt-24">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-[42px] tracking-[3px] text-white md:text-[64px]">
              PARENT <span className="text-brand-green">FEES</span>
            </h1>
            <p className="mt-3 text-white/60">Live fee invoices, payment history, and receipts backed by the database.</p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <PortalSidebar portalName="Parent" portalType="parent" items={SIDEBAR_ITEMS} />

            <div className="flex-1 space-y-6">
              {loading ? (
                <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading fee ledger...
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
                  <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                    <h3 className="mb-4 font-display text-sm tracking-[2px] text-[var(--text-primary)]">My Children</h3>
                    <div className="flex flex-wrap gap-3">
                      {data.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => {
                            setSelectedStudentId(child.id);
                            setSelectedInvoiceId("");
                          }}
                          className={`rounded-xl border px-5 py-4 text-left transition-all ${
                            data.selectedChild?.id === child.id
                              ? "border-brand-green/30 bg-brand-green/5"
                              : "border-[var(--border-subtle)] bg-[var(--surface-disabled)] hover:border-brand-green/20"
                          }`}
                        >
                          <div className="font-display text-base tracking-[2px] text-[var(--text-primary)]">{child.displayName}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">{child.className} Â· ID: {child.studentId}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-3">
                    {[
                      { label: "Total Billed", value: data.summary.totalBilled, accent: "text-brand-green" },
                      { label: "Total Paid", value: data.summary.totalPaid, accent: "text-brand-green" },
                      { label: "Outstanding", value: data.summary.totalOutstanding, accent: "text-brand-orange" },
                    ].map((card) => (
                      <div key={card.label} className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)]">
                        <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{card.label}</div>
                        <div className={`font-display text-2xl ${card.accent}`}>â‚¦{card.value.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
                    <div className="space-y-6">
                      <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] overflow-hidden shadow-[var(--card-shadow)]">
                        <div className="bg-brand-navy p-8">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h2 className="font-display text-2xl text-white">Current Invoice</h2>
                              <p className="mt-1 text-xs text-white/60">{selectedInvoice?.invoiceNumber || "No invoice selected"}</p>
                            </div>
                            {selectedInvoice ? (
                              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${selectedInvoice.status === "PAID" ? "bg-brand-green text-white" : selectedInvoice.status === "PARTIAL" ? "bg-brand-orange text-white" : "bg-red-500 text-white"}`}>
                                {selectedInvoice.status}
                              </span>
                            ) : null}
                          </div>
                          {data.invoices.length > 1 ? (
                            <select
                              value={selectedInvoiceId}
                              onChange={(event) => setSelectedInvoiceId(event.target.value)}
                              className="mt-6 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none"
                            >
                              {data.invoices.map((invoice) => (
                                <option key={invoice.id} value={invoice.id} className="text-black">
                                  {invoice.termLabel} Â· {invoice.invoiceNumber}
                                </option>
                              ))}
                            </select>
                          ) : null}
                        </div>

                        <div className="p-8">
                          {selectedInvoice ? (
                            <>
                              <div className="mb-6 grid gap-3 text-sm text-[var(--text-secondary)] md:grid-cols-2">
                                <div>
                                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Title</div>
                                  <div className="mt-1 font-semibold text-[var(--text-primary)]">{selectedInvoice.title}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Term</div>
                                  <div className="mt-1 font-semibold text-[var(--text-primary)]">{selectedInvoice.termLabel}</div>
                                </div>
                              </div>

                              <table className="mb-6 w-full">
                                <tbody>
                                  {selectedInvoice.items.map((item) => (
                                    <tr key={item.id} className="border-b border-[var(--border-subtle)]">
                                      <td className="py-3 text-[var(--text-primary)]">{item.label}</td>
                                      <td className="py-3 text-right font-bold text-brand-green">â‚¦{item.amount.toLocaleString()}</td>
                                    </tr>
                                  ))}
                                  <tr className="bg-[var(--surface-disabled)]">
                                    <td className="px-3 py-3 font-bold text-[var(--text-primary)]">Total Bill</td>
                                    <td className="px-3 py-3 text-right font-display text-xl text-[var(--text-primary)]">â‚¦{selectedInvoice.totalAmount.toLocaleString()}</td>
                                  </tr>
                                </tbody>
                              </table>

                              <div className={`flex flex-col justify-between gap-4 rounded-xl border p-6 md:flex-row md:items-center ${remaining > 0 ? "border-brand-orange/30 bg-brand-orange/10" : "border-brand-green/30 bg-brand-green/10"}`}>
                                <div>
                                  <div className="mb-1 text-xs uppercase tracking-widest text-[var(--text-muted)]">Outstanding Balance</div>
                                  <div className={`font-display text-3xl ${remaining > 0 ? "text-brand-orange" : "text-brand-green"}`}>
                                    {remaining > 0 ? `â‚¦${remaining.toLocaleString()}` : "Fully Paid âœ“"}
                                  </div>
                                  <div className="mt-1 text-xs text-[var(--text-muted)]">Paid so far: â‚¦{selectedInvoice.amountPaid.toLocaleString()}</div>
                                </div>
                                {remaining > 0 ? (
                                  <button
                                    onClick={() => setShowPaystack(true)}
                                    disabled={processingPayment}
                                    className="inline-flex items-center gap-2 rounded-full bg-brand-green px-8 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-brand-green-dark disabled:opacity-50"
                                  >
                                    {processingPayment ? <LoaderCircle className="animate-spin" size={18} /> : <CreditCard size={18} />} Pay â‚¦{remaining.toLocaleString()} Now
                                  </button>
                                ) : null}
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-[var(--text-muted)]">No invoice available for the selected child yet.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                      <div className="mb-6 flex items-center justify-between">
                        <h3 className="font-display text-xl text-[var(--text-primary)]">Payment History & Receipts</h3>
                        <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-bold text-brand-green">{paymentSummary.receipts} receipt{paymentSummary.receipts === 1 ? "" : "s"}</span>
                      </div>

                      {data.payments.length ? (
                        <div className="space-y-3">
                          {data.payments.map((payment) => (
                            <button
                              key={payment.id}
                              onClick={() => {
                                if (!selectedInvoice) return;
                                setReceiptData({
                                  receiptNo: payment.receiptNumber,
                                  date: new Date(payment.paidAt).toLocaleDateString(),
                                  studentName: data.selectedChild?.displayName || "Student",
                                  studentClass: data.selectedChild?.className || "Class",
                                  studentId: data.selectedChild?.studentId || "ID",
                                  parentName: data.parent.displayName,
                                  parentPhone: data.parent.phone || "",
                                  parentEmail: data.parent.email || "",
                                  feeItems: selectedInvoice.items.map((item) => ({ label: item.label, amount: item.amount })),
                                  totalPaid: payment.amount,
                                  paymentMethod: formatMethod(payment.method),
                                  paymentReference: payment.reference,
                                  term: selectedInvoice.termLabel,
                                });
                                setShowReceipt(true);
                              }}
                              className="w-full rounded-xl bg-[var(--surface-disabled)] p-5 text-left transition-colors hover:bg-[var(--surface-card-hover)]"
                            >
                              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green shrink-0">
                                  <ReceiptIcon size={22} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="mb-1 flex items-center gap-3">
                                    <span className="text-lg font-bold text-[var(--text-primary)]">â‚¦{payment.amount.toLocaleString()}</span>
                                    <span className="rounded-full bg-brand-green/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-green">{payment.status}</span>
                                  </div>
                                  <div className="text-xs text-[var(--text-muted)]">{new Date(payment.paidAt).toLocaleDateString()} Â· {formatMethod(payment.method)}</div>
                                  <div className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">{payment.receiptNumber}</div>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white">
                                  <Download size={14} /> View receipt
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="py-8 text-center text-[var(--text-muted)]">No payments recorded yet for the selected invoice.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <PaystackModal
        open={showPaystack}
        amount={remaining}
        email={data?.parent.email || "parent@example.com"}
        onClose={() => setShowPaystack(false)}
        onSuccess={handlePaymentSuccess}
      />

      <ReceiptModal open={showReceipt} data={receiptData} onClose={() => setShowReceipt(false)} />
    </>
  );
}