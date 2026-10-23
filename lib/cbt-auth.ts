import { IdentityCheckUnavailableError, getSession, type SessionUser } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonNoStore } from "@/lib/requests";

/**
 * Shared gate for /api/cbt/* (audit SEC-02).
 *
 * Practice CBT is a signed-in STUDENT feature — /cbt already redirects
 * anonymous visitors to login — so the API requires that role, not just any
 * authenticated account. Rate limiting is keyed by account, not IP: a whole school behind one NAT
 * address shares an IP, but each student has their own budget, and a
 * harvester cannot mint fresh budgets by rotating IPs.
 */
export async function requireCbtUser(): Promise<SessionUser | Response> {
  let user: SessionUser | null;
  try {
    user = await getSession();
  } catch (error) {
    if (error instanceof IdentityCheckUnavailableError) {
      return jsonNoStore(
        { error: "Practice is temporarily unavailable. Please try again shortly." },
        { status: 503, headers: { "Retry-After": "5" } },
      );
    }
    throw error;
  }

  if (!user) {
    return jsonNoStore({ error: "Sign in to practise." }, { status: 401 });
  }
  if (user.role !== "STUDENT") {
    return jsonNoStore(
      { error: "CBT practice is available to student accounts only." },
      { status: 403 },
    );
  }

  const limit = await enforceRateLimit("cbt", user.id);
  if (!limit.success) {
    return jsonNoStore(
      { error: "Too many practice requests. Please slow down and try again." },
      {
        status: limit.configurationError ? 503 : 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  return user;
}

/**
 * jsonNoStore returns the platform `Response` class (not necessarily
 * NextResponse). Use the base class here so unauthorized callers never fall
 * through into the handler's Prisma work.
 */
export function isResponse(value: SessionUser | Response): value is Response {
  return value instanceof Response;
}
