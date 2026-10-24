import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * C-005: security-critical rate limits must not silently downgrade to a
 * per-process Map in production. In serverless/multi-instance deployments a
 * process-local limiter is not a control at all, so without a distributed
 * store these kinds fail closed (routes translate configurationError into
 * 503). Final and temporary production modes both fail closed; only the
 * isolated E2E harness can opt into the memory fallback, never on Vercel.
 */

const ORIGINAL_ENV = { ...process.env };

async function freshLimiter() {
  vi.resetModules();
  return import("@/lib/rate-limit");
}

describe("enforceRateLimit — production fail-closed policy (C-005)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.ALLOW_MEMORY_RATE_LIMITS;
    delete process.env.APP_READINESS_MODE;
    delete process.env.E2E_TEST_MODE;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("fails closed for login when production has no distributed store", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { enforceRateLimit } = await freshLimiter();

    const result = await enforceRateLimit("login", "203.0.113.9");
    expect(result.success).toBe(false);
    expect(result.configurationError).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("fails closed for payment and admissions kinds, not just login", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { enforceRateLimit } = await freshLimiter();

    for (const kind of ["payment", "draft", "signup", "staffActivate", "cbt"] as const) {
      const result = await enforceRateLimit(kind, "203.0.113.9");
      expect(result.configurationError, kind).toBe(true);
      expect(result.success, kind).toBe(false);
    }
  });

  it("allows non-critical kinds to use the memory fallback in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { enforceRateLimit } = await freshLimiter();

    const result = await enforceRateLimit("message", "user_1");
    expect(result.success).toBe(true);
    expect(result.configurationError).toBe(false);
  });

  it("keeps critical operations closed in temporary production mode despite the legacy memory flag", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.APP_READINESS_MODE = "temporary";
    process.env.ALLOW_MEMORY_RATE_LIMITS = "true";
    const { enforceRateLimit } = await freshLimiter();

    const result = await enforceRateLimit("login", "203.0.113.10");
    expect(result.success).toBe(false);
    expect(result.configurationError).toBe(true);
  });

  it("allows memory limits only for the explicit isolated E2E harness", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.APP_READINESS_MODE = "temporary";
    process.env.ALLOW_MEMORY_RATE_LIMITS = "true";
    process.env.E2E_TEST_MODE = "true";
    process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3100";
    const { enforceRateLimit } = await freshLimiter();

    const result = await enforceRateLimit("login", "203.0.113.11");
    expect(result.success).toBe(true);
    expect(result.configurationError).toBe(false);
  });

  it("does not enable the E2E memory override for a public origin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.APP_READINESS_MODE = "temporary";
    process.env.ALLOW_MEMORY_RATE_LIMITS = "true";
    process.env.E2E_TEST_MODE = "true";
    process.env.NEXT_PUBLIC_SITE_URL = "https://ykaycollege.com";
    const { enforceRateLimit } = await freshLimiter();

    const result = await enforceRateLimit("login", "203.0.113.12");
    expect(result.success).toBe(false);
    expect(result.configurationError).toBe(true);
  });

  it("ignores the E2E memory override on Vercel", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.APP_READINESS_MODE = "temporary";
    process.env.ALLOW_MEMORY_RATE_LIMITS = "true";
    process.env.E2E_TEST_MODE = "true";
    process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3100";
    process.env.VERCEL = "1";
    const { enforceRateLimit } = await freshLimiter();

    const result = await enforceRateLimit("login", "203.0.113.12");
    expect(result.success).toBe(false);
    expect(result.configurationError).toBe(true);
  });

  it("keeps the memory fallback outside production (dev/test)", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { enforceRateLimit } = await freshLimiter();

    const result = await enforceRateLimit("login", "192.168.1.77");
    expect(result.success).toBe(true);
    expect(result.configurationError).toBe(false);
  });
});
