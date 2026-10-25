import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "@/app/api/admin/staff-attendance/check-in-qr/route";
import { verifyDailyStaffCheckInQr, workDateKey } from "@/lib/staff-attendance";

process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long-for-testing";

vi.mock("@prisma/client", () => ({
  UserRole: {
    ADMIN: "ADMIN",
    DIRECTOR: "DIRECTOR",
    COORDINATOR: "COORDINATOR",
    SUPER_ADMIN: "SUPER_ADMIN",
  },
  StaffAttendanceEventType: { CHECK_IN: "CHECK_IN", CHECK_OUT: "CHECK_OUT" },
}));

const routeMocks = vi.hoisted(() => ({ requireRoleOr503: vi.fn() }));

vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return { ...actual, requireRoleOr503: routeMocks.requireRoleOr503 };
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long-for-testing";
  routeMocks.requireRoleOr503.mockResolvedValue({
    id: "admin_user",
    schoolId: "school_a",
    role: "ADMIN",
  });
});

describe("POST /api/admin/staff-attendance/check-in-qr", () => {
  it("returns a signed QR scoped to the admin's school and school date", async () => {
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.date).toBe(workDateKey());
    expect(body.validFor).toBe("today only");
    expect(verifyDailyStaffCheckInQr(body.qrPayload, "school_a")).toBe(true);
    expect(verifyDailyStaffCheckInQr(body.qrPayload, "school_b")).toBe(false);
  });

  it("does not issue a QR while impersonating", async () => {
    routeMocks.requireRoleOr503.mockResolvedValue({
      id: "admin_user",
      schoolId: "school_a",
      role: "ADMIN",
      impersonatedBy: "super_admin",
    });

    const response = await POST();

    expect(response.status).toBe(403);
  });

  it("returns the authorization response without generating a token", async () => {
    routeMocks.requireRoleOr503.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const response = await POST();

    expect(response.status).toBe(401);
  });
});
