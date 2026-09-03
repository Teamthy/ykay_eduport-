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
  // Staff activation — the endpoint is unauthenticated by necessity (the
  // account does not exist yet), so the invite token is the only secret
  // protecting staff-account creation. Throttle guessing.
  staffActivate: { maxRequests: 10, windowMs: 3_600_000, prefix: "ykay:staff:activate" },
  // Bulk communications — sending results to parents, publishing news or an
  // announcement, or messaging a family. A teacher is rate-limited per account
  // so a misbehaving client (or a stuck retry loop) cannot spam every parent's
  // inbox. Generous limits: they protect against abuse, not legitimate use.
  sendResults: { maxRequests: 20, windowMs: 3_600_000, prefix: "ykay:teacher:send-results" },
  announcement: { maxRequests: 30, windowMs: 3_600_000, prefix: "ykay:teacher:announcement" },
  newsPost: { maxRequests: 30, windowMs: 3_600_000, prefix: "ykay:admin:news" },
  message: { maxRequests: 60, windowMs: 3_600_000, prefix: "ykay:messages" },
  broadcast: { maxRequests: 20, windowMs: 3_600_000, prefix: "ykay:super-admin:broadcast" },
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
      staffActivate: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        prefix: "ykay:staff:activate",
      }),
      sendResults: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 h"),
        prefix: "ykay:teacher:send-results",
      }),
      announcement: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 h"),
        prefix: "ykay:teacher:announcement",
      }),
      newsPost: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 h"),
        prefix: "ykay:admin:news",
      }),
      message: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, "1 h"),
        prefix: "ykay:messages",
      }),
      broadcast: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 h"),
        prefix: "ykay:super-admin:broadcast",
      }),
    }
  : {};

export type RateLimitKind = keyof typeof limiterConfig;

/**
 * Kinds whose entire purpose is brute-force / credential-stuffing / payment
 * abuse resistance. Without a SHARED store these are not controls at all:
 * in-memory state is per container, so serverless gives every invocation a
 * fresh budget and multi-instance multiplies the budget by replica count.
 *
 * In production these kinds FAIL CLOSED (503 via configurationError) when no
 * distributed limiter is available. A genuinely single-instance deployment can
 * opt in to the memory fallback with ALLOW_MEMORY_RATE_LIMITS=true — that is
 * an explicit, documented risk acceptance, not a silent downgrade.
 */
const DISTRIBUTED_REQUIRED: ReadonlySet<RateLimitKind> = new Set<RateLimitKind>([
  "login",
  "loginStrict",
  "passwordReset",
  "changePassword",
  "signup",
  "staffActivate",
  // Admissions surface (public, unauthenticated writes and reads)
  "draft",
  "upload",
  "payment",
  "status",
]);

const ALLOW_MEMORY_RATE_LIMITS = process.env.ALLOW_MEMORY_RATE_LIMITS === "true";

const failClosedWarned = new Set<string>();

function failClosed(kind: RateLimitKind, reason: string) {
  if (!failClosedWarned.has(kind)) {
    failClosedWarned.add(kind);
    logger.error(
      `Rate limiter for "${kind}" is FAILING CLOSED: ${reason}. ` +
        "Configure UPSTASH_REDIS_REST_URL/TOKEN (or set ALLOW_MEMORY_RATE_LIMITS=true " +
        "only for an accepted single-instance deployment).",
    );
  }
  return {
    success: false,
    retryAfterSeconds: 900,
    configurationError: true as const,
  };
}

/**
 * Generic rate limiter — works for admissions, auth, and any future endpoint.
 * Tries Redis first, falls back to in-memory if unavailable — except for
 * security-critical kinds in production, which fail closed instead of
 * silently downgrading to a per-instance budget (see DISTRIBUTED_REQUIRED).
 */
export async function enforceRateLimit(kind: RateLimitKind, identifier: string) {
  const production = process.env.NODE_ENV === "production";
  const critical = DISTRIBUTED_REQUIRED.has(kind) && !ALLOW_MEMORY_RATE_LIMITS;

  // ── No shared store configured at all ─────────────────────
  if (!redis) {
    if (production && critical) {
      return failClosed(
        kind,
        "no distributed store configured (UPSTASH_REDIS_REST_URL/TOKEN missing)",
      );
    }
  } else {
    // ── Try Redis first ──────────────────────────────────────
    const redisLimiter = redisLimiters[kind];
    if (redisLimiter) {
      try {
        const result = await redisLimiter.limit(identifier);
        const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
        return {
          success: result.success,
          retryAfterSeconds,
          configurationError: false as const,
        };
      } catch (err) {
        logger.error("Redis rate limit failed", { error: String(err), kind });
        if (production && critical) {
          return failClosed(kind, "the configured Redis store errored");
        }
      }
    }
  }

  // ── In-memory fallback (dev/test, non-critical kinds, or accepted risk) ──
  const config = limiterConfig[kind];
  const key = `${config.prefix}:${identifier}`;
  const { success, retryAfterSeconds } = inMemoryCheck(key, config.maxRequests, config.windowMs);

  return { success, retryAfterSeconds, configurationError: false as const };
}
