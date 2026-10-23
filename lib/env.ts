/**
 * Centralised environment validation.
 *
 * Called once from instrumentation.ts, which Next.js runs before any request
 * is served. A misconfigured production deploy fails at boot with a precise
 * message, instead of surfacing hours later as "emails aren't sending" or a
 * 500 on the first payment.
 *
 * ── Why this is not validated at import time ───────────────────────────────
 * The previous version ran `validate()` as a module side effect and required
 * live Paystack keys unconditionally. Nothing imported it — which is just as
 * well, because doing so would have failed every CI build and every local
 * `next build`, where those secrets legitimately do not exist. Requirements
 * are therefore split by environment: strict in production, permissive
 * elsewhere.
 */

import { z } from "zod";

/** Always required — the app cannot function without these anywhere. */
const baseSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters long."),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * Fatal in production: the app cannot serve a correct response without these.
 *
 *   NEXT_PUBLIC_SITE_URL  — password-reset and staff-activation links are
 *                           built from it; a wrong value sends users nowhere
 *   PAYSTACK_SECRET_KEY   — webhook signature verification. Missing means
 *                           unverified payment callbacks, which is a money bug
 *
 * Email remains a warning (rather than taking down the whole portal) because
 * the site can still serve and parents can use in-app notifications while the
 * mail provider is repaired. Security-critical rate limiting, live-payment
 * key mode, private document storage, and the malware-scan decision are
 * launch prerequisites: the app must not accept production traffic when
 * those dependencies are absent or unsafe.
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

export type ValidatedEnv = z.infer<typeof baseSchema>;

export type EnvValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Check the environment. Pure — returns findings rather than throwing, so it
 * can be unit-tested and so the caller decides how loud to be.
 */
export function checkEnv(source: NodeJS.ProcessEnv = process.env): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const base = baseSchema.safeParse(source);
  if (!base.success) {
    for (const [key, messages] of Object.entries(base.error.flatten().fieldErrors)) {
      for (const message of messages ?? []) errors.push(`${key}: ${message}`);
    }
  }

  const isProduction = source.NODE_ENV === "production";

  if (isProduction) {
    const prod = productionSchema.safeParse(source);
    if (!prod.success) {
      for (const [key, messages] of Object.entries(prod.error.flatten().fieldErrors)) {
        for (const message of messages ?? []) errors.push(`${key}: ${message}`);
      }
    }

    // Email remains degraded/not fatal: core pages can still serve and the
    // in-app notification remains durable while the provider is repaired.
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
    if (!source.UPSTASH_REDIS_REST_URL || !source.UPSTASH_REDIS_REST_TOKEN) {
      if (source.ALLOW_MEMORY_RATE_LIMITS === "true") {
        warnings.push(
          "ALLOW_MEMORY_RATE_LIMITS=true explicitly accepts per-instance rate limits; " +
            "this is unsafe on serverless/multi-instance deployments and must be single-instance only.",
        );
      } else {
        errors.push(
          "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production. " +
            "They may be omitted only with ALLOW_MEMORY_RATE_LIMITS=true for an accepted, single-instance deployment.",
        );
      }
    }
    if (!source.S3_BUCKET || !source.S3_ACCESS_KEY_ID || !source.S3_SECRET_ACCESS_KEY) {
      errors.push(
        "S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required in production; " +
          "without them, real admission documents cannot be uploaded.",
      );
    }
    if (!source.MALWARE_SCANNER_URL && source.ALLOW_UNSCANNED_ADMISSION_DOCS !== "true") {
      errors.push(
        "MALWARE_SCANNER_URL is required in production, or set ALLOW_UNSCANNED_ADMISSION_DOCS=true to explicitly accept the admission-document scanning risk.",
      );
    } else if (!source.MALWARE_SCANNER_URL) {
      warnings.push(
        "ALLOW_UNSCANNED_ADMISSION_DOCS=true: admission documents are accepted without a malware scan (owner risk acceptance).",
      );
    }
    if (!source.JOBS_SECRET || source.JOBS_SECRET.length < 16) {
      errors.push(
        "JOBS_SECRET (at least 16 characters) is required in production for the Render notification dispatcher.",
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Validate and fail fast. Called from instrumentation.ts at server startup.
 *
 * Throws only in production: a developer with a half-filled .env should get a
 * running app and a clear warning, not a wall.
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
