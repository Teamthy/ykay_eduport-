/**
 * Centralised environment validation.
 *
 * Importing this module at startup (e.g. in an API route or the root layout)
 * will crash-fast if any required variable is missing or malformed, so that
 * problems surface immediately instead of silently at runtime.
 */

import { z } from "zod";

const envSchema = z.object({
  // ── Database ──────────────────────────────────────────────
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string."),

  // ── Auth / Session ────────────────────────────────────────
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters long."),

  // ── Public URL ────────────────────────────────────────────
  NEXT_PUBLIC_SITE_URL: z.string().url(),

  // ── Email (Resend) ────────────────────────────────────────
  EMAIL_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  // ── Paystack ──────────────────────────────────────────────
  PAYSTACK_PUBLIC_KEY: z.string().min(8),
  PAYSTACK_SECRET_KEY: z.string().min(8),

  // ── S3-compatible storage ─────────────────────────────────
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // ── Redis (rate limiting) ─────────────────────────────────
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // ── School profile ────────────────────────────────────────
  SCHOOL_SLUG: z.string().optional(),
  SCHOOL_NAME: z.string().optional(),

  // ── Node ──────────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function validate() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.flatten().fieldErrors);
    throw new Error("Environment validation failed — see errors above.");
  }

  return result.data;
}

export const env = validate();
