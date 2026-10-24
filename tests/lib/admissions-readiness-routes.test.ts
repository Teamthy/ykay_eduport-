import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", () => ({
  ApplicationStatus: { DRAFT: "DRAFT", PENDING_REVIEW: "PENDING_REVIEW" },
  PaymentStatus: { PAID: "PAID" },
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
});
