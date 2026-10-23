import { NextRequest } from "next/server";
import { PaymentProvider, PaymentStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getParentFinanceContext } from "@/lib/finance";
import { assertNotImpersonating } from "@/lib/session";
import { initializePaystackTransaction } from "@/lib/paystack";
import { getClientIp, jsonNoStore } from "@/lib/requests";
import { logger } from "@/lib/logger";
import { isRetryablePaystackAttempt } from "@/lib/parent-fees";
import {
  completeReservedIdempotency,
  idempotencyRequestHash,
  releaseReservedIdempotency,
  requestMethodForIdempotency,
  requestPathForIdempotency,
  reserveIdempotency,
} from "@/lib/idempotency";

export const runtime = "nodejs";

const schema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().int().positive().optional(),
  method: z.enum(["PAYSTACK", "BANK_TRANSFER"]),
  transferReference: z.string().trim().min(6).max(120).optional(),
  transferDate: z.string().optional(),
  narration: z.string().trim().max(500).optional(),
});

/**
 * Deterministic Paystack reference for an idempotent payment request. Derived
 * from the school + idempotency key (NOT the amount or a random value) so a
 * retry after a crash re-derives the same reference. The DB unique constraint
 * and attempt-level compare-and-set prevent duplicate local postings; provider
 * duplicate-initialization semantics still require staging verification.
 */
function feeReference(invoiceNumber: string, schoolId: string, idemKey: string) {
  const digest = createHash("sha256").update(`${schoolId}:${idemKey}`).digest("hex");
  return `YKC-FEE-${invoiceNumber}-${digest.slice(0, 12).toUpperCase()}`;
}

/**
 * A failed init may only mark the attempt FAILED if this request still owns
 * the idempotency lease. The delete and status transition share one database
 * transaction so a late first request cannot invalidate a retry that took
 * over the expired lease.
 */
async function failPaystackAttemptIfLeaseOwned(input: {
  schoolId: string;
  key: string;
  lockedUntil: Date;
  attemptId: string;
  reference: string;
}) {
  return prisma.$transaction(async (tx) => {
    const released = await tx.idempotencyRecord.deleteMany({
      where: {
        schoolId: input.schoolId,
        scope: "FEE_PAYMENT",
        key: input.key,
        status: "PROCESSING",
        lockedUntil: input.lockedUntil,
      },
    });
    if (released.count !== 1) return false;

    const failed = await tx.feePaymentAttempt.updateMany({
      where: {
        id: input.attemptId,
        schoolId: input.schoolId,
        reference: input.reference,
        provider: PaymentProvider.PAYSTACK,
        status: PaymentStatus.PENDING,
      },
      data: { status: PaymentStatus.FAILED },
    });
    if (failed.count !== 1) {
      throw new Error("PAYMENT_ATTEMPT_CHANGED_BEFORE_FAILURE");
    }
    return true;
  });
}

export async function POST(request: NextRequest) {
  const context = await getParentFinanceContext();
  if (!context) return jsonNoStore({ error: "Parent finance profile not found." }, { status: 403 });
  const impersonating = assertNotImpersonating(context.user);
  if (impersonating) return impersonating;

  // ── Idempotency: a double-click or network retry must NOT create a second
  //    payment attempt (prevents double-charge). The key is RESERVED before
  //    any side effect, so concurrent same-key requests cannot both commit. ──
  const idemKey = request.headers.get("x-idempotency-key")?.trim();
  if (!idemKey || idemKey.length < 16) {
    return jsonNoStore(
      { error: "An x-idempotency-key header (min. 16 chars) is required." },
      { status: 400 },
    );
  }
  let rawBody: unknown;
  let input: z.infer<typeof schema>;
  try {
    rawBody = await request.json();
    input = schema.parse(rawBody);
  } catch {
    return jsonNoStore({ error: "Invalid payment details." }, { status: 400 });
  }
  const requestHash = idempotencyRequestHash({
    method: requestMethodForIdempotency(request),
    path: requestPathForIdempotency(request, "/api/parent/fees/payment-intents"),
    actorId: context.user.id,
    scope: "FEE_PAYMENT",
    body: rawBody,
  });

  const invoice = await prisma.feeInvoice.findFirst({
    where: {
      id: input.invoiceId,
      schoolId: context.user.schoolId,
      OR: [
        { parentProfileId: context.profile.id },
        { studentProfile: { parentLinks: { some: { parentProfileId: context.profile.id } } } },
      ],
    },
    include: { studentProfile: true },
  });

  if (!invoice || invoice.balanceDue <= 0) {
    return jsonNoStore({ error: "Invoice is unavailable or already paid." }, { status: 404 });
  }

  // Reserve BEFORE side effects. Concurrent same-key requests resolve here:
  // replay (completed), 409 conflict (different body) or 409 + Retry-After
  // (another request holds the lease). Only one request ever proceeds.
  const reservation = await reserveIdempotency({
    schoolId: context.user.schoolId,
    scope: "FEE_PAYMENT",
    key: idemKey,
    requestHash,
  });
  if (reservation.outcome !== "reserved") {
    return jsonNoStore(reservation.body, {
      status: reservation.status,
      ...(reservation.outcome === "in-progress"
        ? { headers: { "Retry-After": String(reservation.retryAfterSeconds) } }
        : {}),
    });
  }
  const releaseReservation = () =>
    releaseReservedIdempotency({
      schoolId: context.user.schoolId,
      scope: "FEE_PAYMENT",
      key: idemKey,
      lockedUntil: reservation.lockedUntil,
    });

  const amount = Math.min(input.amount || invoice.balanceDue, invoice.balanceDue);

  if (input.method === "BANK_TRANSFER") {
    if (!input.transferReference) {
      await releaseReservation();
      return jsonNoStore({ error: "Bank transfer reference is required." }, { status: 400 });
    }
    // Capture the narrowed value: property narrowing does not survive into
    // the transaction closure below.
    const transferReference = input.transferReference;

    try {
      const transferResponse = await prisma.$transaction(async (tx) => {
        // Serialize different idempotency keys for the same invoice. Without
        // the invoice row lock, two browsers could both see "no pending
        // attempt" and submit the same bank transfer twice under different
        // references.
        await tx.$queryRaw`SELECT id FROM "FeeInvoice" WHERE id = ${invoice.id} AND "schoolId" = ${context.user.schoolId} FOR UPDATE`;
        const lockedInvoice = await tx.feeInvoice.findFirst({
          where: { id: invoice.id, schoolId: context.user.schoolId },
          select: { balanceDue: true },
        });
        if (!lockedInvoice || lockedInvoice.balanceDue <= 0) {
          throw new Error("INVOICE_NOT_PAYABLE");
        }
        if (lockedInvoice.balanceDue !== invoice.balanceDue) {
          throw new Error("INVOICE_BALANCE_CHANGED");
        }
        const activeAttempt = await tx.feePaymentAttempt.findFirst({
          where: {
            schoolId: context.user.schoolId,
            invoiceId: invoice.id,
            status: PaymentStatus.PENDING,
            provider: { in: [PaymentProvider.PAYSTACK, PaymentProvider.BANK_TRANSFER] },
          },
          select: { id: true },
        });
        if (activeAttempt) throw new Error("PAYMENT_CONFIRMATION_PENDING");

        const duplicate = await tx.feePaymentAttempt.findUnique({
          where: { reference: transferReference },
        });
        if (duplicate) {
          throw new Error("DUPLICATE_TRANSFER_REFERENCE");
        }
        const paidDup = await tx.feePayment.findUnique({
          where: { reference: transferReference },
        });
        if (paidDup) {
          throw new Error("DUPLICATE_TRANSFER_REFERENCE");
        }

        const attempt = await tx.feePaymentAttempt.create({
          data: {
            schoolId: context.user.schoolId,
            invoiceId: invoice.id,
            studentProfileId: invoice.studentProfileId,
            parentProfileId: context.profile.id,
            provider: PaymentProvider.BANK_TRANSFER,
            amount,
            reference: transferReference,
            status: PaymentStatus.PENDING,
            payerEmail: context.profile.user.email,
            transferDate: input.transferDate ? new Date(input.transferDate) : null,
            transferNarration: input.narration || null,
          },
        });

        await tx.auditLog.create({
          data: {
            schoolId: context.user.schoolId,
            actorUserId: context.user.id,
            action: "BANK_TRANSFER_SUBMITTED",
            entityType: "FeePaymentAttempt",
            entityId: attempt.id,
            ipAddress: getClientIp(request),
            metadata: {
              invoiceNumber: invoice.invoiceNumber,
              amount,
              reference: transferReference,
            },
          },
        });

        const responseBody = {
          status: "PENDING_REVIEW",
          message: "Transfer submitted. The bursar will verify it before your invoice is updated.",
          attemptId: attempt.id,
        };
        // Completing inside the transaction means the replayable response
        // commits (or rolls back) with the attempt itself.
        await completeReservedIdempotency(tx, {
          schoolId: context.user.schoolId,
          scope: "FEE_PAYMENT",
          key: idemKey,
          lockedUntil: reservation.lockedUntil,
          response: responseBody,
          statusCode: 201,
        });
        return responseBody;
      });
      return jsonNoStore(transferResponse, { status: 201 });
    } catch (error) {
      if (
        error instanceof Error &&
        ["INVOICE_NOT_PAYABLE", "INVOICE_BALANCE_CHANGED"].includes(error.message)
      ) {
        await releaseReservation();
        return jsonNoStore(
          {
            error:
              "Invoice balance changed. Refresh Fees and review the current amount before paying.",
          },
          { status: 409 },
        );
      }
      if (error instanceof Error && error.message === "PAYMENT_CONFIRMATION_PENDING") {
        await releaseReservation();
        return jsonNoStore(
          {
            error:
              "A payment for this invoice is already awaiting confirmation. Do not submit another transfer or start a card payment until the bursary resolves it.",
          },
          { status: 409 },
        );
      }
      if (error instanceof Error && error.message === "DUPLICATE_TRANSFER_REFERENCE") {
        await releaseReservation();
        return jsonNoStore(
          { error: "This bank transfer reference has already been submitted." },
          { status: 409 },
        );
      }
      if (error instanceof Error && error.message === "IDEMPOTENCY_RESERVATION_LOST") {
        return jsonNoStore(
          {
            error:
              "The request outlived its idempotency lease and was rolled back. Please retry the same request.",
          },
          { status: 409 },
        );
      }
      await releaseReservation();
      return jsonNoStore(
        { error: "Could not record the transfer. Please try again." },
        { status: 500 },
      );
    }
  }

  // PAYSTACK: reference is deterministic per (school, idempotency key), so a
  // retry can never mint a second provider reference. The invoice row lock
  // plus pending-attempt check also prevents distinct idempotency keys (e.g.
  // double-clicks in two tabs) from opening concurrent payments for one
  // invoice. A failed initialization may safely reuse its own FAILED row.
  const reference = feeReference(invoice.invoiceNumber, context.user.schoolId, idemKey);
  const creation = await (async () => {
    try {
      const data = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "FeeInvoice" WHERE id = ${invoice.id} AND "schoolId" = ${context.user.schoolId} FOR UPDATE`;
        const lockedInvoice = await tx.feeInvoice.findFirst({
          where: { id: invoice.id, schoolId: context.user.schoolId },
          select: { balanceDue: true },
        });
        if (!lockedInvoice || lockedInvoice.balanceDue <= 0) {
          throw new Error("INVOICE_NOT_PAYABLE");
        }
        if (lockedInvoice.balanceDue !== invoice.balanceDue) {
          throw new Error("INVOICE_BALANCE_CHANGED");
        }
        const activeAttempt = await tx.feePaymentAttempt.findFirst({
          where: {
            schoolId: context.user.schoolId,
            invoiceId: invoice.id,
            status: PaymentStatus.PENDING,
            provider: { in: [PaymentProvider.PAYSTACK, PaymentProvider.BANK_TRANSFER] },
            // A retry of this exact idempotent request may find its own
            // reference-bound PENDING attempt after a process crash. It is
            // safe to resume that same attempt; only a different outstanding
            // attempt should block a new checkout.
            reference: { not: reference },
          },
          select: { id: true },
        });
        if (activeAttempt) throw new Error("PAYMENT_CONFIRMATION_PENDING");

        const paidReference = await tx.feePayment.findUnique({
          where: { reference },
          select: { id: true },
        });
        if (paidReference) throw new Error("PAYMENT_REFERENCE_ALREADY_USED");

        const existingReference = await tx.feePaymentAttempt.findUnique({ where: { reference } });
        if (
          existingReference &&
          !isRetryablePaystackAttempt(existingReference, {
            schoolId: context.user.schoolId,
            invoiceId: invoice.id,
            studentProfileId: invoice.studentProfileId,
            parentProfileId: context.profile.id,
            amount,
            payerEmail: context.profile.user.email,
          })
        ) {
          // Never recycle a reference from another tenant, parent, invoice,
          // payment provider, or amount. Only this parent's own failed or
          // same-key pending attempt can be resumed.
          throw new Error("PAYMENT_REFERENCE_ALREADY_USED");
        }

        const attempt = existingReference
          ? await tx.feePaymentAttempt.update({
              where: { id: existingReference.id },
              data: {
                invoiceId: invoice.id,
                studentProfileId: invoice.studentProfileId,
                parentProfileId: context.profile.id,
                amount,
                status: PaymentStatus.PENDING,
                payerEmail: context.profile.user.email,
                transferDate: null,
                transferNarration: null,
                providerData: Prisma.DbNull,
                reviewedByUserId: null,
                reviewedAt: null,
              },
            })
          : await tx.feePaymentAttempt.create({
              data: {
                schoolId: context.user.schoolId,
                invoiceId: invoice.id,
                studentProfileId: invoice.studentProfileId,
                parentProfileId: context.profile.id,
                provider: PaymentProvider.PAYSTACK,
                amount,
                reference,
                status: PaymentStatus.PENDING,
                payerEmail: context.profile.user.email,
              },
            });
        return { attempt, prior: Boolean(existingReference) };
      });
      return { ok: true as const, data };
    } catch (error) {
      return { ok: false as const, error };
    }
  })();

  if (!creation.ok) {
    await releaseReservation();
    const message = creation.error instanceof Error ? creation.error.message : "";
    if (message === "INVOICE_NOT_PAYABLE" || message === "INVOICE_BALANCE_CHANGED") {
      return jsonNoStore(
        {
          error:
            "Invoice balance changed. Refresh Fees and review the current amount before paying.",
        },
        { status: 409 },
      );
    }
    if (message === "PAYMENT_CONFIRMATION_PENDING") {
      return jsonNoStore(
        {
          error:
            "A payment for this invoice is already awaiting confirmation. Do not start another payment until the result is shown on your Fees page.",
        },
        { status: 409 },
      );
    }
    if (message === "PAYMENT_REFERENCE_ALREADY_USED") {
      return jsonNoStore(
        {
          error: "This payment reference was already used. Refresh your Fees page before retrying.",
        },
        { status: 409 },
      );
    }
    return jsonNoStore(
      { error: "Could not prepare the payment. Please try again." },
      { status: 500 },
    );
  }

  const { attempt, prior } = creation.data;

  let checkout: Awaited<ReturnType<typeof initializePaystackTransaction>>;
  try {
    checkout = await initializePaystackTransaction({
      email: context.profile.user.email,
      amount: amount * 100,
      reference,
      callbackUrl: `${request.nextUrl.origin}/parent/fees?verify=${encodeURIComponent(reference)}`,
      metadata: {
        kind: "SCHOOL_FEE",
        paymentAttemptId: attempt.id,
        invoiceId: invoice.id,
        schoolId: context.user.schoolId,
      },
    });
  } catch (error) {
    if (prior) {
      // A previous run of THIS SAME request already created an attempt (and
      // possibly a Paystack checkout) with this reference. Keep the attempt
      // PENDING — it is reference-bound and the webhook will match it — and
      // let the parent check status rather than risk a second checkout.
      await releaseReservation();
      return jsonNoStore(
        {
          error:
            "A checkout for this payment was already initiated. Check your payment history or contact the bursary before starting another payment.",
        },
        { status: 409 },
      );
    }

    try {
      const failed = await failPaystackAttemptIfLeaseOwned({
        schoolId: context.user.schoolId,
        key: idemKey,
        lockedUntil: reservation.lockedUntil,
        attemptId: attempt.id,
        reference,
      });
      if (!failed) {
        return jsonNoStore(
          {
            error:
              "This checkout was resumed by another request. Refresh Fees and check the payment status before trying again.",
          },
          { status: 409 },
        );
      }
    } catch (stateError) {
      logger.error("Paystack init failed but its attempt state could not be updated", {
        attemptId: attempt.id,
        reference,
        error: stateError instanceof Error ? stateError.message : String(stateError),
      });
      return jsonNoStore(
        {
          error:
            "We could not confirm whether checkout setup completed. Refresh Fees and contact the bursary with the payment reference before retrying.",
          reference,
          attemptId: attempt.id,
        },
        { status: 503 },
      );
    }

    return jsonNoStore(
      { error: error instanceof Error ? error.message : "Unable to initialize payment." },
      { status: 502 },
    );
  }

  const paystackResponse = {
    reference,
    authorizationUrl: checkout.authorization_url,
    attemptId: attempt.id,
  };
  try {
    await completeReservedIdempotency(prisma, {
      schoolId: context.user.schoolId,
      scope: "FEE_PAYMENT",
      key: idemKey,
      lockedUntil: reservation.lockedUntil,
      response: paystackResponse,
      statusCode: 200,
    });
  } catch (error) {
    // Provider checkout creation succeeded. Never mark the attempt FAILED just
    // because the replay-cache write failed; return the working checkout URL
    // and let the provider/webhook remain the authority for payment state.
    logger.error("Paystack checkout created but idempotency response was not saved", {
      attemptId: attempt.id,
      reference,
      error: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error && error.message === "IDEMPOTENCY_RESERVATION_LOST") {
      return jsonNoStore(
        {
          error:
            "Another request is already resuming this checkout. Refresh Fees and check the payment status before trying again.",
          reference,
          attemptId: attempt.id,
        },
        { status: 409 },
      );
    }
  }
  return jsonNoStore(paystackResponse);
}
