import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/leaderboards/route";
import { loadAdminLeaderboardView } from "@/lib/leaderboards-server";
import { requireRole } from "@/lib/session";

vi.mock("@prisma/client", () => ({
  UserRole: {
    ADMIN: "ADMIN",
    DIRECTOR: "DIRECTOR",
    COORDINATOR: "COORDINATOR",
    SUPER_ADMIN: "SUPER_ADMIN",
  },
}));

const routeMocks = vi.hoisted(() => ({ requireRole: vi.fn() }));
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return { ...actual, requireRole: routeMocks.requireRole };
});
vi.mock("@/lib/leaderboards-server", () => ({ loadAdminLeaderboardView: vi.fn() }));

function request(query = "") {
  return new NextRequest(`http://localhost/api/admin/leaderboards${query}`);
}

describe("admin leaderboard API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRole).mockResolvedValue({
      id: "admin_user",
      schoolId: "school_a",
      role: "ADMIN",
    } as never);
    vi.mocked(loadAdminLeaderboardView).mockResolvedValue({
      ok: true,
      data: {
        classroom: { id: "class_a", displayName: "SS2 A", level: "SS2" },
        classOptions: [{ id: "class_a", displayName: "SS2 A", level: "SS2" }],
        periodLabel: "2026/2027 · First Term",
        subjectOptions: [{ id: "subject_a", name: "Mathematics" }],
        selectedSubject: null,
        cohortSize: 1,
        learners: [
          { id: "student_a", studentId: "YK-001", displayName: "Student A", rank: 1, stars: 5 },
        ],
      },
    } as never);
  });

  it("authorizes academic admins and scopes the loader to the signed-in tenant", async () => {
    const response = await GET(
      request("?category=CA&scope=SUBJECT&classId=class_a&subjectId=subject_a"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(requireRole).toHaveBeenCalled();
    expect(loadAdminLeaderboardView).toHaveBeenCalledWith({
      schoolId: "school_a",
      classId: "class_a",
      category: "CA",
      scope: "SUBJECT",
      subjectId: "subject_a",
    });
    expect(body.learners[0].rank).toBe(1);
    expect(JSON.stringify(body)).not.toContain("totalScore");
  });

  it("rejects malformed filters before loading any cohort data", async () => {
    const response = await GET(request("?category=PAYMENTS&scope=CLASS"));

    expect(response.status).toBe(400);
    expect(loadAdminLeaderboardView).not.toHaveBeenCalled();
  });

  it("returns a stable JSON 503 when its data source fails", async () => {
    vi.mocked(loadAdminLeaderboardView).mockRejectedValue(new Error("database failure"));

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("temporarily unavailable");
  });
});
