import { StaffAttendanceEventType, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  badgePayload,
  ensureTeacherBadge,
  lateCutoffHm,
  recordStaffScan,
  STAFF_SELF_ROLES,
  workDateKey,
} from "@/lib/staff-attendance";
import { prisma } from "@/lib/prisma";
import { evaluateGeofence } from "@/lib/staff-geofence";
import { requireRole } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StaffAttendanceRow = {
  id: string;
  eventType: StaffAttendanceEventType;
  scannedAt: Date;
  isLate: boolean;
  lateMinutes: number;
  source: string;
  geofenceVerified: boolean | null;
  distanceFromCampusMeters: number | null;
  locationAccuracyMeters: number | null;
};

const actionSchema = z.object({
  action: z.enum(["CHECK_IN", "CHECK_OUT"]),
  note: z.string().trim().max(300).optional(),
  location: z
    .object({
      latitude: z.number().finite().min(-90).max(90),
      longitude: z.number().finite().min(-180).max(180),
      accuracyMeters: z.number().finite().min(0).max(5_000),
    })
    .optional(),
});

async function myTeacherProfile(userId: string, schoolId: string) {
  return prisma.teacherProfile.findFirst({
    where: { userId, schoolId, isActive: true },
  });
}

export async function GET() {
  const user = await requireRole(STAFF_SELF_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Non-teacher admin roles may not have TeacherProfile — return empty state
  let profile = await myTeacherProfile(user.id, user.schoolId);
  if (!profile && (user.role === UserRole.TEACHER || user.role === UserRole.HOD)) {
    return NextResponse.json(
      { error: "No teacher profile is linked to this account. Contact admin." },
      { status: 404 },
    );
  }

  if (!profile) {
    return NextResponse.json({
      supported: false,
      message: "Staff QR attendance is available for teaching staff profiles.",
    });
  }

  let school: {
    campusLatitude: number | null;
    campusLongitude: number | null;
    geofenceEnabled: boolean;
    geofenceRadiusMeters: number;
  } | null;
  try {
    school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      select: {
        campusLatitude: true,
        campusLongitude: true,
        geofenceEnabled: true,
        geofenceRadiusMeters: true,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Staff GPS attendance is currently unavailable. Confirm the campus-location migration is applied and the database is reachable.",
      },
      { status: 503 },
    );
  }
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

  const geofenceConfigured =
    school.campusLatitude !== null &&
    school.campusLongitude !== null &&
    Number.isFinite(school.campusLatitude) &&
    Number.isFinite(school.campusLongitude);
  const dayKey = workDateKey();
  const workDate = new Date(`${dayKey}T12:00:00.000Z`);
  let events: StaffAttendanceRow[];
  try {
    events = await prisma.staffAttendanceEvent.findMany({
      where: { teacherProfileId: profile.id, workDate },
      orderBy: { scannedAt: "asc" },
      select: {
        id: true,
        eventType: true,
        scannedAt: true,
        isLate: true,
        lateMinutes: true,
        source: true,
        geofenceVerified: true,
        distanceFromCampusMeters: true,
        locationAccuracyMeters: true,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Staff GPS attendance is currently unavailable. Confirm the attendance migration is applied and the database is reachable.",
      },
      { status: 503 },
    );
  }
  const ensured = await ensureTeacherBadge(profile.id);
  const last = events[events.length - 1] || null;

  return NextResponse.json({
    supported: true,
    date: dayKey,
    lateCutoff: lateCutoffHm(),
    geofence: {
      enabled: school.geofenceEnabled,
      configured: geofenceConfigured,
      radiusMeters: school.geofenceRadiusMeters,
    },
    staff: {
      id: profile.id,
      displayName: profile.displayName,
      badgeCode: ensured?.badgeCode || null,
      qrPayload: ensured?.badgeCode ? badgePayload(ensured.badgeCode, user.schoolId) : null,
    },
    today: {
      status: !last
        ? "ABSENT"
        : last.eventType === StaffAttendanceEventType.CHECK_IN
          ? "IN"
          : "OUT",
      checkInAt: events.find((e) => e.eventType === "CHECK_IN")?.scannedAt.toISOString() || null,
      checkOutAt:
        [...events]
          .reverse()
          .find((e) => e.eventType === "CHECK_OUT")
          ?.scannedAt.toISOString() || null,
      isLate: events.some((e) => e.eventType === "CHECK_IN" && e.isLate),
      lateMinutes: events.find((e) => e.eventType === "CHECK_IN")?.lateMinutes || 0,
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        scannedAt: e.scannedAt.toISOString(),
        isLate: e.isLate,
        lateMinutes: e.lateMinutes,
        source: e.source,
        geofenceVerified: e.geofenceVerified,
        distanceFromCampusMeters: e.distanceFromCampusMeters,
        locationAccuracyMeters: e.locationAccuracyMeters,
      })),
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await requireRole(STAFF_SELF_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await myTeacherProfile(user.id, user.schoolId);
  if (!profile) {
    return NextResponse.json(
      { error: "No teacher profile linked for self check-in." },
      { status: 404 },
    );
  }

  let input: z.infer<typeof actionSchema>;
  try {
    input = actionSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  let geofence: { distanceFromCampusMeters: number; locationAccuracyMeters: number } | null = null;
  let geofenceEnabled = false;
  let school: {
    campusLatitude: number | null;
    campusLongitude: number | null;
    geofenceEnabled: boolean;
    geofenceRadiusMeters: number;
  } | null;
  try {
    school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      select: {
        campusLatitude: true,
        campusLongitude: true,
        geofenceEnabled: true,
        geofenceRadiusMeters: true,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Staff GPS attendance is currently unavailable. Confirm the campus-location migration is applied and the database is reachable.",
      },
      { status: 503 },
    );
  }
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });
  geofenceEnabled = school.geofenceEnabled;

  if (geofenceEnabled) {
    if (
      school.campusLatitude === null ||
      school.campusLongitude === null ||
      !Number.isFinite(school.campusLatitude) ||
      !Number.isFinite(school.campusLongitude)
    ) {
      return NextResponse.json(
        { error: "Campus GPS is enabled but its coordinates are not configured." },
        { status: 503 },
      );
    }
    if (!input.location) {
      return NextResponse.json(
        { error: "Allow location access to check in or out from campus." },
        { status: 422 },
      );
    }

    const check = evaluateGeofence({
      campusLatitude: school.campusLatitude,
      campusLongitude: school.campusLongitude,
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      accuracyMeters: input.location.accuracyMeters,
      radiusMeters: school.geofenceRadiusMeters,
    });
    if (!check.allowed) {
      if (check.reason === "INVALID_LOCATION") {
        return NextResponse.json(
          { error: "Campus GPS settings are invalid. Contact an administrator." },
          { status: 503 },
        );
      }
      if (check.reason === "LOW_ACCURACY") {
        return NextResponse.json(
          {
            error: "GPS accuracy is too low. Move to an open area and try again.",
            code: check.reason,
            maxAccuracyMeters: check.maxAccuracyMeters,
          },
          { status: 422 },
        );
      }
      return NextResponse.json(
        {
          error: "Your reported location is outside the campus check-in area.",
          code: check.reason,
          radiusMeters: school.geofenceRadiusMeters,
        },
        { status: 403 },
      );
    }

    geofence = {
      distanceFromCampusMeters: check.roundedDistanceMeters,
      locationAccuracyMeters: check.roundedAccuracyMeters,
    };
  }

  const ensured = await ensureTeacherBadge(profile.id);
  if (!ensured?.badgeCode) {
    return NextResponse.json({ error: "Could not issue staff badge." }, { status: 500 });
  }

  try {
    const result = await recordStaffScan({
      schoolId: user.schoolId,
      badgeCode: ensured.badgeCode,
      eventType:
        input.action === "CHECK_IN"
          ? StaffAttendanceEventType.CHECK_IN
          : StaffAttendanceEventType.CHECK_OUT,
      scannerUserId: user.id,
      source: geofenceEnabled ? "GPS_SELF_SERVICE" : "SELF_SERVICE",
      note: input.note || null,
      geofence,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to record attendance." },
      { status: 409 },
    );
  }
}
