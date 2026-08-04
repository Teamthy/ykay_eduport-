/**
 * Send push notifications via Expo's push gateway.
 * Tokens are Expo push tokens (ExponentPushToken[...]) registered by the
 * mobile app at /api/push/register.
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Send a push to many tokens (batches of 100, per Expo limits). */
export async function sendPush(tokens: string[], payload: PushPayload): Promise<void> {
  if (!tokens.length) return;
  for (const batch of chunk(tokens, 100)) {
    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch.map((to) => ({ to, ...payload }))),
      });
    } catch {
      /* fire-and-forget per batch */
    }
  }
}

/**
 * Send a push to every token belonging to a user (e.g. when their result is
 * posted). Pass `schoolId` wherever the caller knows it, so the read runs
 * under the tenant policy.
 */
export async function pushUser(
  userId: string,
  payload: PushPayload,
  schoolId?: string,
): Promise<void> {
  const tokens = await prismaTokensForUser(userId, schoolId);
  await sendPush(tokens, payload);
}

/**
 * Push to many users at once (e.g. a school-wide broadcast).
 *
 * One query for all tokens rather than N queries — a broadcast to 800 parents
 * would otherwise be 800 round-trips before a single notification is sent.
 */
export async function pushUsers(
  userIds: string[],
  payload: PushPayload,
  /**
   * The tenant these users belong to.
   *
   * Optional because the super-admin broadcast legitimately spans schools —
   * passing one id there would be wrong, not safer. Everything else should
   * pass it: the lookup is by userId alone, with no schoolId in the WHERE
   * clause, so a bad id list would happily push into another school. With a
   * scope, Postgres refuses that at the row level even if the caller's
   * filtering is buggy.
   */
  schoolId?: string,
): Promise<void> {
  if (!userIds.length) return;

  const select = { token: true } as const;
  const where = { userId: { in: userIds } };

  let rows: Array<{ token: string }>;
  if (schoolId) {
    const { withSchool } = await import("@/lib/db-rls");
    rows = await withSchool(schoolId, (tx) => tx.deviceToken.findMany({ where, select }));
  } else {
    const { prisma } = await import("@/lib/prisma");
    rows = await prisma.deviceToken.findMany({ where, select });
  }

  await sendPush(
    rows.map((r) => r.token),
    payload,
  );
}

async function prismaTokensForUser(userId: string, schoolId?: string): Promise<string[]> {
  const where = { userId };
  const select = { token: true } as const;
  if (schoolId) {
    const { withSchool } = await import("@/lib/db-rls");
    const scoped = await withSchool(schoolId, (tx) => tx.deviceToken.findMany({ where, select }));
    return scoped.map((r) => r.token);
  }
  // Imported lazily to avoid loading Prisma in unrelated serverless paths.
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.deviceToken.findMany({ where, select });
  return rows.map((r) => r.token);
}
