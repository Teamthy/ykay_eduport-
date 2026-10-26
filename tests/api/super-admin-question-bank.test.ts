import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../setup";

const roles = vi.hoisted(() => ({ requireRole: vi.fn() }));

vi.mock("@/lib/session", () => ({ requireRole: roles.requireRole }));

import { GET } from "@/app/api/super-admin/question-bank/route";

describe("GET /api/super-admin/question-bank", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roles.requireRole.mockResolvedValue({ id: "super_admin_1", role: "SUPER_ADMIN" });
    mockPrisma.cbtQuestion.count
      .mockResolvedValueOnce(10_000)
      .mockResolvedValueOnce(8_000)
      .mockResolvedValueOnce(1_900)
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(1_875);
    mockPrisma.cbtAttempt.count.mockResolvedValue(34);
    mockPrisma.cbtSubject.findMany.mockResolvedValue([
      { id: "subject_jss1_math", name: "Mathematics", slug: "math-jss1", classLevel: "jss1" },
      { id: "subject_ss1_math", name: "Mathematics", slug: "math-ss1", classLevel: "ss1" },
    ] as never);
    mockPrisma.cbtQuestion.groupBy
      .mockResolvedValueOnce([
        { subjectId: "subject_jss1_math", status: "draft", _count: { _all: 4_000 } },
        { subjectId: "subject_jss1_math", status: "reviewed", _count: { _all: 900 } },
        { subjectId: "subject_ss1_math", status: "draft", _count: { _all: 4_000 } },
        { subjectId: "subject_ss1_math", status: "reviewed", _count: { _all: 1_000 } },
        { subjectId: "subject_ss1_math", status: "archived", _count: { _all: 100 } },
      ] as never)
      .mockResolvedValueOnce([
        { subjectId: "subject_jss1_math", _count: { _all: 875 } },
        { subjectId: "subject_ss1_math", _count: { _all: 1_000 } },
      ] as never);
  });

  it("reports the same eligibility rule student practice uses and does not expose question content", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body).toMatchObject({
      readiness: "READY",
      counts: {
        total: 10_000,
        draft: 8_000,
        reviewed: 1_900,
        archived: 100,
        eligibleForPractice: 1_875,
      },
      practiceAttemptsLast30Days: 34,
      studentPracticePath: "/student/personal-practice",
      adminReviewPath: "/admin/cbt-bank",
      byClassLevel: [
        { classLevel: "jss1", subjects: 1, total: 4_900, eligibleForPractice: 875 },
        { classLevel: "ss1", subjects: 1, total: 5_100, eligibleForPractice: 1_000 },
      ],
    });
    expect(body.subjects[0]).toMatchObject({
      slug: "math-jss1",
      draft: 4_000,
      reviewed: 900,
      eligibleForPractice: 875,
    });
    expect(JSON.stringify(body)).not.toMatch(/correctIndex|explanation|stem|options/);
    expect(mockPrisma.cbtQuestion.count).toHaveBeenCalledWith({
      where: {
        status: "reviewed",
        OR: [{ reviewedByUserId: { not: null } }, { reviewedByExternalActor: { not: null } }],
        reviewedAt: { not: null },
        reviewReference: { not: null },
      },
    });
  });

  it("distinguishes an empty bank from a bank that needs review", async () => {
    mockPrisma.cbtQuestion.count
      .mockReset()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockPrisma.cbtQuestion.groupBy
      .mockReset()
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    const emptyResponse = await GET();
    expect((await emptyResponse.json()).readiness).toBe("EMPTY");

    mockPrisma.cbtQuestion.count
      .mockReset()
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockPrisma.cbtQuestion.groupBy
      .mockReset()
      .mockResolvedValueOnce([
        { subjectId: "subject_jss1_math", status: "draft", _count: { _all: 20 } },
      ] as never)
      .mockResolvedValueOnce([] as never);

    const reviewResponse = await GET();
    expect((await reviewResponse.json()).readiness).toBe("NEEDS_REVIEW");
  });

  it("rejects non-super-admin access", async () => {
    roles.requireRole.mockResolvedValueOnce(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(mockPrisma.cbtQuestion.count).not.toHaveBeenCalled();
  });
});
