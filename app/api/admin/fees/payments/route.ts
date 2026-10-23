import { AlertChannel, FeePaymentMethod, NotificationKind, PaymentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFinanceContext, generatePaymentReference } from "@/lib/finance";
import { assertNotImpersonating } from "@/lib/session";
import { postCompletedFeePayment } from "@/lib/fee-payment-service";
import { getClientIp } from "@/lib/requests";
import { createInAppNotification, queueNotificationJob } from "@/lib/notifications";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const cashSchema = z.object({
  action: z.literal("RECORD_CASH"),
  invoiceId: z.string().min(1),
  amount: z.number().int().positive(),
  reference: z.string().trim().min(4).max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

const reviewSchema = z.object({
  action: z.enum(["APPROVE_TRANSFER", "REJECT_TRANSFER"]),
  attemptId: z.string().min(1),
  note: z.string().trim().max(500).optional(),
});

/**
 * MNY-01: reflect bursar decisions to the parent. The in-app notification is
 * durable immediately; an email job is also queued when the account has an
 * email. Provider/queue failure is isolated from a payment that has already
 * committed, and the parent fees API remains the source of truth.
 */
async function notifyParentOfPayment(input: {
  schoolId: string;
  parentProfileId: string | null;
  invoiceId: string;
  title: string;
  body: string;
  dedupeKey: string;
  reference: string;
  amount: number;
}) {
  try {
    let parentProfileId = input.parentProfileId;
    if (!parentProfileId) {
      const invoice = await prisma.feeInvoice.findFirst({
        where: { id: input.invoiceId, schoolId: input.schoolId },
        select: { parentProfileId: true },
      });
      parentProfileId = invoice?.parentProfileId ?? null;
    }
    if (!parentProfileId) return;

    const parent = await prisma.parentProfile.findFirst({
      where: { id: parentProfileId, schoolId: input.schoolId },
      select: {
        userId: true,
        displayName: true,
        phone: true,
        user: { select: { email: true } },
      },
    });
    if (!parent) return;

    try {
      await createInAppNotification({
        schoolId: input.schoolId,
        userId: parent.userId,
        kind: NotificationKind.FEE_REMINDER,
        title: input.title,
        body: input.body,
        link: "/parent/fees",
      });
    } catch (error) {
      logger.error("fee review in-app notification failed", {
        invoiceId: input.invoiceId,
        reference: input.reference,
        error: String(error),
      });
    }

    if (parent.user.email) {
      try {
        await queueNotificationJob({
          schoolId: input.schoolId,
          kind: NotificationKind.FEE_REMINDER,
          channel: AlertChannel.EMAIL,
          subject: input.title,
          body: input.body,
          recipientName: parent.displayName,
          recipientEmail: parent.user.email,
          recipientPhone: parent.phone,
          recipientUserId: parent.userId,
          dedupeKey: input.dedupeKey,
          metadata: {
            invoiceId: input.invoiceId,
            reference: input.reference,
            amount: input.amount,
          },
        });
      } catch (error) {
        logger.error("fee review email notification could not be queued", {
          invoiceId: input.invoiceId,
          reference: input.reference,
          error: String(error),
        });
      }
    }
  } catch (error) {
    logger.error("fee review parent lookup failed", {
      invoiceId: input.invoiceId,
      reference: input.reference,
      error: String(error),
    });
  }
}

function naira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export async function GET() {
  const context = await getAdminFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transfers = await prisma.feePaymentAttempt.findMany({
    take: 500,
    where: {
      schoolId: context.user.schoolId,
      provider: "BANK_TRANSFER",
      status: PaymentStatus.PENDING,
    },
    include: {
      invoice: { select: { invoiceNumber: true, title: true, balanceDue: true } },
      studentProfile: { select: { displayName: true, studentId: true } },
      parentProfile: { select: { displayName: true, phone: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ transfers });
}

export async function POST(request: NextRequest) {
  const context = await getAdminFinanceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const impersonating = assertNotImpersonating(context.user);
  if (impersonating) return impersonating;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const action = (body as { action?: string }).action;

  try {
    if (action === "RECORD_CASH") {
      const input = cashSchema.parse(body);
      const invoice = await prisma.feeInvoice.findFirst({
        where: { id: input.invoiceId, schoolId: context.user.schoolId },
      });
      if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
      if (input.amount > invoice.balanceDue) {
        return NextResponse.json(
          { error: "Cash amount exceeds outstanding balance." },
          { status: 409 },
        );
      }

      const reference = input.reference || generatePaymentReference();
      const result = await postCompletedFeePayment({
        schoolId: context.user.schoolId,
        invoiceId: invoice.id,
        studentProfileId: invoice.studentProfileId,
        parentProfileId: invoice.parentProfileId,
        amount: input.amount,
        method: FeePaymentMethod.CASH,
        reference,
        providerData: { recordedBy: context.user.id, note: input.note || null },
        actorUserId: context.user.id,
      });

      try {
        await prisma.auditLog.create({
          data: {
            schoolId: context.user.schoolId,
            actorUserId: context.user.id,
            action: "CASH_PAYMENT_RECORDED",
            entityType: "FeePayment",
            entityId: result.payment.id,
            ipAddress: getClientIp(request),
            metadata: { reference, amount: input.amount, replay: result.replay },
          },
        });
      } catch (error) {
        // postCompletedFeePayment already wrote the atomic FEE_PAYMENT_POSTED
        // audit row. This extra action label is useful but must not make a
        // committed payment look like a failed request.
        logger.error("cash-payment detail audit failed after payment commit", {
          paymentId: result.payment.id,
          error: String(error),
        });
      }

      if (!result.replay) {
        await notifyParentOfPayment({
          schoolId: context.user.schoolId,
          parentProfileId: invoice.parentProfileId,
          invoiceId: invoice.id,
          title: "Cash payment recorded",
          body: `A cash payment of ${naira(input.amount)} has been recorded against invoice ${invoice.invoiceNumber}. Your updated balance is on the Fees page.`,
          dedupeKey: `fee-cash-recorded:${result.payment.id}`,
          reference,
          amount: input.amount,
        });
      }

      return NextResponse.json({ payment: result.payment, replay: result.replay });
    }

    const input = reviewSchema.parse(body);
    const attempt = await prisma.feePaymentAttempt.findFirst({
      where: {
        id: input.attemptId,
        schoolId: context.user.schoolId,
        provider: "BANK_TRANSFER",
      },
    });

    if (!attempt || attempt.status !== PaymentStatus.PENDING) {
      return NextResponse.json(
        { error: "Transfer is no longer awaiting review." },
        { status: 409 },
      );
    }

    if (input.action === "REJECT_TRANSFER") {
      // Claim the pending attempt atomically. Approval uses the matching
      // PENDING→PAID compare-and-set inside postCompletedFeePayment; only one
      // side of a simultaneous approve/reject can win (MNY-01 money safety).
      const rejected = await prisma.$transaction(async (tx) => {
        const result = await tx.feePaymentAttempt.updateMany({
          where: {
            id: attempt.id,
            schoolId: context.user.schoolId,
            provider: "BANK_TRANSFER",
            status: PaymentStatus.PENDING,
          },
          data: {
            status: PaymentStatus.FAILED,
            reviewedByUserId: context.user.id,
            reviewedAt: new Date(),
            transferNarration: [
              attempt.transferNarration,
              input.note ? `Review: ${input.note}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        });
        if (result.count !== 1) return false;
        await tx.auditLog.create({
          data: {
            schoolId: context.user.schoolId,
            actorUserId: context.user.id,
            action: "BANK_TRANSFER_REJECTED",
            entityType: "FeePaymentAttempt",
            entityId: attempt.id,
            ipAddress: getClientIp(request),
            metadata: { reference: attempt.reference, note: input.note || null },
          },
        });
        return true;
      });
      if (!rejected) {
        return NextResponse.json(
          { error: "Transfer was already reviewed. Refresh the transfer list." },
          { status: 409 },
        );
      }
      await notifyParentOfPayment({
        schoolId: context.user.schoolId,
        parentProfileId: attempt.parentProfileId,
        invoiceId: attempt.invoiceId,
        title: "Bank transfer not confirmed",
        body: `We could not confirm your bank transfer of ${naira(attempt.amount)} (reference ${attempt.reference}), so it has not been applied to your fees.${input.note ? ` Bursary note: ${input.note}` : ""} Please check the Fees page and contact the bursary if the money left your account.`,
        dedupeKey: `fee-transfer-rejected:${attempt.id}`,
        reference: attempt.reference,
        amount: attempt.amount,
      });
      return NextResponse.json({ ok: true });
    }

    const result = await postCompletedFeePayment({
      attemptId: attempt.id,
      schoolId: attempt.schoolId,
      invoiceId: attempt.invoiceId,
      studentProfileId: attempt.studentProfileId,
      parentProfileId: attempt.parentProfileId,
      amount: attempt.amount,
      method: FeePaymentMethod.BANK_TRANSFER,
      reference: attempt.reference,
      providerData: { verifiedBy: context.user.id, note: input.note || null },
      actorUserId: context.user.id,
      requirePendingAttempt: true,
      reviewedByUserId: context.user.id,
    });

    try {
      await prisma.auditLog.create({
        data: {
          schoolId: context.user.schoolId,
          actorUserId: context.user.id,
          action: "BANK_TRANSFER_APPROVED",
          entityType: "FeePaymentAttempt",
          entityId: attempt.id,
          ipAddress: getClientIp(request),
          metadata: {
            reference: attempt.reference,
            amount: attempt.amount,
            paymentId: result.payment.id,
            replay: result.replay,
          },
        },
      });
    } catch (error) {
      // The payment transaction already atomically wrote FEE_PAYMENT_POSTED
      // with this actor and reference. Do not return an error after money has
      // committed merely because this supplemental review label failed.
      logger.error("bank-transfer approval detail audit failed after payment commit", {
        attemptId: attempt.id,
        paymentId: result.payment.id,
        error: String(error),
      });
    }

    if (!result.replay) {
      await notifyParentOfPayment({
        schoolId: context.user.schoolId,
        parentProfileId: attempt.parentProfileId,
        invoiceId: attempt.invoiceId,
        title: "Bank transfer confirmed",
        body: `Your bank transfer of ${naira(attempt.amount)} (reference ${attempt.reference}) has been confirmed by the bursary and applied to your fees. Receipt ${result.payment.receiptNumber} is available on the Fees page.`,
        dedupeKey: `fee-transfer-approved:${attempt.id}`,
        reference: attempt.reference,
        amount: attempt.amount,
      });
    }

    return NextResponse.json({ payment: result.payment, replay: result.replay });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process payment.";
    const status = /already been reviewed|already reviewed/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
