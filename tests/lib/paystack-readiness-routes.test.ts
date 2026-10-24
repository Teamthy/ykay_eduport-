import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../setup";

const routeMocks = vi.hoisted(() => ({
  getParentFinanceContext: vi.fn(),
  assertNotImpersonating: vi.fn(),
}));

vi.mock("@prisma/client", () => ({
  FeeInvoiceStatus: { UNPAID: "UNPAID", PARTIAL: "PARTIAL", OVERDUE: "OVERDUE", PAID: "PAID" },
  FeePaymentMethod: { PAYSTACK: "PAYSTACK", BANK_TRANSFER: "BANK_TRANSFER" },
  FeePaymentStatus: { COMPLETED: "COMPLETED" },
  PaymentProvider: { PAYSTACK: "PAYSTACK", BANK_TRANSFER: "BANK_TRANSFER" },
  PaymentStatus: { PENDING: "PENDING", PAID: "PAID", FAILED: "FAILED" },
  Prisma: { DbNull: Symbol.for("Prisma.DbNull") },
}));

vi.mock("@/lib/finance", () => ({
  getParentFinanceContext: routeMocks.getParentFinanceContext,
}));

vi.mock("@/lib/session", () => ({
  assertNotImpersonating: routeMocks.assertNotImpersonating,
}));

vi.mock("@/lib/fee-payment-service", () => ({
  postCompletedFeePayment: vi.fn(),
}));

vi.mock("@/lib/admission-service", () => ({
  markApplicationPaid: vi.fn(),
}));

const parentContext = {
  user: { id: "parent_1", schoolId: "school_1", role: "PARENT" },
  profile: { id: "profile_1", user: { email: "parent@example.test" } },
};

function postRequest(path: string, body: unknown) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-idempotency-key": "paystack-unavailable-test-key",
    },
    body: JSON.stringify(body),
  });
}

function configurePaystackUnavailableProduction() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_READINESS_MODE", "temporary");
  vi.stubEnv("PAYSTACK_PUBLIC_KEY", "pk_test_not_valid_for_production");
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_not_valid_for_production");
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  configurePaystackUnavailableProduction();
  routeMocks.getParentFinanceContext.mockResolvedValue(parentContext);
  routeMocks.assertNotImpersonating.mockReturnValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("temporary production Paystack fail-closed routes", () => {
  it("does not create a fee payment attempt or idempotency reservation without live keys", async () => {
    const { POST } = await import("@/app/api/parent/fees/payment-intents/route");
    const response = await POST(
      postRequest("/api/parent/fees/payment-intents", {
        invoiceId: "invoice_1",
        method: "PAYSTACK",
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "PAYSTACK_UNAVAILABLE" });
    expect(mockPrisma.feeInvoice.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.feePaymentAttempt.create).not.toHaveBeenCalled();
    expect(mockPrisma.idempotencyRecord.create).not.toHaveBeenCalled();
  });

  it("does not block the independent bank-transfer flow when Paystack is unavailable", async () => {
    mockPrisma.feeInvoice.findFirst.mockResolvedValue(null);
    const { POST } = await import("@/app/api/parent/fees/payment-intents/route");
    const response = await POST(
      postRequest("/api/parent/fees/payment-intents", {
        invoiceId: "invoice_1",
        method: "BANK_TRANSFER",
        transferReference: "BANK-TRANSFER-123",
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).not.toMatchObject({ code: "PAYSTACK_UNAVAILABLE" });
    expect(mockPrisma.feeInvoice.findFirst).toHaveBeenCalled();
  });

  it("does not attempt fee verification or mutate payment state without live keys", async () => {
    const { POST } = await import("@/app/api/parent/fees/payments/route");
    const response = await POST(
      postRequest("/api/parent/fees/payments", { reference: "YKC-FEE-REFERENCE-1" }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: "PAYSTACK_UNAVAILABLE",
      error: expect.stringContaining("status remains unconfirmed"),
    });
    expect(mockPrisma.feePaymentAttempt.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.feePaymentAttempt.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.feePayment.create).not.toHaveBeenCalled();
  });

  it("rejects Paystack webhooks with 503 instead of accepting unverified events", async () => {
    const { POST } = await import("@/app/api/payments/paystack/webhook/route");
    const response = await POST(
      postRequest("/api/payments/paystack/webhook", {
        event: "charge.success",
        data: { reference: "forged-reference", amount: 100000, currency: "NGN", status: "success" },
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "PAYSTACK_UNAVAILABLE" });
    expect(mockPrisma.feePaymentAttempt.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.admissionApplication.findUnique).not.toHaveBeenCalled();
  });
});
