import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * The browser suite signs in as every seeded role from 127.0.0.1, plus a few
 * deliberate bad-password attempts. With the default 10-per-IP-per-15-minutes
 * login bucket, the run exhausts its budget mid-suite and the last specs fail
 * with "Rate limited (429) before any test could sign in" — a red build that
 * says nothing about the product.
 *
 * The fix widens the per-IP login bucket only in the isolated localhost E2E
 * runtime (the same marker chain that already permits the in-memory limiter:
 * temporary readiness + E2E_TEST_MODE + localhost origin + not Vercel, enforced
 * in lib/env.ts). These tests pin both halves of that claim: the ceiling is
 * raised there, and the per-email failure cap is not.
 */

const ORIGINAL_ENV = { ...process.env };

async function freshLimiter() {
  vi.resetModules();
  return import("@/lib/rate-limit");
}

function enterE2ERuntime() {
  vi.stubEnv("APP_READINESS_MODE", "temporary");
  vi.stubEnv("E2E_TEST_MODE", "true");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3100");
  vi.stubEnv("ALLOW_MEMORY_RATE_LIMITS", "true");
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
}

describe("login rate limit inside the isolated E2E runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.ALLOW_MEMORY_RATE_LIMITS;
    delete process.env.APP_READINESS_MODE;
    delete process.env.E2E_TEST_MODE;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("allows a whole suite of role sign-ins from one address", async () => {
    enterE2ERuntime();
    const { enforceRateLimit } = await freshLimiter();

    // Ten roles plus bad-password attempts used to exceed the bucket.
    for (let attempt = 1; attempt <= 60; attempt += 1) {
      const result = await enforceRateLimit("login", "127.0.0.1");
      expect(result.success, `attempt ${attempt} was blocked`).toBe(true);
    }
  });

  it("still stops at a finite ceiling rather than becoming unlimited", async () => {
    enterE2ERuntime();
    const { enforceRateLimit } = await freshLimiter();

    let blocked = 0;
    for (let attempt = 1; attempt <= 2_000; attempt += 1) {
      const result = await enforceRateLimit("login", "127.0.0.1");
      if (!result.success) {
        blocked = attempt;
        break;
      }
    }

    // First 200 succeed, 201st is refused: a ceiling, not an open door.
    expect(blocked).toBe(201);
  });

  it("does not widen the per-email failure cap", async () => {
    enterE2ERuntime();
    const { enforceRateLimit } = await freshLimiter();

    // loginStrict is the 3-failures-per-15-minutes-per-email lockout. Widening
    // the IP bucket must not turn a password guesser's budget into 200.
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect((await enforceRateLimit("loginStrict", "student@ykc.test")).success).toBe(true);
    }
    expect((await enforceRateLimit("loginStrict", "student@ykc.test")).success).toBe(false);
  });

  it("keeps the default bucket outside the E2E marker chain", async () => {
    // Everything except E2E_TEST_MODE: an ordinary local run is not a test
    // harness, and must keep the 10-per-IP ceiling.
    vi.stubEnv("APP_READINESS_MODE", "temporary");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3100");
    vi.stubEnv("ALLOW_MEMORY_RATE_LIMITS", "true");
    const { enforceRateLimit } = await freshLimiter();

    const results = [];
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      results.push((await enforceRateLimit("login", "127.0.0.1")).success);
    }

    expect(results.slice(0, 10).every(Boolean)).toBe(true);
    expect(results[10]).toBe(false);
  });
});
