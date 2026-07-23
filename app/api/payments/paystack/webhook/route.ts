import { PaymentStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { APPLICATION_FEE_KOBO } from "@/lib/admissions";
import { markApplicationPaid } from "@/lib/admission-service";
import { prisma } from "@/lib/prisma";
import { verifyPaystackWebhookSignature } from "@/lib/paystack";
import { jsonNoStore } from "@/lib/requests";

export const runtime = "nodejs";

interface PaystackWebhookPayload {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    status?: string;
    paid_at?: string | null;
  };
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  try {
    if (!verifyPaystackWebhookSignature(rawBody, request.headers.get("x-paystack-signature"))) {
      return jsonNoStore({ error: "Invalid webhook signature." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as PaystackWebhookPayload;
    if (payload.event !== "charge.success" || !payload.data?.reference) {
      return jsonNoStore({ ok: true });
    }

    const application = await prisma.admissionApplication.findUnique({
      where: { paymentReference: payload.data.reference },
      select: { applicationId: true, parentEmail: true },
    });

    if (!application) return jsonNoStore({ ok: true });

    if (payload.data.amount !== APPLICATION_FEE_KOBO || payload.data.currency !== "NGN" || payload.data.status !== "success") {
      await prisma.paymentTransaction.updateMany({
        where: { reference: payload.data.reference },
        data: { status: PaymentStatus.FAILED, providerData: payload as object },
      });
      return jsonNoStore({ ok: true });
    }

    await markApplicationPaid(application.applicationId, payload.data.reference, payload as object);
    return jsonNoStore({ ok: true });
  } catch (error) {
    console.error("Paystack webhook failed", error);
    return jsonNoStore({ error: "Webhook processing failed." }, { status: 500 });
  }
}
