import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { bridgeAttendanceAlerts, dispatchDueNotifications } from "@/lib/notifications";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dispatch endpoint. Two ways to authorize:
 *  1. Cron / external scheduler: Authorization: Bearer <JOBS_SECRET>
 *     (set JOBS_SECRET in the environment; e.g. Vercel Cron or GitHub Actions)
 *  2. A signed-in ADMIN or DIRECTOR (used by the admin console button).
 */
async function authorize(request: NextRequest) {
  const secret = process.env.JOBS_SECRET;
  const header = request.headers.get("authorization") || "";
  if (secret && secret.length >= 16 && header === `Bearer ${secret}`) return true;
  const user = await requireRole([UserRole.ADMIN, UserRole.DIRECTOR]);
  return Boolean(user);
}

export async function POST(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bridge = await bridgeAttendanceAlerts();
  const result = await dispatchDueNotifications();

  return NextResponse.json({
    ok: true,
    bridgedAttendanceAlerts: bridge.bridged,
    ...result,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
