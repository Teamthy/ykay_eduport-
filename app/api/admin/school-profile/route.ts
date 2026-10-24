import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp, jsonNoStore } from "@/lib/requests";
import { confirmedSchoolAddress } from "@/lib/school-address";
import { MAX_GEOFENCE_RADIUS_METERS, MIN_GEOFENCE_RADIUS_METERS } from "@/lib/staff-geofence";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Only people who speak for the school can change its public location / fence. */
const EDIT_ROLES = [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.SUPER_ADMIN];

const updateSchema = z.object({
  address: z
    .string()
    .trim()
    .max(300, "Keep the address under 300 characters.")
    .refine((value) => !/[<>]/.test(value), "The address cannot contain < or > characters.")
    .optional(),
  campusLatitude: z.number().finite().min(-90).max(90).nullable().optional(),
  campusLongitude: z.number().finite().min(-180).max(180).nullable().optional(),
  geofenceRadiusMeters: z
    .number()
    .int()
    .min(MIN_GEOFENCE_RADIUS_METERS)
    .max(MAX_GEOFENCE_RADIUS_METERS)
    .optional(),
  geofenceEnabled: z.boolean().optional(),
});

type SchoolProfileRecord = {
  id: string;
  name: string;
  address: string;
  campusLatitude: number | null;
  campusLongitude: number | null;
  geofenceRadiusMeters: number;
  geofenceEnabled: boolean;
};

const PROFILE_SELECT = {
  id: true,
  name: true,
  address: true,
  campusLatitude: true,
  campusLongitude: true,
  geofenceRadiusMeters: true,
  geofenceEnabled: true,
} as const;

function migrationUnavailable() {
  return jsonNoStore(
    {
      error:
        "Campus map and GPS settings are currently unavailable. Confirm the campus-location migration is applied and the database is reachable.",
    },
    { status: 503 },
  );
}

export async function GET() {
  const user = await requireRole(EDIT_ROLES);
  if (!user) return jsonNoStore({ error: "Unauthorized" }, { status: 401 });

  let school: SchoolProfileRecord | null;
  try {
    school = await prisma.school.findUnique({
      where: { id: user.schoolId },
      select: PROFILE_SELECT,
    });
  } catch {
    return migrationUnavailable();
  }
  if (!school) return jsonNoStore({ error: "School not found." }, { status: 404 });

  return jsonNoStore({
    name: school.name,
    address: confirmedSchoolAddress(school.address) ?? "",
    addressConfirmed: confirmedSchoolAddress(school.address) !== null,
    campusLatitude: school.campusLatitude,
    campusLongitude: school.campusLongitude,
    geofenceRadiusMeters: school.geofenceRadiusMeters,
    geofenceEnabled: school.geofenceEnabled,
  });
}

export async function PUT(request: NextRequest) {
  const user = await requireRole(EDIT_ROLES);
  if (!user) return jsonNoStore({ error: "Unauthorized" }, { status: 401 });

  let payload: z.infer<typeof updateSchema>;
  try {
    payload = updateSchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message
        : "Please check the school profile and try again.";
    return jsonNoStore(
      { error: message || "Please check the school profile and try again." },
      { status: 422 },
    );
  }

  let current: SchoolProfileRecord | null;
  try {
    current = await prisma.school.findUnique({
      where: { id: user.schoolId },
      select: PROFILE_SELECT,
    });
  } catch {
    return migrationUnavailable();
  }
  if (!current) return jsonNoStore({ error: "School not found." }, { status: 404 });

  const campusLatitude =
    payload.campusLatitude !== undefined ? payload.campusLatitude : current.campusLatitude;
  const campusLongitude =
    payload.campusLongitude !== undefined ? payload.campusLongitude : current.campusLongitude;
  const geofenceRadiusMeters = payload.geofenceRadiusMeters ?? current.geofenceRadiusMeters;
  const geofenceEnabled = payload.geofenceEnabled ?? current.geofenceEnabled;

  if ((campusLatitude === null) !== (campusLongitude === null)) {
    return jsonNoStore(
      { error: "Enter both campus coordinates, or clear both coordinates." },
      { status: 422 },
    );
  }
  if (
    campusLatitude !== null &&
    campusLongitude !== null &&
    (!Number.isFinite(campusLatitude) ||
      campusLatitude < -90 ||
      campusLatitude > 90 ||
      !Number.isFinite(campusLongitude) ||
      campusLongitude < -180 ||
      campusLongitude > 180)
  ) {
    return jsonNoStore(
      { error: "Campus coordinates are invalid. Re-enter a valid latitude and longitude." },
      { status: 422 },
    );
  }
  if (
    !Number.isInteger(geofenceRadiusMeters) ||
    geofenceRadiusMeters < MIN_GEOFENCE_RADIUS_METERS ||
    geofenceRadiusMeters > MAX_GEOFENCE_RADIUS_METERS
  ) {
    return jsonNoStore(
      {
        error: `The GPS boundary must be from ${MIN_GEOFENCE_RADIUS_METERS} to ${MAX_GEOFENCE_RADIUS_METERS} metres.`,
      },
      { status: 422 },
    );
  }
  if (geofenceEnabled && (campusLatitude === null || campusLongitude === null)) {
    return jsonNoStore(
      { error: "Set the campus latitude and longitude before enabling GPS check-in." },
      { status: 422 },
    );
  }

  const currentAddress = confirmedSchoolAddress(current.address) ?? "";
  const address =
    payload.address === undefined
      ? currentAddress
      : (confirmedSchoolAddress(payload.address) ?? "");

  let school: SchoolProfileRecord;
  try {
    school = await prisma.$transaction(async (tx) => {
      const updatedSchool = await tx.school.update({
        where: { id: user.schoolId },
        data: {
          address,
          campusLatitude,
          campusLongitude,
          geofenceRadiusMeters,
          geofenceEnabled,
        },
        select: PROFILE_SELECT,
      });
      await tx.auditLog.create({
        data: {
          schoolId: user.schoolId,
          actorUserId: user.id,
          action: "SCHOOL_LOCATION_SETTINGS_UPDATED",
          entityType: "School",
          entityId: updatedSchool.id,
          metadata: {
            addressSet: Boolean(updatedSchool.address),
            campusLocationSet:
              updatedSchool.campusLatitude !== null && updatedSchool.campusLongitude !== null,
            geofenceEnabled: updatedSchool.geofenceEnabled,
            geofenceRadiusMeters: updatedSchool.geofenceRadiusMeters,
          },
          ipAddress: getClientIp(request),
        },
      });
      return updatedSchool;
    });
  } catch {
    return migrationUnavailable();
  }

  return jsonNoStore({
    ok: true,
    name: school.name,
    address: confirmedSchoolAddress(school.address) ?? "",
    addressConfirmed: confirmedSchoolAddress(school.address) !== null,
    campusLatitude: school.campusLatitude,
    campusLongitude: school.campusLongitude,
    geofenceRadiusMeters: school.geofenceRadiusMeters,
    geofenceEnabled: school.geofenceEnabled,
  });
}
