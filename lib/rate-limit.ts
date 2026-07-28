import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

if (!redis && process.env.NODE_ENV === "production") {
  logger.warn(
    "Redis is not configured — rate limiting will use in-memory fallback. " +
      "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production.",
  );
}

// ── In-memory fallback for when Redis is unavailable ────────────
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryCheck(
  key: string,
  maxRequests: number,
  windowMs: number,
): { success: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { success: false, retryAfterSeconds };
  }

  entry.count++;
  return { success: true, retryAfterSeconds: 0 };
}

// ── Limiter configuration ────────────────────────────────────────
const limiterConfig = {
  // Admissions
  draft: { maxRequests: 5, windowMs: 3_600_000, prefix: "ykay:admissions:draft" },
  upload: { maxRequests: 40, windowMs: 3_600_000, prefix: "ykay:admissions:upload" },
  payment: { maxRequests: 8, windowMs: 3_600_000, prefix: "ykay:admissions:payment" },
  status: { maxRequests: 30, windowMs: 600_000, prefix: "ykay:admissions:status" },
  // Authentication — brute-force / credential-stuffing protection
  login: { maxRequests: 10, windowMs: 900_000, prefix: "ykay:auth:login" }, // 10 attempts per 15 min
  loginStrict: { maxRequests: 3, windowMs: 900_000, prefix: "ykay:auth:login-strict" }, // 3 failures per 15 min (per email)
  passwordReset: { maxRequests: 3, windowMs: 3_600_000, prefix: "ykay:auth:pw-reset" }, // 3 resets per hour
  changePassword: { maxRequests: 5, windowMs: 3_600_000, prefix: "ykay:auth:pw-change" }, // 5 changes per hour
  signup: { maxRequests: 5, windowMs: 3_600_000, prefix: "ykay:signup" }, // 5 signups per hour
} as const;

const redisLimiters: Record<string, Ratelimit | null> = redis
  ? {
      draft: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        prefix: "ykay:admissions:draft",
      }),
      upload: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(40, "1 h"),
        prefix: "ykay:admissions:upload",
      }),
      payment: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(8, "1 h"),
        prefix: "ykay:admissions:payment",
      }),
      status: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "10 m"),
        prefix: "ykay:admissions:status",
      }),
      login: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "15 m"),
        prefix: "ykay:auth:login",
      }),
      loginStrict: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "15 m"),
        prefix: "ykay:auth:login-strict",
      }),
      passwordReset: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "1 h"),
        prefix: "ykay:auth:pw-reset",
      }),
      changePassword: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        prefix: "ykay:auth:pw-change",
      }),
      signup: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        prefix: "ykay:signup",
      }),
    }
  : {};

export type RateLimitKind = keyof typeof limiterConfig;

/**
 * Generic rate limiter — works for admissions, auth, and any future endpoint.
 * Tries Redis first, falls back to in-memory if unavailable.
 */
export async function enforceRateLimit(kind: RateLimitKind, identifier: string) {
  // ── Try Redis first ──────────────────────────────────────
  const redisLimiter = redisLimiters[kind];
  if (redisLimiter) {
    try {
      const result = await redisLimiter.limit(identifier);
      const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
      return {
        success: result.success,
        retryAfterSeconds,
        configurationError: false,
      };
    } catch (err) {
      logger.error("Redis rate limit failed, falling back to in-memory", {
        error: String(err),
        kind,
      });
    }
  }

  // ── In-memory fallback ────────────────────────────────────
  const config = limiterConfig[kind];
  const key = `${config.prefix}:${identifier}`;
  const { success, retryAfterSeconds } = inMemoryCheck(key, config.maxRequests, config.windowMs);

  return { success, retryAfterSeconds, configurationError: false };
}

/** @deprecated Use enforceRateLimit() instead */
export async function enforceAdmissionRateLimit(kind: RateLimitKind, identifier: string) {
  return enforceRateLimit(kind, identifier);
}
