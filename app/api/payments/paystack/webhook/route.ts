import { FeePaymentMethod } from "@prisma/client";
import { NextRequest } from "next/server";
import { isPaystackReady } from "@/lib/env";
import { APPLICATION_FEE_KOBO } from "@/lib/admissions";
import { markApplicationPaid } from "@/lib/admission-service";
import { postCompletedFeePayment } from "@/lib/fee-payment-service";
import { prisma } from "@/lib/prisma";
import {
  PAYSTACK_WEBHOOK_UNAVAILABLE_MESSAGE,
  paystackUnavailableBody,
  toPrismaJson,
  verifyPaystackWebhookSignature,
} from "@/lib/paystack";
import { jsonNoStore } from "@/lib/requests";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

interface PaystackWebhookPayload {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    status?: string;
    paid_at?: string | null;
    metadata?: { kind?: string; paymentAttemptId?: string; invoiceId?: string };
  };
}

async function recordReconciliationIssue(input: {
  reference: string;
  reason: string;
  expectedAmount?: number;
  receivedAmount?: number;
  currency?: string;
  payload: PaystackWebhookPayload;
}) {
  await prisma.paymentReconciliationIssue.upsert({
    where: { provider_reference: { provider: "PAYSTACK", reference: input.reference } },
    create: {
      provider: "PAYSTACK",
      reference: input.reference,
      reason: input.reason,
      expectedAmount: input.expectedAmount,
      receivedAmount: input.receivedAmount,
      receivedCurrency: input.currency,
      payload: toPrismaJson(input.payload),
    },
    update: {
      reason: input.reason,
      expectedAmount: input.expectedAmount,
      receivedAmount: input.receivedAmount,
      receivedCurrency: input.currency,
      payload: toPrismaJson(input.payload),
      status: "OPEN",
      resolutionNote: null,
      resolvedByUserId: null,
      resolvedAt: null,
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isPaystackReady()) {
    return jsonNoStore(paystackUnavailableBody(PAYSTACK_WEBHOOK_UNAVAILABLE_MESSAGE), {
      status: 503,
    });
  }

  const rawBody = await request.text();

  try {
    if (!verifyPaystackWebhookSignature(rawBody, request.headers.get("x-paystack-signature"))) {
      return jsonNoStore({ error: "Invalid webhook signature." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as PaystackWebhookPayload;
    if (payload.event !== "charge.success" || !payload.data?.reference) {
      return jsonNoStore({ ok: true });
    }

    const reference = payload.data.reference;

    // 1) School fee attempts (preferred path)
    const feeAttempt = await prisma.feePaymentAttempt.findUnique({ where: { reference } });
    if (feeAttempt) {
      if (
        payload.data.amount !== feeAttempt.amount * 100 ||
        payload.data.currency !== "NGN" ||
        payload.data.status !== "success"
      ) {
        await recordReconciliationIssue({
          reference,
          reason:
            "Fee payment webhook amount, currency, or provider status does not match the pending attempt.",
          expectedAmount: feeAttempt.amount * 100,
          receivedAmount: payload.data.amount,
          currency: payload.data.currency,
          payload,
        });
        logger.error("Paystack fee payment requires reconciliation", {
          reference,
          attemptId: feeAttempt.id,
        });
        return jsonNoStore({ ok: true });
      }

      await postCompletedFeePayment({
        attemptId: feeAttempt.id,
        schoolId: feeAttempt.schoolId,
        invoiceId: feeAttempt.invoiceId,
        studentProfileId: feeAttempt.studentProfileId,
        parentProfileId: feeAttempt.parentProfileId,
        amount: feeAttempt.amount,
        method: FeePaymentMethod.PAYSTACK,
        reference: feeAttempt.reference,
        providerData: toPrismaJson(payload),
      });
      return jsonNoStore({ ok: true });
    }

    // 2) Admissions application fee
    const application = await prisma.admissionApplication.findUnique({
      where: { paymentReference: reference },
      select: { applicationId: true, parentEmail: true },
    });

    if (!application) {
      await recordReconciliationIssue({
        reference,
        reason:
          "Authenticated successful provider event has no matching fee attempt or admission application.",
        receivedAmount: payload.data.amount,
        currency: payload.data.currency,
        payload,
      });
      logger.error("Unmatched Paystack success event requires reconciliation", { reference });
      return jsonNoStore({ ok: true });
    }

    if (
      payload.data.amount !== APPLICATION_FEE_KOBO ||
      payload.data.currency !== "NGN" ||
      payload.data.status !== "success"
    ) {
      await recordReconciliationIssue({
        reference,
        reason:
          "Admission fee webhook amount, currency, or provider status does not match the expected fee.",
        expectedAmount: APPLICATION_FEE_KOBO,
        receivedAmount: payload.data.amount,
        currency: payload.data.currency,
        payload,
      });
      logger.error("Paystack admission payment requires reconciliation", { reference });
      return jsonNoStore({ ok: true });
    }

    await markApplicationPaid(application.applicationId, reference, toPrismaJson(payload));
    return jsonNoStore({ ok: true });
  } catch (error) {
    logger.error("Paystack webhook failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonNoStore({ error: "Webhook processing failed." }, { status: 500 });
  }
}
