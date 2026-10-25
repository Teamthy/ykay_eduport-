import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDailyStaffCheckInQr, verifyDailyStaffCheckInQr } from "@/lib/staff-attendance";

vi.mock("@prisma/client", () => ({
  UserRole: {
    ADMIN: "ADMIN",
    DIRECTOR: "DIRECTOR",
    COORDINATOR: "COORDINATOR",
    SUPER_ADMIN: "SUPER_ADMIN",
    TEACHER: "TEACHER",
    HOD: "HOD",
    BURSAR: "BURSAR",
  },
  StaffAttendanceEventType: { CHECK_IN: "CHECK_IN", CHECK_OUT: "CHECK_OUT" },
}));

process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long-for-testing";

describe("daily staff attendance QR", () => {
  const morning = new Date("2026-06-01T09:00:00.000Z");
  const nextDay = new Date("2026-06-02T09:00:00.000Z");

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long-for-testing";
  });

  it("creates a stable school-bound code for the current school day", () => {
    const token = createDailyStaffCheckInQr("school_a", morning);

    expect(token).toBe(createDailyStaffCheckInQr("school_a", morning));
    expect(verifyDailyStaffCheckInQr(token, "school_a", morning)).toBe(true);
    expect(verifyDailyStaffCheckInQr(token, "school_b", morning)).toBe(false);
    expect(verifyDailyStaffCheckInQr(token, "school_a", nextDay)).toBe(false);
  });

  it("rejects tampering and malformed payloads", () => {
    const token = createDailyStaffCheckInQr("school_a", morning);
    const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;

    expect(verifyDailyStaffCheckInQr(tampered, "school_a", morning)).toBe(false);
    expect(verifyDailyStaffCheckInQr("not.a.valid.signature", "school_a", morning)).toBe(false);
    expect(verifyDailyStaffCheckInQr("", "school_a", morning)).toBe(false);
  });

  it("fails closed if the signing secret is missing", () => {
    delete process.env.AUTH_SECRET;

    expect(() => createDailyStaffCheckInQr("school_a", morning)).toThrow("AUTH_SECRET");
    expect(verifyDailyStaffCheckInQr("broken.token", "school_a", morning)).toBe(false);
  });
});
