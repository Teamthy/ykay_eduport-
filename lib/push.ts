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

/** Send a push to every token belonging to a user (e.g. when their result is posted). */
export async function pushUser(userId: string, payload: PushPayload): Promise<void> {
  const tokens = await prismaTokensForUser(userId);
  await sendPush(tokens, payload);
}

/**
 * Push to many users at once (e.g. a school-wide broadcast).
 *
 * One query for all tokens rather than N queries — a broadcast to 800 parents
 * would otherwise be 800 round-trips before a single notification is sent.
 */
export async function pushUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!userIds.length) return;
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.deviceToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });
  await sendPush(
    rows.map((r) => r.token),
    payload,
  );
}

async function prismaTokensForUser(userId: string): Promise<string[]> {
  // Imported lazily to avoid loading Prisma in unrelated serverless paths.
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.deviceToken.findMany({ where: { userId }, select: { token: true } });
  return rows.map((r) => r.token);
}
