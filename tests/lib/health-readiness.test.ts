import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../setup";

describe("GET /api/health readiness reporting", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_READINESS_MODE", "temporary");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("S3_BUCKET", "");
    vi.stubEnv("S3_ACCESS_KEY_ID", "");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "");
    vi.stubEnv("MALWARE_SCANNER_URL", "");
    vi.stubEnv("PAYSTACK_PUBLIC_KEY", "");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ ok: 1 }]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    mockPrisma.$queryRaw.mockReset();
  });

  it("reports degraded readiness and the missing dependencies without taking a DB-live server out", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.readinessMode).toBe("temporary");
    expect(body.checks.database.status).toBe("up");
    expect(body.checks.redis.status).toBe("not_configured");
    expect(body.checks.admissionStorage.configured).toBe(false);
    expect(body.checks.malwareScanner.configured).toBe(false);
    expect(body.checks.paystack.configured).toBe(false);
  });
});
