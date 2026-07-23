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

export async function GET() {
  const context = await getAdminFinanceContext();
  if (!context) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const payments = await prisma.feePayment.findMany({
    where: {
      schoolId: context.user.schoolId,
      status: FeePaymentStatus.COMPLETED,
    },
    orderBy: { paidAt: "desc" },
    include: {
      studentProfile: {
        include: {
          currentClass: true,
        },
      },
    },
  });

  const invoices = await prisma.feeInvoice.findMany({
    where: { schoolId: context.user.schoolId },
    include: {
      studentProfile: {
        include: { currentClass: true },
      },
    },
  });

  const now = new Date();
  const windows = [
    { label: "Today", start: startOfDay(now) },
    { label: "This Week", start: startOfWeek(now) },
    { label: "This Month", start: startOfMonth(now) },
    { label: "This Year", start: startOfYear(now) },
  ];

  const cards = windows.map((window) => {
    const income = payments
      .filter((payment) => payment.paidAt >= window.start)
      .reduce((sum, payment) => sum + payment.amount, 0);
    return {
      period: window.label,
      income,
      expenses: 0,
      net: income,
    };
  });

  const classCollectionsMap = new Map<string, { className: string; billed: number; paid: number }>();
  for (const invoice of invoices) {
    const className = invoice.studentProfile.currentClass.displayName;
    const current = classCollectionsMap.get(className) || { className, billed: 0, paid: 0 };
    current.billed += invoice.totalAmount;
    current.paid += invoice.amountPaid;
    classCollectionsMap.set(className, current);
  }

  const classCollections = [...classCollectionsMap.values()]
    .map((item) => ({
      ...item,
      balance: Math.max(item.billed - item.paid, 0),
      collectionRate: item.billed ? Math.round((item.paid / item.billed) * 100) : 0,
    }))
    .sort((left, right) => right.paid - left.paid || left.className.localeCompare(right.className));

  return jsonNoStore({
    cards,
    totals: {
      totalIncome: payments.reduce((sum, payment) => sum + payment.amount, 0),
      totalBilled: invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
      totalOutstanding: invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0),
      collectionRate: invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
        ? Math.round(
            (invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0) /
              invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)) *
              100
          )
        : 0,
    },
    recentIncome: payments.slice(0, 8).map((payment) => ({
      id: payment.id,
      date: payment.paidAt.toISOString(),
      category: payment.method,
      amount: payment.amount,
      desc: `${payment.studentProfile.displayName} â€” ${payment.studentProfile.currentClass.displayName} fees`,
      receiptNumber: payment.receiptNumber,
    })),
    classCollections,
  });
}