import { describe, expect, it } from "vitest";
import { activeNavigationHref } from "@/lib/route-matching";

describe("active navigation route matching", () => {
  const adminHrefs = [
    "/admin",
    "/admin/students",
    "/admin/staff",
    "/admin/staff-assignments",
    "/admin/fees",
    "/admin/fees/structures",
  ];

  it("does not confuse staff accounts with staff assignments", () => {
    expect(activeNavigationHref("/admin/staff-assignments", adminHrefs)).toBe(
      "/admin/staff-assignments",
    );
    expect(activeNavigationHref("/admin/staff", adminHrefs)).toBe("/admin/staff");
  });

  it("uses the most specific parent route for nested pages", () => {
    expect(activeNavigationHref("/admin/students/stu_123", adminHrefs)).toBe("/admin/students");
    expect(activeNavigationHref("/admin/fees/structures", adminHrefs)).toBe(
      "/admin/fees/structures",
    );
  });

  it("resolves parent portal routes without activating a sibling page", () => {
    const parentHrefs = [
      "/parent/dashboard",
      "/parent/report-cards",
      "/parent/exam-results",
      "/parent/leaderboards",
    ];
    expect(activeNavigationHref("/parent/exam-results", parentHrefs)).toBe("/parent/exam-results");
    expect(activeNavigationHref("/parent/leaderboards/term_1", parentHrefs)).toBe(
      "/parent/leaderboards",
    );
    expect(activeNavigationHref("/parent/exams", parentHrefs)).toBeNull();
  });

  it("does not match a route by partial text or a different path segment", () => {
    expect(activeNavigationHref("/admin/staffing", adminHrefs)).toBeNull();
    expect(activeNavigationHref("/parent/dashboard", adminHrefs)).toBeNull();
  });
});
