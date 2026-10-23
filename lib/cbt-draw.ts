import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signed CBT practice draws (audit SEC-02).
 *
 * The practice endpoints used to be anonymous and stateless: anyone could
 * enumerate question IDs and call /api/cbt/check to harvest the full answer
 * key one question at a time. A quiz response now carries a short-lived
 * HMAC-signed token naming the exact question IDs drawn for that signed-in
 * user; /check and /attempts refuse any question outside the draw. The
 * bank can therefore only be walked at the pace of legitimate, rate-limited,
 * authenticated practice sessions — and every draw is attributable.
 *
 * Server-only (node:crypto + AUTH_SECRET). Never import from client code;
 * the pure grading helpers live in lib/cbt.ts.
 */

export const CBT_DRAW_TTL_SECONDS = 2 * 60 * 60;
export const CBT_DRAW_MAX_QUESTIONS = 100;

export type CbtDraw = {
  userId: string;
  subjectId: string;
  questionIds: string[];
  expiresAt: number;
};

function drawSecret(): Buffer {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
  return Buffer.from(value, "utf8");
}

function sign(payloadPart: string): string {
  return createHmac("sha256", drawSecret()).update(payloadPart).digest("base64url");
}

export function signCbtDraw(input: {
  userId: string;
  subjectId: string;
  questionIds: string[];
  nowSeconds?: number;
}): string {
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    sub: input.userId,
    subjectId: input.subjectId,
    ids: input.questionIds.slice(0, CBT_DRAW_MAX_QUESTIONS),
    exp: now + CBT_DRAW_TTL_SECONDS,
  };
  const payloadPart = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${payloadPart}.${sign(payloadPart)}`;
}

export function verifyCbtDraw(
  token: string | null | undefined,
  expectedUserId: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): CbtDraw | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadPart, signature] = parts;

  let expected: Buffer;
  let presented: Buffer;
  try {
    expected = Buffer.from(sign(payloadPart), "utf8");
    presented = Buffer.from(signature, "utf8");
  } catch {
    return null;
  }
  if (expected.length !== presented.length || !timingSafeEqual(expected, presented)) return null;

  let payload: { v?: unknown; sub?: unknown; subjectId?: unknown; ids?: unknown; exp?: unknown };
  try {
    payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as typeof payload;
  } catch {
    return null;
  }

  if (payload.v !== 1) return null;
  if (payload.sub !== expectedUserId) return null;
  if (typeof payload.subjectId !== "string" || !payload.subjectId) return null;
  if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) return null;
  if (!Array.isArray(payload.ids) || payload.ids.length === 0) return null;
  if (payload.ids.length > CBT_DRAW_MAX_QUESTIONS) return null;
  if (!payload.ids.every((id) => typeof id === "string" && id.length > 0)) return null;

  return {
    userId: expectedUserId,
    subjectId: payload.subjectId,
    questionIds: payload.ids as string[],
    expiresAt: payload.exp,
  };
}
