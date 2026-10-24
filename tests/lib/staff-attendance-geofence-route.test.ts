import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../setup";

vi.mock("@prisma/client", () => ({
  StaffAttendanceEventType: { CHECK_IN: "CHECK_IN", CHECK_OUT: "CHECK_OUT" },
  UserRole: {
    ADMIN: "ADMIN",
    DIRECTOR: "DIRECTOR",
    COORDINATOR: "COORDINATOR",
    SUPER_ADMIN: "SUPER_ADMIN",
    TEACHER: "TEACHER",
    HOD: "HOD",
    BURSAR: "BURSAR",
  },
}));

const routeMocks = vi.hoisted(() => ({
  user: { id: "staff_user_1", schoolId: "school_1", role: "TEACHER" },
  requireRole: vi.fn(),
  ensureTeacherBadge: vi.fn(),
  recordStaffScan: vi.fn(),
}));

vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return { ...actual, requireRole: routeMocks.requireRole };
});

vi.mock("@/lib/staff-attendance", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/staff-attendance")>();
  return {
    ...actual,
    ensureTeacherBadge: routeMocks.ensureTeacherBadge,
    recordStaffScan: routeMocks.recordStaffScan,
  };
});

function post(body: unknown) {
  return new NextRequest("http://localhost:3000/api/staff/attendance/me", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const enabledSchool = {
  campusLatitude: 0,
  campusLongitude: 0,
  geofenceEnabled: true,
  geofenceRadiusMeters: 150,
};

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.requireRole.mockResolvedValue(routeMocks.user);
  routeMocks.ensureTeacherBadge.mockResolvedValue({ badgeCode: "YKST-TEST-01" });
  routeMocks.recordStaffScan.mockResolvedValue({ event: { id: "event_1" } });
  mockPrisma.teacherProfile.findFirst.mockResolvedValue({
    id: "teacher_profile_1",
    displayName: "Test Teacher",
  });
  mockPrisma.school.findUnique.mockResolvedValue(enabledSchool);
});

describe("POST /api/staff/attendance/me — server-side geofence", () => {
  it("requires a location when the school enables the fence", async () => {
    const { POST } = await import("@/app/api/staff/attendance/me/route");
    const response = await POST(post({ action: "CHECK_IN" }));

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("location") });
    expect(routeMocks.ensureTeacherBadge).not.toHaveBeenCalled();
    expect(routeMocks.recordStaffScan).not.toHaveBeenCalled();
  });

  it("rejects a reported point outside the configured boundary", async () => {
    const { POST } = await import("@/app/api/staff/attendance/me/route");
    const response = await POST(
      post({
        action: "CHECK_IN",
        location: { latitude: 0.01, longitude: 0, accuracyMeters: 10 },
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "OUTSIDE_GEOFENCE" });
    expect(routeMocks.ensureTeacherBadge).not.toHaveBeenCalled();
    expect(routeMocks.recordStaffScan).not.toHaveBeenCalled();
  });

  it("rejects low-accuracy fixes rather than accepting them at the boundary", async () => {
    const { POST } = await import("@/app/api/staff/attendance/me/route");
    const response = await POST(
      post({ action: "CHECK_OUT", location: { latitude: 0, longitude: 0, accuracyMeters: 80 } }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "LOW_ACCURACY" });
    expect(routeMocks.recordStaffScan).not.toHaveBeenCalled();
  });

  it("records only rounded server-computed distance and accuracy for an accepted fix", async () => {
    const { POST } = await import("@/app/api/staff/attendance/me/route");
    const response = await POST(
      post({ action: "CHECK_IN", location: { latitude: 0, longitude: 0, accuracyMeters: 11 } }),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.recordStaffScan).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: "school_1",
        source: "GPS_SELF_SERVICE",
        geofence: { distanceFromCampusMeters: 0, locationAccuracyMeters: 15 },
      }),
    );
    const saved = routeMocks.recordStaffScan.mock.calls[0][0];
    expect(saved.geofence).not.toHaveProperty("latitude");
    expect(saved.geofence).not.toHaveProperty("longitude");
  });

  it("preserves existing self-service attendance when geofencing is disabled", async () => {
    mockPrisma.school.findUnique.mockResolvedValue({
      ...enabledSchool,
      geofenceEnabled: false,
    });

    const { POST } = await import("@/app/api/staff/attendance/me/route");
    const response = await POST(post({ action: "CHECK_IN" }));

    expect(response.status).toBe(201);
    expect(routeMocks.recordStaffScan).toHaveBeenCalledWith(
      expect.objectContaining({ source: "SELF_SERVICE", geofence: null }),
    );
  });

  it("fails closed with a clear 503 when the campus schema is not available", async () => {
    mockPrisma.school.findUnique.mockRejectedValue(new Error("column does not exist"));

    const { POST } = await import("@/app/api/staff/attendance/me/route");
    const response = await POST(post({ action: "CHECK_IN" }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("migration") });
    expect(routeMocks.recordStaffScan).not.toHaveBeenCalled();
  });

  it("refuses an enabled fence with no campus coordinates", async () => {
    mockPrisma.school.findUnique.mockResolvedValue({
      ...enabledSchool,
      campusLatitude: null,
      campusLongitude: null,
    });

    const { POST } = await import("@/app/api/staff/attendance/me/route");
    const response = await POST(
      post({ action: "CHECK_IN", location: { latitude: 0, longitude: 0, accuracyMeters: 10 } }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("coordinates") });
    expect(routeMocks.recordStaffScan).not.toHaveBeenCalled();
  });

  it("rejects out-of-range payload coordinates before recording attendance", async () => {
    const { POST } = await import("@/app/api/staff/attendance/me/route");
    const response = await POST(
      post({ action: "CHECK_IN", location: { latitude: 91, longitude: 0, accuracyMeters: 10 } }),
    );

    expect(response.status).toBe(400);
    expect(routeMocks.recordStaffScan).not.toHaveBeenCalled();
  });
});
