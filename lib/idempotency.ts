import { createHash } from "crypto";
import type { IdempotencyRecord } from "@prisma/client";

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

type RequestLike = {
  method?: string;
  url?: string;
  nextUrl?: { pathname?: string | null } | null;
};

export function requestMethodForIdempotency(request: RequestLike, fallback = "POST"): string {
  return request.method || fallback;
}

export function requestPathForIdempotency(request: RequestLike, fallback: string): string {
  const nextPath = request.nextUrl?.pathname;
  if (nextPath) return nextPath;
  if (request.url) {
    try {
      return new URL(request.url).pathname;
    } catch {
      // Test doubles may provide a partial Request; fall back to the route's
      // canonical path while production NextRequest continues to use nextUrl.
    }
  }
  return fallback;
}

export function idempotencyRequestHash(input: {
  method: string;
  path: string;
  actorId: string;
  scope: string;
  body: unknown;
}): string {
  return createHash("sha256")
    .update(input.method.toUpperCase())
    .update("\n")
    .update(input.path)
    .update("\n")
    .update(input.actorId)
    .update("\n")
    .update(input.scope)
    .update("\n")
    .update(stableStringify(input.body))
    .digest("hex");
}

export function replayIdempotency(record: IdempotencyRecord, requestHash: string) {
  if (record.requestHash !== requestHash) {
    return {
      conflict: true as const,
      body: {
        error: "This idempotency key was already used with a different request body.",
      },
      status: 409,
    };
  }
  return {
    conflict: false as const,
    body: { ...(record.response as object), idempotentReplay: true },
    status: record.statusCode,
  };
}
