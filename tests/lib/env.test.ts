import { describe, expect, it } from "vitest";
import {
  checkEnv,
  getAppReadinessMode,
  isAdmissionDocumentIntakeReady,
  isPaystackReady,
} from "@/lib/env";

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
  it("defaults to strict final mode and accepts a fully provisioned configuration", () => {
    const result = checkEnv(productionEnv);
    expect(getAppReadinessMode(productionEnv)).toBe("final");
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(isPaystackReady(productionEnv)).toBe(true);
  });

  it("requires Upstash in final mode even if the memory fallback flag is set", () => {
    const {
      UPSTASH_REDIS_REST_URL: _url,
      UPSTASH_REDIS_REST_TOKEN: _token,
      ...env
    } = productionEnv;
    const result = checkEnv({ ...env, ALLOW_MEMORY_RATE_LIMITS: "true" });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("UPSTASH_REDIS_REST_URL");
    expect(result.errors.join(" ")).toContain("mandatory in final mode");
  });

  it("requires private document storage in final mode", () => {
    const {
      S3_BUCKET: _bucket,
      S3_ACCESS_KEY_ID: _access,
      S3_SECRET_ACCESS_KEY: _secret,
      ...env
    } = productionEnv;
    const result = checkEnv(env);

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("S3_BUCKET");
    expect(result.errors.join(" ")).toContain("mandatory in final mode");
  });

  it("allows the public shell to start without deferred dependencies or Paystack in temporary mode", () => {
    const {
      UPSTASH_REDIS_REST_URL: _url,
      UPSTASH_REDIS_REST_TOKEN: _token,
      S3_BUCKET: _bucket,
      S3_ACCESS_KEY_ID: _access,
      S3_SECRET_ACCESS_KEY: _secret,
      MALWARE_SCANNER_URL: _scanner,
      PAYSTACK_PUBLIC_KEY: _publicKey,
      PAYSTACK_SECRET_KEY: _secretKey,
      ...env
    } = productionEnv;

    const temporaryEnv = { ...env, APP_READINESS_MODE: "temporary" };
    const result = checkEnv(temporaryEnv);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join(" ")).toContain("not launch-ready");
    expect(result.warnings.join(" ")).toContain("fail closed with 503");
    expect(result.warnings.join(" ")).toContain("unscanned files are not accepted");
    expect(result.warnings.join(" ")).toContain("PAYSTACK_PUBLIC_KEY");
    expect(result.warnings.join(" ")).toContain(
      "Paystack checkout, verification, and webhook processing return 503",
    );
    expect(getAppReadinessMode(temporaryEnv)).toBe("temporary");
    expect(isAdmissionDocumentIntakeReady(temporaryEnv)).toBe(false);
    expect(isPaystackReady(temporaryEnv)).toBe(false);
  });

  it("still requires database, auth, site URL and job secret in temporary mode", () => {
    const result = checkEnv({
      ...productionEnv,
      APP_READINESS_MODE: "temporary",
      DATABASE_URL: "",
      AUTH_SECRET: "too-short",
      NEXT_PUBLIC_SITE_URL: "not-a-url",
      JOBS_SECRET: "short",
      PAYSTACK_PUBLIC_KEY: "pk_test_ci",
      PAYSTACK_SECRET_KEY: "sk_test_ci",
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("DATABASE_URL");
    expect(result.errors.join(" ")).toContain("AUTH_SECRET");
    expect(result.errors.join(" ")).toContain("NEXT_PUBLIC_SITE_URL");
    expect(result.errors.join(" ")).toContain("JOBS_SECRET");
    expect(result.errors.join(" ")).not.toContain("pk_live_");
    expect(result.errors.join(" ")).not.toContain("sk_live_");
    expect(result.warnings.join(" ")).toContain(
      "Paystack checkout, verification, and webhook processing return 503",
    );
  });

  it("still rejects non-live Paystack keys in final mode", () => {
    const result = checkEnv({
      ...productionEnv,
      PAYSTACK_PUBLIC_KEY: "pk_test_ci",
      PAYSTACK_SECRET_KEY: "sk_test_ci",
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("PAYSTACK_PUBLIC_KEY");
    expect(result.errors.join(" ")).toContain("pk_live_");
    expect(result.errors.join(" ")).toContain("PAYSTACK_SECRET_KEY");
    expect(result.errors.join(" ")).toContain("sk_live_");
    expect(
      isPaystackReady({
        ...productionEnv,
        PAYSTACK_PUBLIC_KEY: "pk_test_ci",
        PAYSTACK_SECRET_KEY: "sk_test_ci",
      }),
    ).toBe(false);
  });

  it("accepts sandbox keys only outside production", () => {
    expect(
      isPaystackReady({
        NODE_ENV: "test",
        PAYSTACK_PUBLIC_KEY: "pk_test_ci",
        PAYSTACK_SECRET_KEY: "sk_test_ci",
      }),
    ).toBe(true);
  });

  it("requires malware scanning in final mode; the old unscanned waiver is ignored", () => {
    const { MALWARE_SCANNER_URL: _scanner, ...env } = productionEnv;
    const result = checkEnv({ ...env, ALLOW_UNSCANNED_ADMISSION_DOCS: "true" });

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("MALWARE_SCANNER_URL");
    expect(result.warnings.join(" ")).toContain("deprecated and ignored");
  });

  it("blocks production document intake without scanner and storage even if the legacy waiver is set", () => {
    const {
      MALWARE_SCANNER_URL: _scanner,
      S3_BUCKET: _bucket,
      S3_ACCESS_KEY_ID: _access,
      S3_SECRET_ACCESS_KEY: _secret,
      ...env
    } = productionEnv;

    expect(isAdmissionDocumentIntakeReady({ ...env, ALLOW_UNSCANNED_ADMISSION_DOCS: "true" })).toBe(
      false,
    );
  });

  it("allows document intake only when production storage and scanning are configured", () => {
    expect(isAdmissionDocumentIntakeReady(productionEnv)).toBe(true);
    expect(isAdmissionDocumentIntakeReady({ ...productionEnv, MALWARE_SCANNER_URL: "" })).toBe(
      false,
    );
    expect(isAdmissionDocumentIntakeReady({ ...productionEnv, S3_BUCKET: "" })).toBe(false);
    expect(isAdmissionDocumentIntakeReady({ ...productionEnv, NODE_ENV: "development" })).toBe(
      true,
    );
  });

  it("rejects the E2E limiter override on a public production origin", () => {
    const result = checkEnv({ ...productionEnv, E2E_TEST_MODE: "true" });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("E2E_TEST_MODE");
  });

  it("rejects an unrecognized readiness mode", () => {
    const result = checkEnv({ ...productionEnv, APP_READINESS_MODE: "maybe" });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("APP_READINESS_MODE");
  });
});
