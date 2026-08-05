/**
 * Next.js instrumentation hook — runs once, before the server handles any
 * request.
 *
 * This is where environment validation belongs. lib/env.ts existed for months
 * with zero importers, so its promised fail-fast never happened: production
 * could boot with no RESEND_API_KEY and the first sign of trouble would be a
 * parent never receiving their portal login.
 *
 * Guarded to the Node runtime — the Edge runtime has a different (smaller)
 * environment and does not need this check.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertEnv } = await import("@/lib/env");
  assertEnv();
}
