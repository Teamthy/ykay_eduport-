import { NextRequest } from "next/server";
import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getParentFinanceContext } from "@/lib/finance";
import { assertNotImpersonating } from "@/lib/session";
import { initializePaystackTransaction } from "@/lib/paystack";
import { getClientIp, jsonNoStore } from "@/lib/requests";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const schema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().int().positive().optional(),
  method: z.enum(["PAYSTACK", "BANK_TRANSFER"]),
  transferReference: z.string().trim().min(6).max(120).optional(),
  transferDate: z.string().optional(),
  narration: z.string().trim().max(500).optional(),
});

function feeReference(invoiceNumber: string) {
  return `YKC-FEE-${invoiceNumber}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  const context = await getParentFinanceContext();
  if (!context) return jsonNoStore({ error: "Parent finance profile not found." }, { status: 403 });
  const impersonating = assertNotImpersonating(context.user);
  if (impersonating) return impersonating;

  // ── Idempotency: a double-click or network retry must NOT create a second
  //    payment attempt (prevents double-charge). Mirrors the pattern in
  //    /api/admin/students using the IdempotencyRecord table. ──
  const idemKey = request.headers.get("x-idempotency-key")?.trim();
  if (!idemKey || idemKey.length < 16) {
    return jsonNoStore({ error: "An x-idempotency-key header (min. 16 chars) is required." }, { status: 400 });
  }
  const existingPayment = await prisma.idempotencyRecord.findUnique({
    where: {
      schoolId_scope_key: {
        schoolId: context.user.schoolId,
        scope: "FEE_PAYMENT",
        key: idemKey,
      },
    },
  });
  if (existingPayment) {
    return jsonNoStore(
      { ...(existingPayment.response as object), idempotentReplay: true },
      { status: existingPayment.statusCode },
    );
  }

  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await request.json());
  } catch {
    return jsonNoStore({ error: "Invalid payment details." }, { status: 400 });
  }

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

  const amount = Math.min(input.amount || invoice.balanceDue, invoice.balanceDue);

  if (input.method === "BANK_TRANSFER") {
    if (!input.transferReference) {
      return jsonNoStore({ error: "Bank transfer reference is required." }, { status: 400 });
    }
    const duplicate = await prisma.feePaymentAttempt.findUnique({
      where: { reference: input.transferReference },
    });
    if (duplicate) {
      return jsonNoStore(
        { error: "This bank transfer reference has already been submitted." },
        { status: 409 },
      );
    }
    const paidDup = await prisma.feePayment.findUnique({
      where: { reference: input.transferReference },
    });
    if (paidDup) {
      return jsonNoStore(
        { error: "This reference was already recorded as a completed payment." },
        { status: 409 },
      );
    }

    const attempt = await prisma.feePaymentAttempt.create({
      data: {
        schoolId: context.user.schoolId,
        invoiceId: invoice.id,
        studentProfileId: invoice.studentProfileId,
        parentProfileId: context.profile.id,
        provider: PaymentProvider.BANK_TRANSFER,
        amount,
        reference: input.transferReference,
        status: PaymentStatus.PENDING,
        payerEmail: context.profile.user.email,
        transferDate: input.transferDate ? new Date(input.transferDate) : null,
        transferNarration: input.narration || null,
      },
    });

    await prisma.auditLog.create({
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
          reference: input.transferReference,
        },
      },
    });

    const transferResponse = {
      status: "PENDING_REVIEW",
      message: "Transfer submitted. The bursar will verify it before your invoice is updated.",
      attemptId: attempt.id,
    };
    await prisma.idempotencyRecord.create({
      data: {
        schoolId: context.user.schoolId,
        scope: "FEE_PAYMENT",
        key: idemKey,
        requestHash: "v1",
        response: transferResponse,
        statusCode: 201,
      },
    });
    return jsonNoStore(transferResponse, { status: 201 });
  }

  const reference = feeReference(invoice.invoiceNumber);
  const attempt = await prisma.feePaymentAttempt.create({
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

  try {
    const checkout = await initializePaystackTransaction({
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
    const paystackResponse = {
      reference,
      authorizationUrl: checkout.authorization_url,
      attemptId: attempt.id,
    };
    await prisma.idempotencyRecord.create({
      data: {
        schoolId: context.user.schoolId,
        scope: "FEE_PAYMENT",
        key: idemKey,
        requestHash: "v1",
        response: paystackResponse,
        statusCode: 200,
      },
    });
    return jsonNoStore(paystackResponse);
  } catch (error) {
    await prisma.feePaymentAttempt.update({
      where: { id: attempt.id },
      data: { status: PaymentStatus.FAILED },
    });
    return jsonNoStore(
      { error: error instanceof Error ? error.message : "Unable to initialize payment." },
      { status: 502 },
    );
  }
}
