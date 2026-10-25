import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../setup";
import { POST } from "@/app/api/admin/cbt/questions/bulk-review/route";
import { assertNotImpersonating, requireRoleOr503 } from "@/lib/session";

vi.mock("@prisma/client", () => ({
  UserRole: { ADMIN: "ADMIN", SUPER_ADMIN: "SUPER_ADMIN" },
}));

vi.mock("@/lib/session", () => ({
  assertNotImpersonating: vi.fn(),
  requireRoleOr503: vi.fn(),
}));

const goodRow = {
  id: "q1",
  stem: "What is 2 + 2?",
  topic: "Addition",
  explanation: "Adding two and two gives four; option B is the only correct answer here.",
  options: ["3", "4", "5", "6"],
};

const genericRow = {
  id: "q2",
  stem: "What is 3 + 3?",
  topic: "Addition",
  explanation:
    "The correct answer is 6 because 3 + 3 = 6. 7 is incorrect because it is a common distractor.",
  options: ["5", "6", "7", "8"],
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/admin/cbt/questions/bulk-review", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const body = {
  ids: ["q1", "q2", "q3"],
  decision: "APPROVE" as const,
  reference: "NERDC Basic Education Curriculum, 2024, p. 42",
  notes: "Checked every selected item against the cited curriculum page before approving.",
};

describe("bulk CBT review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRoleOr503).mockResolvedValue({
      id: "admin_a",
      schoolId: "school_a",
    } as never);
    vi.mocked(assertNotImpersonating).mockReturnValue(null);
    mockPrisma.cbtQuestion.findMany.mockResolvedValue([goodRow, genericRow] as never);
    mockPrisma.cbtQuestion.updateMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.auditLog.create.mockResolvedValue({ id: "log_a" } as never);
  });

  it("approves only structurally sound drafts and reports the rest", async () => {
    const response = await POST(request(body));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.approved).toBe(1);
    expect(payload.rejected).toEqual([{ id: "q2", reason: "generic explanation" }]);
    expect(payload.skippedNotDraft).toEqual(["q3"]);
    expect(mockPrisma.cbtQuestion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["q1"] }, status: "draft" },
        data: expect.objectContaining({
          status: "reviewed",
          reviewedByUserId: "admin_a",
          reviewReference: body.reference,
        }),
      }),
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("caps the batch at 100 questions", async () => {
    const response = await POST(
      request({ ...body, ids: Array.from({ length: 101 }, (_, index) => `q${index}`) }),
    );

    expect(response.status).toBe(400);
    expect(mockPrisma.cbtQuestion.updateMany).not.toHaveBeenCalled();
  });

  it("requires review notes and a citation", async () => {
    const response = await POST(request({ ...body, reference: "short", notes: "ok" }));

    expect(response.status).toBe(400);
    expect(mockPrisma.cbtQuestion.updateMany).not.toHaveBeenCalled();
  });

  it("blocks bulk approval while impersonating", async () => {
    vi.mocked(assertNotImpersonating).mockReturnValue(
      Response.json({ error: "Read-only impersonation." }, { status: 403 }) as never,
    );

    const response = await POST(request(body));

    expect(response.status).toBe(403);
    expect(mockPrisma.cbtQuestion.findMany).not.toHaveBeenCalled();
  });
});
