import { NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/requests";
import { assertNotImpersonating, requireRoleOr503 } from "@/lib/session";
import {
  createDailyStaffCheckInQr,
  STAFF_ATTENDANCE_ADMIN_ROLES,
  workDateKey,
  SCHOOL_TZ,
} from "@/lib/staff-attendance";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await requireRoleOr503(STAFF_ATTENDANCE_ADMIN_ROLES);
  if (user instanceof NextResponse) return user;
  const impersonationBlock = assertNotImpersonating(user);
  if (impersonationBlock) return impersonationBlock;

  try {
    return jsonNoStore({
      qrPayload: createDailyStaffCheckInQr(user.schoolId),
      date: workDateKey(),
      timeZone: SCHOOL_TZ,
      validFor: "today only",
    });
  } catch {
    return jsonNoStore(
      { error: "Daily attendance QR generation is temporarily unavailable. Please retry shortly." },
      { status: 503 },
    );
  }
}
