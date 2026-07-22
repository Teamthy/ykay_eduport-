import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const limiters = {
  draft: redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h"), prefix: "ykay:admissions:draft" }) : null,
  upload: redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(40, "1 h"), prefix: "ykay:admissions:upload" }) : null,
  payment: redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(8, "1 h"), prefix: "ykay:admissions:payment" }) : null,
  status: redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "10 m"), prefix: "ykay:admissions:status" }) : null,
};

export type AdmissionRateLimit = keyof typeof limiters;

export async function enforceAdmissionRateLimit(kind: AdmissionRateLimit, identifier: string) {
  const limiter = limiters[kind];
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, retryAfterSeconds: 60, configurationError: true };
    }
    return { success: true, retryAfterSeconds: 0, configurationError: false };
  }

  const result = await limiter.limit(identifier);
  const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return { success: result.success, retryAfterSeconds, configurationError: false };
}
