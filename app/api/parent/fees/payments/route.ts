import { FeePaymentMethod, FeePaymentStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { computeInvoiceStatus, generatePaymentReference, generateReceiptNumber, getParentFinanceContext } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { getClientIp, jsonNoStore } from "@/lib/requests";

export const runtime = "nodejs";

const schema = z.object({
  invoiceId: z.string().trim().min(1),
  amount: z.number().int().positive().optional(),
  reference: z.string().trim().min(6).optional(),
  method: z.nativeEnum(FeePaymentMethod).optional(),
});

export async function POST(request: NextRequest) {
  const context = await getParentFinanceContext();
  if (!context) {
    return jsonNoStore({ error: "No live parent finance profile is linked to this account yet." }, { status: 404 });
  }

  try {
    const payload = schema.parse(await request.json());
    const link = await prisma.parentStudentLink.findFirst({
      where: {
        parentProfileId: context.profile.id,
        studentProfile: {
          feeInvoices: {
            some: { id: payload.invoiceId },
          },
        },
      },
      select: { studentProfileId: true },
    });

    if (!link) {
      return jsonNoStore({ error: "Invoice not found for this parent account." }, { status: 404 });
    }

    const ipAddress = getClientIp(request);
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.feeInvoice.findUnique({
        where: { id: payload.invoiceId },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          studentProfile: {
            include: {
              currentClass: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new Error("Invoice not found.");
      }

      if (invoice.balanceDue <= 0) {
        throw new Error("This invoice is already fully paid.");
      }

      const amount = Math.min(payload.amount || invoice.balanceDue, invoice.balanceDue);
      const reference = payload.reference || generatePaymentReference();
      const receiptNumber = generateReceiptNumber();
      const method = payload.method || FeePaymentMethod.PAYSTACK;

      const payment = await tx.feePayment.create({
        data: {
          schoolId: context.user.schoolId,
          invoiceId: invoice.id,
          studentProfileId: invoice.studentProfileId,
          parentProfileId: context.profile.id,
          amount,
          method,
          status: FeePaymentStatus.COMPLETED,
          reference,
          receiptNumber,
          providerData: {
            source: "parent-portal",
            modal: "paystack-demo",
          },
        },
      });

      const nextAmountPaid = invoice.amountPaid + amount;
      const nextBalanceDue = Math.max(invoice.totalAmount - nextAmountPaid, 0);
      const nextStatus = computeInvoiceStatus(invoice.totalAmount, nextAmountPaid, invoice.dueDate);

      const updatedInvoice = await tx.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: nextAmountPaid,
          balanceDue: nextBalanceDue,
          status: nextStatus,
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          studentProfile: {
            include: {
              currentClass: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: context.user.schoolId,
          actorUserId: context.user.id,
          action: "FEE_PAYMENT_RECORDED",
          entityType: "FeeInvoice",
          entityId: invoice.id,
          ipAddress,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            amount,
            reference,
            method,
            receiptNumber,
          },
        },
      });

      return { payment, invoice: updatedInvoice };
    });

    return jsonNoStore({
      payment: {
        id: result.payment.id,
        amount: result.payment.amount,
        method: result.payment.method,
        status: result.payment.status,
        reference: result.payment.reference,
        receiptNumber: result.payment.receiptNumber,
        paidAt: result.payment.paidAt.toISOString(),
      },
      invoice: {
        id: result.invoice.id,
        invoiceNumber: result.invoice.invoiceNumber,
        title: result.invoice.title,
        termLabel: result.invoice.termLabel,
        status: result.invoice.status,
        totalAmount: result.invoice.totalAmount,
        amountPaid: result.invoice.amountPaid,
        balanceDue: result.invoice.balanceDue,
        dueDate: result.invoice.dueDate?.toISOString() || null,
        items: result.invoice.items.map((item) => ({
          id: item.id,
          label: item.label,
          amount: item.amount,
          mandatory: item.mandatory,
        })),
        student: {
          studentId: result.invoice.studentProfile.studentId,
          displayName: result.invoice.studentProfile.displayName,
          className: result.invoice.studentProfile.currentClass.displayName,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record fee payment.";
    return jsonNoStore({ error: message }, { status: 400 });
  }
}