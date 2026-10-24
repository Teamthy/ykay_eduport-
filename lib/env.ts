/**
 * Centralised environment validation.
 *
 * Production is fail-closed by default (`APP_READINESS_MODE=final`). An
 * explicit `APP_READINESS_MODE=temporary` may be used while provisioning the
 * public site shell: Redis, private document storage, malware scanning, and
 * live Paystack credentials may be absent, but every route that depends on a
 * missing service remains unavailable. Database, authentication, site URL,
 * and job-secret requirements are never relaxed by temporary mode.
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
 * Final production mode requires private admissions storage, shared rate
 * limits, malware scanning, live Paystack keys, and the notification job
 * secret. Temporary mode may defer Redis, storage, scanning, and Paystack only;
 * the job secret remains required and deferred-service operations stay
 * fail-closed until provisioned.
 */
const productionSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url("NEXT_PUBLIC_SITE_URL must be a full URL in production."),
});

export type EnvValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function getAppReadinessMode(source: NodeJS.ProcessEnv = process.env): AppReadinessMode {
  return source.APP_READINESS_MODE?.trim().toLowerCase() === "temporary" ? "temporary" : "final";
}

function paystackConfigurationErrors(source: NodeJS.ProcessEnv): string[] {
  const errors: string[] = [];
  if (!source.PAYSTACK_PUBLIC_KEY?.trim().startsWith("pk_live_")) {
    errors.push("PAYSTACK_PUBLIC_KEY: Production must use a live pk_live_ Paystack key.");
  }
  if (!source.PAYSTACK_SECRET_KEY?.trim().startsWith("sk_live_")) {
    errors.push("PAYSTACK_SECRET_KEY: Production must use a live sk_live_ Paystack key.");
  }
  return errors;
}

/**
 * Payments are usable only when BOTH keys are present. Production requires
 * real live-key prefixes; development/test can use sandbox credentials.
 */
export function isPaystackReady(source: NodeJS.ProcessEnv = process.env): boolean {
  const publicKey = source.PAYSTACK_PUBLIC_KEY?.trim();
  const secretKey = source.PAYSTACK_SECRET_KEY?.trim();
  if (source.NODE_ENV === "production") {
    return Boolean(publicKey?.startsWith("pk_live_") && secretKey?.startsWith("sk_live_"));
  }
  return Boolean(publicKey && secretKey);
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
        "APP_READINESS_MODE=temporary: this deployment is not launch-ready. Missing Redis, document storage, malware scanning, or live Paystack credentials may be deferred, but affected operations remain unavailable until configured.",
      );
    }

    const prod = productionSchema.safeParse(source);
    if (!prod.success) {
      for (const [key, messages] of Object.entries(prod.error.flatten().fieldErrors)) {
        for (const message of messages ?? []) errors.push(`${key}: ${message}`);
      }
    }

    const paystackErrors = paystackConfigurationErrors(source);
    if (paystackErrors.length > 0) {
      if (isTemporary) {
        warnings.push(
          `${paystackErrors.join(" ")} Temporary startup is allowed, but Paystack checkout, verification, and webhook processing return 503 until both live keys are configured.`,
        );
      } else {
        errors.push(...paystackErrors);
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
 * only defers Redis, private document storage, malware scanning, and Paystack
 * availability; it never relaxes database, auth, site URL, or job-secret
 * validation.
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
