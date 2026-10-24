/**
 * Centralised environment validation.
 *
 * Production is fail-closed by default (`APP_READINESS_MODE=final`). An
 * explicit `APP_READINESS_MODE=temporary` may be used while provisioning the
 * public site shell: Redis, private document storage, and malware scanning may
 * be absent, but routes that depend on them remain unavailable. Database,
 * authentication, site URL, live payment, and job-secret requirements are
 * never relaxed by temporary mode.
 */

import { z } from "zod";

export type AppReadinessMode = "final" | "temporary";

/** Always required — the app cannot function without these anywhere. */
const baseSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters long."),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * Fatal in production: the app cannot serve a correct response without these.
 *
 * Production mode also requires private admissions storage, shared rate limits,
 * a malware scanner, and the notification job secret. The three infrastructure
 * dependencies may be deferred only while APP_READINESS_MODE=temporary; their
 * dependent operations stay fail-closed until they are provisioned.
 */
const productionSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url("NEXT_PUBLIC_SITE_URL must be a full URL in production."),
  PAYSTACK_PUBLIC_KEY: z
    .string()
    .startsWith("pk_live_", "Production must use a live pk_live_ Paystack key."),
  PAYSTACK_SECRET_KEY: z
    .string()
    .startsWith("sk_live_", "Production must use a live sk_live_ Paystack key."),
});

export type EnvValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function getAppReadinessMode(source: NodeJS.ProcessEnv = process.env): AppReadinessMode {
  return source.APP_READINESS_MODE?.trim().toLowerCase() === "temporary" ? "temporary" : "final";
}

/**
 * Admission document intake is available only when both private object storage
 * and scanning are configured in production. The temporary mode must never
 * accept unscanned files; local development may still exercise the flow.
 */
export function isAdmissionDocumentIntakeReady(source: NodeJS.ProcessEnv = process.env): boolean {
  if (source.NODE_ENV !== "production") return true;

  return Boolean(
    source.S3_BUCKET?.trim() &&
    source.S3_ACCESS_KEY_ID?.trim() &&
    source.S3_SECRET_ACCESS_KEY?.trim() &&
    source.MALWARE_SCANNER_URL?.trim(),
  );
}

/**
 * Check the environment. Pure — returns findings rather than throwing, so it
 * can be unit-tested and so the caller decides how loud to be.
 */
export function checkEnv(source: NodeJS.ProcessEnv = process.env): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const configuredReadinessMode = source.APP_READINESS_MODE?.trim().toLowerCase();
  if (configuredReadinessMode && !["final", "temporary"].includes(configuredReadinessMode)) {
    errors.push("APP_READINESS_MODE must be either 'final' or 'temporary'.");
  }
  const readinessMode = getAppReadinessMode(source);
  const isTemporary = readinessMode === "temporary";

  const base = baseSchema.safeParse(source);
  if (!base.success) {
    for (const [key, messages] of Object.entries(base.error.flatten().fieldErrors)) {
      for (const message of messages ?? []) errors.push(`${key}: ${message}`);
    }
  }

  const isProduction = source.NODE_ENV === "production";

  if (isProduction && source.E2E_TEST_MODE === "true") {
    const isLocalTestOrigin = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(
      source.NEXT_PUBLIC_SITE_URL?.trim() ?? "",
    );
    if (source.VERCEL === "1" || !isLocalTestOrigin) {
      errors.push(
        "E2E_TEST_MODE is reserved for localhost test runs and cannot be enabled for a public production deployment.",
      );
    } else {
      warnings.push(
        "E2E_TEST_MODE is enabled for an isolated localhost test runtime; never enable it for public traffic.",
      );
    }
  }

  if (isProduction) {
    if (isTemporary) {
      warnings.push(
        "APP_READINESS_MODE=temporary: this deployment is not launch-ready. Missing Redis, document storage, or malware scanning may be deferred, but affected operations remain unavailable until configured.",
      );
    }

    const prod = productionSchema.safeParse(source);
    if (!prod.success) {
      for (const [key, messages] of Object.entries(prod.error.flatten().fieldErrors)) {
        for (const message of messages ?? []) errors.push(`${key}: ${message}`);
      }
    }

    // Email remains a warning (rather than taking down the portal) because
    // the site can still serve and in-app notifications remain durable.
    if (!source.RESEND_API_KEY) {
      warnings.push(
        "RESEND_API_KEY is not set — parent welcome emails, staff invitations and " +
          "password-reset emails will NOT be delivered.",
      );
    }
    if (!source.EMAIL_FROM) {
      warnings.push(
        "EMAIL_FROM is not set — outbound email has no verified sender address and will fail.",
      );
    }

    if (!source.UPSTASH_REDIS_REST_URL?.trim() || !source.UPSTASH_REDIS_REST_TOKEN?.trim()) {
      const message =
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for distributed rate limiting.";
      if (isTemporary) {
        warnings.push(
          `${message} Temporary startup is allowed, but security-critical rate-limited routes fail closed with 503 until Redis is configured.`,
        );
      } else {
        errors.push(
          `${message} They are mandatory in final mode; ALLOW_MEMORY_RATE_LIMITS does not waive this requirement.`,
        );
      }
    }

    if (
      !source.S3_BUCKET?.trim() ||
      !source.S3_ACCESS_KEY_ID?.trim() ||
      !source.S3_SECRET_ACCESS_KEY?.trim()
    ) {
      const message =
        "S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required for private admissions-document storage.";
      if (isTemporary) {
        warnings.push(
          `${message} Temporary startup is allowed, but document upload, confirmation, and submission routes return 503 until storage is configured.`,
        );
      } else {
        errors.push(`${message} They are mandatory in final mode.`);
      }
    }

    if (!source.MALWARE_SCANNER_URL?.trim()) {
      const message = "MALWARE_SCANNER_URL is required to scan admission documents.";
      if (isTemporary) {
        warnings.push(
          `${message} Temporary startup is allowed, but document intake remains disabled; unscanned files are not accepted.`,
        );
      } else {
        errors.push(
          `${message} It is mandatory in final mode; unscanned-document waivers are not supported.`,
        );
      }
    }

    if (source.ALLOW_UNSCANNED_ADMISSION_DOCS === "true") {
      warnings.push(
        "ALLOW_UNSCANNED_ADMISSION_DOCS is deprecated and ignored. Admission document scanning is required for final deployment.",
      );
    }

    if (!source.JOBS_SECRET?.trim() || source.JOBS_SECRET.trim().length < 16) {
      errors.push(
        "JOBS_SECRET (at least 16 characters) is required in production for the notification dispatcher.",
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Validate and fail fast. Called from instrumentation.ts at server startup.
 *
 * A production deployment defaults to strict final readiness. Temporary mode
 * only defers the explicitly listed infrastructure dependencies above; it
 * never relaxes database, auth, site URL, Paystack, or job-secret validation.
 */
export function assertEnv(source: NodeJS.ProcessEnv = process.env): EnvValidationResult {
  const result = checkEnv(source);

  for (const warning of result.warnings) {
    console.warn(`[env] WARNING  ${warning}`);
  }

  if (!result.ok) {
    const detail = result.errors.map((error) => `  - ${error}`).join("\n");
    if (source.NODE_ENV === "production") {
      throw new Error(`Environment validation failed:\n${detail}`);
    }
    console.warn(`[env] Environment problems (non-fatal outside production):\n${detail}`);
  }

  return result;
}
