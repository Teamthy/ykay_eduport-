import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { StaffAttendanceEventType, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export const STAFF_ATTENDANCE_ADMIN_ROLES = [
  UserRole.ADMIN,
  UserRole.DIRECTOR,
  UserRole.COORDINATOR,
  UserRole.SUPER_ADMIN,
];

export const STAFF_SELF_ROLES = [
  UserRole.TEACHER,
  UserRole.HOD,
  UserRole.ADMIN,
  UserRole.DIRECTOR,
  UserRole.COORDINATOR,
  UserRole.BURSAR,
];

/** School reporting timezone for "today" and late cut-off. */
export const SCHOOL_TZ = process.env.SCHOOL_TIMEZONE || "Africa/Lagos";

/** HH:mm 24h local school time — arrivals after this are late. */
export function lateCutoffHm() {
  return process.env.STAFF_LATE_CUTOFF || "08:00";
}

export function workDateKey(date = new Date(), timeZone = SCHOOL_TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // YYYY-MM-DD
}

export function localHourMinute(date = new Date(), timeZone = SCHOOL_TZ) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return { hour, minute, minutes: hour * 60 + minute };
}

export function computeLateness(scannedAt = new Date()) {
  const cutoff = lateCutoffHm();
  const [ch, cm] = cutoff.split(":").map((x) => Number(x));
  const cutoffMinutes = (Number.isFinite(ch) ? ch : 8) * 60 + (Number.isFinite(cm) ? cm : 0);
  const { minutes } = localHourMinute(scannedAt);
  const lateMinutes = Math.max(0, minutes - cutoffMinutes);
  return { isLate: lateMinutes > 0, lateMinutes, cutoff };
}

export function newBadgeCode() {
  return `YKST-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function badgePayload(badgeCode: string, schoolId: string) {
  return JSON.stringify({
    v: 1,
    kind: "STAFF_BADGE",
    schoolId,
    code: badgeCode,
  });
}

type DailyStaffQrClaims = {
  v: 1;
  kind: "STAFF_DAILY_ATTENDANCE";
  schoolId: string;
  workDate: string;
};

function staffQrSecret(): Buffer {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
  // Derive a purpose-specific key rather than using the session signing key directly.
  return createHmac("sha256", Buffer.from(value, "utf8"))
    .update("ykay:staff-attendance:daily-qr:v1")
    .digest();
}

/** A deterministic, school-bound code that is valid only for the current school day. */
export function createDailyStaffCheckInQr(schoolId: string, now = new Date()): string {
  const claims: DailyStaffQrClaims = {
    v: 1,
    kind: "STAFF_DAILY_ATTENDANCE",
    schoolId,
    workDate: workDateKey(now),
  };
  const payloadPart = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signature = createHmac("sha256", staffQrSecret()).update(payloadPart).digest("base64url");
  return `${payloadPart}.${signature}`;
}

/** Verify the signature, tenant and school-local date before recording attendance. */
export function verifyDailyStaffCheckInQr(
  token: string | null | undefined,
  schoolId: string,
  now = new Date(),
): boolean {
  if (!token || typeof token !== "string" || token.length > 2_048) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadPart, signature] = parts;

  try {
    const expected = Buffer.from(
      createHmac("sha256", staffQrSecret()).update(payloadPart).digest("base64url"),
      "utf8",
    );
    const presented = Buffer.from(signature, "utf8");
    if (expected.length !== presented.length || !timingSafeEqual(expected, presented)) return false;

    const claims = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as Partial<DailyStaffQrClaims>;
    return (
      claims.v === 1 &&
      claims.kind === "STAFF_DAILY_ATTENDANCE" &&
      claims.schoolId === schoolId &&
      claims.workDate === workDateKey(now)
    );
  } catch {
    return false;
  }
}

export function parseBadgeInput(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  if (text.startsWith("YKST-")) return text.toUpperCase();
  try {
    const parsed = JSON.parse(text) as { kind?: string; code?: string };
    if (parsed.kind === "STAFF_BADGE" && parsed.code) return String(parsed.code).toUpperCase();
  } catch {
    /* plain code */
  }
  // allow bare codes
  if (/^[A-Z0-9-]{6,40}$/i.test(text)) return text.toUpperCase();
  return null;
}

export async function ensureTeacherBadge(teacherProfileId: string) {
  const existing = await prisma.teacherProfile.findUnique({
    where: { id: teacherProfileId },
    select: { id: true, badgeCode: true, schoolId: true, displayName: true },
  });
  if (!existing) return null;
  if (existing.badgeCode) return existing;

  for (let i = 0; i < 6; i += 1) {
    const code = newBadgeCode();
    try {
      return await prisma.teacherProfile.update({
        where: { id: teacherProfileId },
        data: { badgeCode: code },
        select: { id: true, badgeCode: true, schoolId: true, displayName: true },
      });
    } catch {
      /* unique collision retry */
    }
  }
  throw new Error("Could not allocate a staff badge code.");
}

export async function getStaffAttendanceAdmin() {
  return requireRole(STAFF_ATTENDANCE_ADMIN_ROLES);
}

export async function recordStaffScan(input: {
  schoolId: string;
  badgeCode: string;
  eventType: StaffAttendanceEventType;
  scannerUserId?: string | null;
  source?: string;
  note?: string | null;
  /** Rounded location metadata only; raw coordinates are deliberately discarded. */
  geofence?: {
    distanceFromCampusMeters: number;
    locationAccuracyMeters: number;
  } | null;
  force?: boolean;
}) {
  const code = parseBadgeInput(input.badgeCode);
  if (!code) throw new Error("Invalid staff badge / QR payload.");

  const teacher = await prisma.teacherProfile.findFirst({
    where: { schoolId: input.schoolId, badgeCode: code, isActive: true },
    select: {
      id: true,
      displayName: true,
      badgeCode: true,
      user: { select: { email: true, role: true } },
    },
  });
  if (!teacher) throw new Error("Staff badge not recognized for this school.");

  const now = new Date();
  const workDate = new Date(`${workDateKey(now)}T12:00:00.000Z`);
  const todayKey = workDateKey(now);

  const todays = await prisma.staffAttendanceEvent.findMany({
    where: {
      schoolId: input.schoolId,
      teacherProfileId: teacher.id,
      workDate,
    },
    orderBy: { scannedAt: "asc" },
    // Explicit legacy fields keep QR attendance readable during the migration
    // rollout; GPS-only columns are written only after geofence configuration
    // is available.
    select: {
      eventType: true,
      scannedAt: true,
      isLate: true,
      lateMinutes: true,
    },
  });

  const last = todays[todays.length - 1] || null;

  if (input.eventType === StaffAttendanceEventType.CHECK_IN) {
    if (last?.eventType === StaffAttendanceEventType.CHECK_IN && !input.force) {
      throw new Error(`${teacher.displayName} is already checked in today. Check out first.`);
    }
  } else {
    if (!last || last.eventType === StaffAttendanceEventType.CHECK_OUT) {
      throw new Error(`${teacher.displayName} has no open check-in to close today.`);
    }
  }

  const late =
    input.eventType === StaffAttendanceEventType.CHECK_IN
      ? computeLateness(now)
      : { isLate: false, lateMinutes: 0, cutoff: lateCutoffHm() };

  const event = await prisma.staffAttendanceEvent.create({
    data: {
      schoolId: input.schoolId,
      teacherProfileId: teacher.id,
      eventType: input.eventType,
      scannedAt: now,
      isLate: late.isLate,
      lateMinutes: late.lateMinutes,
      source: input.source || "QR",
      scannerUserId: input.scannerUserId || null,
      note: input.note || null,
      workDate,
      ...(input.geofence
        ? {
            geofenceVerified: true,
            distanceFromCampusMeters: input.geofence.distanceFromCampusMeters,
            locationAccuracyMeters: input.geofence.locationAccuracyMeters,
          }
        : {}),
    },
    select: {
      id: true,
      eventType: true,
      scannedAt: true,
      isLate: true,
      lateMinutes: true,
      source: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId: input.schoolId,
      actorUserId: input.scannerUserId || null,
      action: input.eventType === "CHECK_IN" ? "STAFF_CHECK_IN" : "STAFF_CHECK_OUT",
      entityType: "StaffAttendanceEvent",
      entityId: event.id,
      metadata: {
        teacherProfileId: teacher.id,
        displayName: teacher.displayName,
        isLate: event.isLate,
        lateMinutes: event.lateMinutes,
        workDate: todayKey,
        source: event.source,
        ...(input.geofence
          ? {
              geofenceVerified: true,
              distanceFromCampusMeters: input.geofence.distanceFromCampusMeters,
              locationAccuracyMeters: input.geofence.locationAccuracyMeters,
            }
          : {}),
      },
    },
  });

  return {
    event: {
      id: event.id,
      eventType: event.eventType,
      scannedAt: event.scannedAt.toISOString(),
      isLate: event.isLate,
      lateMinutes: event.lateMinutes,
      workDate: todayKey,
      source: event.source,
      geofenceVerified: input.geofence ? true : null,
      distanceFromCampusMeters: input.geofence?.distanceFromCampusMeters ?? null,
      locationAccuracyMeters: input.geofence?.locationAccuracyMeters ?? null,
    },
    staff: {
      id: teacher.id,
      displayName: teacher.displayName,
      email: teacher.user.email,
      role: teacher.user.role,
      badgeCode: teacher.badgeCode,
    },
    cutoff: late.cutoff,
  };
}

export function hashDedupe(...parts: string[]) {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
}
