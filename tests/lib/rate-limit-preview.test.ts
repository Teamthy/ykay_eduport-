import { describe, expect, it, vi } from "vitest";

const envKeys = ["VERCEL_ENV", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] as const;

type SavedEnvironment = Record<(typeof envKeys)[number], string | undefined>;

function saveEnvironment(): SavedEnvironment {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

function restoreEnvironment(saved: SavedEnvironment) {
  for (const key of envKeys) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("login rate-limit budgets by deployment environment", () => {
  it("allows 30 IP attempts in Vercel Preview while retaining the 3-failure email cap", async () => {
    const saved = saveEnvironment();
    try {
      vi.stubEnv("NODE_ENV", "test");
      process.env.VERCEL_ENV = "preview";
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      vi.resetModules();

      const { enforceRateLimit } = await import("@/lib/rate-limit");
      const ip = `preview-${Date.now()}`;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        expect((await enforceRateLimit("login", ip)).success).toBe(true);
      }
      expect((await enforceRateLimit("login", ip)).success).toBe(false);

      const email = `preview-test-${Date.now()}@example.test`;
      for (let failure = 0; failure < 3; failure += 1) {
        expect((await enforceRateLimit("loginStrict", email)).success).toBe(true);
      }
      expect((await enforceRateLimit("loginStrict", email)).success).toBe(false);
    } finally {
      restoreEnvironment(saved);
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("keeps Production at 10 IP attempts per 15 minutes", async () => {
    const saved = saveEnvironment();
    try {
      // NODE_ENV=test keeps this unit test on the isolated in-memory store;
      // VERCEL_ENV selects the same production budget without touching Redis.
      vi.stubEnv("NODE_ENV", "test");
      process.env.VERCEL_ENV = "production";
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      vi.resetModules();

      const { enforceRateLimit } = await import("@/lib/rate-limit");
      const ip = `production-config-${Date.now()}`;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        expect((await enforceRateLimit("login", ip)).success).toBe(true);
      }
      expect((await enforceRateLimit("login", ip)).success).toBe(false);
    } finally {
      restoreEnvironment(saved);
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
