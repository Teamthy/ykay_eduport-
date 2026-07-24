import { FeePaymentStatus } from "@prisma/client";
import { getAdminFinanceContext } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { jsonNoStore } from "@/lib/requests";

export const runtime = "nodejs";

export async function GET() {
  const context = await getAdminFinanceContext();
  if (!context) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const [invoices, recentPayments] = await Promise.all([
    prisma.feeInvoice.findMany({
      where: { schoolId: context.user.schoolId },
      orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
      include: {
        studentProfile: {
          include: { currentClass: true },
        },
        parentProfile: true,
      },
    }),
    prisma.feePayment.findMany({
      where: {
        schoolId: context.user.schoolId,
        status: FeePaymentStatus.COMPLETED,
      },
      orderBy: { paidAt: "desc" },
      take: 8,
      include: {
        studentProfile: {
          include: { currentClass: true },
        },
      },
    }),
  ]);

  const totalBilled = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const totalCollected = invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
  const totalOutstanding = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
  const collectionRate = totalBilled ? Math.round((totalCollected / totalBilled) * 100) : 0;

  return jsonNoStore({
    summary: {
      totalBilled,
      totalCollected,
      totalOutstanding,
      collectionRate,
      invoiceCount: invoices.length,
      paidInvoices: invoices.filter((invoice) => invoice.status === "PAID").length,
      partialInvoices: invoices.filter((invoice) => invoice.status === "PARTIAL").length,
      unpaidInvoices: invoices.filter(
        (invoice) => invoice.status === "UNPAID" || invoice.status === "OVERDUE",
      ).length,
    },
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      termLabel: invoice.termLabel,
      status: invoice.status,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      dueDate: invoice.dueDate?.toISOString() || null,
      issuedAt: invoice.issuedAt.toISOString(),
      student: {
        studentId: invoice.studentProfile.studentId,
        displayName: invoice.studentProfile.displayName,
        className: invoice.studentProfile.currentClass.displayName,
      },
      parent: {
        displayName:
          invoice.parentProfile?.displayName ||
          invoice.studentProfile.guardianName ||
          "Parent record pending",
      },
    })),
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference,
      receiptNumber: payment.receiptNumber,
      paidAt: payment.paidAt.toISOString(),
      student: {
        studentId: payment.studentProfile.studentId,
        displayName: payment.studentProfile.displayName,
        className: payment.studentProfile.currentClass.displayName,
      },
    })),
  });
}
