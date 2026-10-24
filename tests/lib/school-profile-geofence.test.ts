import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../setup";

vi.mock("@prisma/client", () => ({
  UserRole: {
    ADMIN: "ADMIN",
    DIRECTOR: "DIRECTOR",
    SUPER_ADMIN: "SUPER_ADMIN",
  },
}));

const routeMocks = vi.hoisted(() => ({
  user: { id: "admin_1", schoolId: "school_1", role: "ADMIN" },
  requireRole: vi.fn(),
}));

vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return { ...actual, requireRole: routeMocks.requireRole };
});

function put(body: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/school-profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const currentSchool = {
  id: "school_1",
  name: "Test School",
  address: "",
  campusLatitude: null,
  campusLongitude: null,
  geofenceRadiusMeters: 150,
  geofenceEnabled: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.requireRole.mockResolvedValue(routeMocks.user);
  mockPrisma.school.findUnique.mockResolvedValue(currentSchool);
  mockPrisma.school.update.mockResolvedValue({
    ...currentSchool,
    address: "1 Example Road",
    campusLatitude: 6.5,
    campusLongitude: 3.4,
    geofenceRadiusMeters: 200,
    geofenceEnabled: true,
  });
  mockPrisma.auditLog.create.mockResolvedValue({});
});

describe("PUT /api/admin/school-profile — campus location and geofence settings", () => {
  it("rejects a single coordinate without changing the school", async () => {
    const { PUT } = await import("@/app/api/admin/school-profile/route");
    const response = await PUT(put({ campusLatitude: 6.5, geofenceEnabled: false }));

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("both campus coordinates"),
    });
    expect(mockPrisma.school.update).not.toHaveBeenCalled();
  });

  it("requires a campus pin before GPS attendance can be enabled", async () => {
    const { PUT } = await import("@/app/api/admin/school-profile/route");
    const response = await PUT(
      put({ campusLatitude: null, campusLongitude: null, geofenceEnabled: true }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("latitude and longitude"),
    });
    expect(mockPrisma.school.update).not.toHaveBeenCalled();
  });

  it("persists a confirmed location and bounds the radius", async () => {
    const { PUT } = await import("@/app/api/admin/school-profile/route");
    const response = await PUT(
      put({
        address: "1 Example Road",
        campusLatitude: 6.5,
        campusLongitude: 3.4,
        geofenceRadiusMeters: 200,
        geofenceEnabled: true,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.school.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "school_1" },
        data: expect.objectContaining({
          campusLatitude: 6.5,
          campusLongitude: 3.4,
          geofenceRadiusMeters: 200,
          geofenceEnabled: true,
        }),
      }),
    );
    const audit = mockPrisma.auditLog.create.mock.calls[0][0].data;
    expect(audit.schoolId).toBe("school_1");
    expect(audit.metadata).not.toHaveProperty("campusLatitude");
    expect(audit.metadata).not.toHaveProperty("campusLongitude");
  });

  it("rejects out-of-range coordinates and radius values at the API boundary", async () => {
    const { PUT } = await import("@/app/api/admin/school-profile/route");
    const response = await PUT(
      put({
        campusLatitude: 91,
        campusLongitude: 3.4,
        geofenceRadiusMeters: 49,
        geofenceEnabled: true,
      }),
    );

    expect(response.status).toBe(422);
    expect(mockPrisma.school.update).not.toHaveBeenCalled();
  });

  it("does not preserve corrupted legacy coordinates when unrelated settings are saved", async () => {
    mockPrisma.school.findUnique.mockResolvedValue({
      ...currentSchool,
      campusLatitude: 91,
      campusLongitude: 3.4,
    });

    const { PUT } = await import("@/app/api/admin/school-profile/route");
    const response = await PUT(put({ address: "1 Example Road" }));

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("coordinates") });
    expect(mockPrisma.school.update).not.toHaveBeenCalled();
  });

  it("fails clearly when the migration is missing", async () => {
    mockPrisma.school.findUnique.mockRejectedValue(new Error("column does not exist"));

    const { PUT } = await import("@/app/api/admin/school-profile/route");
    const response = await PUT(
      put({ campusLatitude: 6.5, campusLongitude: 3.4, geofenceEnabled: true }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("migration") });
    expect(mockPrisma.school.update).not.toHaveBeenCalled();
  });
});
