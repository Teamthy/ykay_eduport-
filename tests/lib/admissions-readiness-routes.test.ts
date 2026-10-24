import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../setup";

vi.mock("@prisma/client", () => ({
  AdmissionDocumentType: {
    BIRTH_CERTIFICATE: "BIRTH_CERTIFICATE",
    PASSPORT_PHOTO: "PASSPORT_PHOTO",
    REPORT_CARD: "REPORT_CARD",
  },
  ApplicationStatus: { DRAFT: "DRAFT", PENDING_REVIEW: "PENDING_REVIEW" },
  PaymentProvider: { PAYSTACK: "PAYSTACK" },
  PaymentStatus: { PAID: "PAID", PENDING: "PENDING" },
}));

function postRequest(path: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
}

function configureTemporaryProduction() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_READINESS_MODE", "temporary");
  vi.stubEnv("PAYSTACK_PUBLIC_KEY", "pk_live_test_only_not_a_real_key");
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_live_test_only_not_a_real_key");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.stubEnv("ALLOW_MEMORY_RATE_LIMITS", "");
  vi.stubEnv("E2E_TEST_MODE", "");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("S3_BUCKET", "");
  vi.stubEnv("S3_ACCESS_KEY_ID", "");
  vi.stubEnv("S3_SECRET_ACCESS_KEY", "");
  vi.stubEnv("MALWARE_SCANNER_URL", "");
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  configureTemporaryProduction();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("temporary production admissions fail-closed guards", () => {
  it("returns 503 for upload-url without storage and scanner", async () => {
    const { POST } = await import("@/app/api/admissions/upload-url/route");
    const response = await POST(postRequest("/api/admissions/upload-url"));
    expect(response.status).toBe(503);
  });

  it("returns 503 for document confirmation without storage and scanner", async () => {
    const { POST } = await import("@/app/api/admissions/documents/confirm/route");
    const response = await POST(postRequest("/api/admissions/documents/confirm"));
    expect(response.status).toBe(503);
  });

  it("returns 503 for application submission without storage and scanner", async () => {
    const { POST } = await import("@/app/api/admissions/submit/route");
    const response = await POST(postRequest("/api/admissions/submit"));
    expect(response.status).toBe(503);
  });

  it("returns 503 for upload-url when Redis is absent even if document services are configured", async () => {
    vi.stubEnv("S3_BUCKET", "test-admissions-bucket");
    vi.stubEnv("S3_ACCESS_KEY_ID", "test-access-key");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "test-secret-key");
    vi.stubEnv("MALWARE_SCANNER_URL", "https://scanner.example.invalid/scan");

    const { POST } = await import("@/app/api/admissions/upload-url/route");
    const response = await POST(postRequest("/api/admissions/upload-url"));
    expect(response.status).toBe(503);
  });

  it("returns 503 for confirmation when Redis is absent even if document services are configured", async () => {
    vi.stubEnv("S3_BUCKET", "test-admissions-bucket");
    vi.stubEnv("S3_ACCESS_KEY_ID", "test-access-key");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "test-secret-key");
    vi.stubEnv("MALWARE_SCANNER_URL", "https://scanner.example.invalid/scan");

    const { POST } = await import("@/app/api/admissions/documents/confirm/route");
    const response = await POST(postRequest("/api/admissions/documents/confirm"));
    expect(response.status).toBe(503);
  });

  it("returns 503 for submission when Redis is absent even if document services are configured", async () => {
    vi.stubEnv("S3_BUCKET", "test-admissions-bucket");
    vi.stubEnv("S3_ACCESS_KEY_ID", "test-access-key");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "test-secret-key");
    vi.stubEnv("MALWARE_SCANNER_URL", "https://scanner.example.invalid/scan");

    const { POST } = await import("@/app/api/admissions/submit/route");
    const response = await POST(postRequest("/api/admissions/submit"));
    expect(response.status).toBe(503);
  });

  it("returns an actionable 503 for admissions checkout without live Paystack keys", async () => {
    vi.stubEnv("PAYSTACK_PUBLIC_KEY", "pk_test_ci");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_ci");

    const { POST } = await import("@/app/api/admissions/payments/start/route");
    const response = await POST(postRequest("/api/admissions/payments/start"));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: "PAYSTACK_UNAVAILABLE",
      error: expect.stringContaining("Online Paystack payments are temporarily unavailable"),
    });
    expect(mockPrisma.admissionApplication.update).not.toHaveBeenCalled();
    expect(mockPrisma.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("returns 503 for admission submission without Paystack instead of marking it paid", async () => {
    vi.stubEnv("PAYSTACK_PUBLIC_KEY", "pk_test_ci");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_ci");
    vi.stubEnv("S3_BUCKET", "test-admissions-bucket");
    vi.stubEnv("S3_ACCESS_KEY_ID", "test-access-key");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "test-secret-key");
    vi.stubEnv("MALWARE_SCANNER_URL", "https://scanner.example.invalid/scan");

    const { POST } = await import("@/app/api/admissions/submit/route");
    const response = await POST(postRequest("/api/admissions/submit"));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "PAYSTACK_UNAVAILABLE" });
    expect(mockPrisma.admissionApplication.update).not.toHaveBeenCalled();
  });
});
