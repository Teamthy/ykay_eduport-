import { describe, expect, it } from "vitest";
import { checkEnv } from "@/lib/env";

const productionEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci",
  AUTH_SECRET: "test-secret-that-is-at-least-32-characters-long-for-testing",
  NEXT_PUBLIC_SITE_URL: "https://ykay.example.invalid",
  PAYSTACK_PUBLIC_KEY: "pk_live_ci_only_not_a_real_key",
  PAYSTACK_SECRET_KEY: "sk_live_ci_only_not_a_real_key",
  UPSTASH_REDIS_REST_URL: "https://ci-only.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "ci-only-not-a-real-token",
  S3_BUCKET: "ci-only-admissions",
  S3_ACCESS_KEY_ID: "ci-only-access-key",
  S3_SECRET_ACCESS_KEY: "ci-only-secret-key",
  MALWARE_SCANNER_URL: "https://scanner.example.invalid/scan",
  JOBS_SECRET: "ci-only-jobs-secret-never-used-outside-the-runner",
  RESEND_API_KEY: "re_ci_only",
  EMAIL_FROM: "Ykay CI <ci@example.invalid>",
};

describe("production environment guard", () => {
  it("accepts a fully provisioned launch configuration", () => {
    const result = checkEnv(productionEnv);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails startup readiness when distributed rate limiting is missing", () => {
    const {
      UPSTASH_REDIS_REST_URL: _url,
      UPSTASH_REDIS_REST_TOKEN: _token,
      ...env
    } = productionEnv;
    const result = checkEnv(env);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("UPSTASH_REDIS_REST_URL");
  });

  it("allows memory rate limits only as an explicit single-instance risk acceptance", () => {
    const {
      UPSTASH_REDIS_REST_URL: _url,
      UPSTASH_REDIS_REST_TOKEN: _token,
      ...env
    } = productionEnv;
    const result = checkEnv({ ...env, ALLOW_MEMORY_RATE_LIMITS: "true" });
    expect(result.ok).toBe(true);
    expect(result.warnings.join(" ")).toContain("single-instance only");
  });

  it("fails startup readiness when admissions storage or malware scanning is unsafe", () => {
    const {
      S3_BUCKET: _bucket,
      S3_ACCESS_KEY_ID: _access,
      S3_SECRET_ACCESS_KEY: _secret,
      MALWARE_SCANNER_URL: _scanner,
      ...env
    } = productionEnv;
    const result = checkEnv(env);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("S3_BUCKET");
    expect(result.errors.join(" ")).toContain("MALWARE_SCANNER_URL");
  });

  it("requires explicit acceptance if the scanner is intentionally omitted", () => {
    const { MALWARE_SCANNER_URL: _scanner, ...env } = productionEnv;
    const result = checkEnv({ ...env, ALLOW_UNSCANNED_ADMISSION_DOCS: "true" });
    expect(result.ok).toBe(true);
    expect(result.warnings.join(" ")).toContain("owner risk acceptance");
  });

  it("rejects Paystack test keys before production traffic can start", () => {
    const result = checkEnv({
      ...productionEnv,
      PAYSTACK_PUBLIC_KEY: "pk_test_ci",
      PAYSTACK_SECRET_KEY: "sk_test_ci",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("pk_live_");
    expect(result.errors.join(" ")).toContain("sk_live_");
  });
});
