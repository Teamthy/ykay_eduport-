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
  draft: { maxRequests: 5, windowMs: 3_600_000, prefix: "ykay:admissions:draft" },
  upload: { maxRequests: 40, windowMs: 3_600_000, prefix: "ykay:admissions:upload" },
  payment: { maxRequests: 8, windowMs: 3_600_000, prefix: "ykay:admissions:payment" },
  status: { maxRequests: 30, windowMs: 600_000, prefix: "ykay:admissions:status" },
} as const;

const redisLimiters = redis
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
    }
  : null;

export type AdmissionRateLimit = keyof typeof limiterConfig;

export async function enforceAdmissionRateLimit(kind: AdmissionRateLimit, identifier: string) {
  // ── Try Redis first ──────────────────────────────────────
  if (redisLimiters) {
    try {
      const limiter = redisLimiters[kind];
      const result = await limiter.limit(identifier);
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
