import { createHmac, timingSafeEqual } from "crypto";

const PAYSTACK_URL = "https://api.paystack.co";

interface PaystackVerificationResponse {
  status: boolean;
  message: string;
  data?: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at: string | null;
    customer?: { email?: string | null };
  };
}

export function getPaystackPublicKey() {
  const key = process.env.PAYSTACK_PUBLIC_KEY;
  if (!key) throw new Error("PAYSTACK_PUBLIC_KEY is not configured.");
  return key;
}

function getPaystackSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  return key;
}

export async function verifyPaystackTransaction(reference: string, expectedAmountKobo: number, expectedEmail: string) {
  const response = await fetch(`${PAYSTACK_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as PaystackVerificationResponse;
  const email = payload.data?.customer?.email?.trim().toLowerCase();

  if (
    !response.ok ||
    !payload.status ||
    payload.data?.status !== "success" ||
    payload.data.amount !== expectedAmountKobo ||
    payload.data.currency !== "NGN" ||
    email !== expectedEmail.trim().toLowerCase()
  ) {
    throw new Error("We could not verify this payment. Please contact admissions if your account was charged.");
  }

  return payload.data;
}

export function verifyPaystackWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const digest = createHmac("sha512", getPaystackSecretKey()).update(rawBody).digest("hex");
  if (digest.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
