import { FeePaymentStatus } from "@prisma/client";
import { getAdminFinanceContext } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { jsonNoStore } from "@/lib/requests";

function startOfDay(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
function startOfWeek(now: Date) {
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
function startOfYear(now: Date) {
  return new Date(now.getFullYear(), 0, 1);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getAdminFinanceContext();
  if (!context) return jsonNoStore({ error: "Unauthorized" }, { status: 401 });

  const schoolId = context.user.schoolId;
  const [payments, invoices, expenses, pendingTransfers] = await Promise.all([
    prisma.feePayment.findMany({
      where: { schoolId, status: FeePaymentStatus.COMPLETED },
      orderBy: { paidAt: "desc" },
      include: { studentProfile: { include: { currentClass: true } } },
    }),
    prisma.feeInvoice.findMany({
      where: { schoolId },
      include: { studentProfile: { include: { currentClass: true } } },
    }),
    prisma.expense.findMany({
      where: { schoolId },
      orderBy: { spentAt: "desc" },
    }),
    prisma.feePaymentAttempt.count({
      where: { schoolId, provider: "BANK_TRANSFER", status: "PENDING" },
    }),
  ]);

  const now = new Date();
  const windows = [
    { label: "Today", start: startOfDay(now) },
    { label: "This Week", start: startOfWeek(now) },
    { label: "This Month", start: startOfMonth(now) },
    { label: "This Year", start: startOfYear(now) },
  ];

  const cards = windows.map((window) => {
    const income = payments
      .filter((p) => p.paidAt >= window.start)
      .reduce((sum, p) => sum + p.amount, 0);
    const expenseTotal = expenses
      .filter((e) => e.spentAt >= window.start)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      period: window.label,
      income,
      expenses: expenseTotal,
      net: income - expenseTotal,
    };
  });

  const classCollectionsMap = new Map<string, { className: string; billed: number; paid: number }>();
  for (const invoice of invoices) {
    const className = invoice.studentProfile.currentClass.displayName;
    const row = classCollectionsMap.get(className) || { className, billed: 0, paid: 0 };
    row.billed += invoice.totalAmount;
    row.paid += invoice.amountPaid;
    classCollectionsMap.set(className, row);
  }

  const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalCollected = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const totalOutstanding = invoices.reduce((s, i) => s + i.balanceDue, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = payments.reduce((s, p) => s + p.amount, 0);

  return jsonNoStore({
    cards,
    totals: {
      totalIncome,
      totalExpenses,
      netPosition: totalIncome - totalExpenses,
      totalBilled,
      totalOutstanding,
      collectionRate: totalBilled ? Math.round((totalCollected / totalBilled) * 100) : 0,
      pendingBankTransfers: pendingTransfers,
    },
    recentIncome: payments.slice(0, 10).map((p) => ({
      id: p.id,
      date: p.paidAt.toISOString(),
      category: "School fees",
      amount: p.amount,
      desc: `${p.studentProfile.displayName} · ${p.studentProfile.currentClass.displayName}`,
      receiptNumber: p.receiptNumber,
    })),
    recentExpenses: expenses.slice(0, 10).map((e) => ({
      id: e.id,
      date: e.spentAt.toISOString(),
      category: e.category,
      amount: e.amount,
      desc: e.title,
      vendor: e.vendor,
    })),
    classCollections: [...classCollectionsMap.values()]
      .map((row) => ({
        className: row.className,
        billed: row.billed,
        paid: row.paid,
        balance: Math.max(row.billed - row.paid, 0),
        collectionRate: row.billed ? Math.round((row.paid / row.billed) * 100) : 0,
      }))
      .sort((a, b) => b.billed - a.billed),
  });
}
