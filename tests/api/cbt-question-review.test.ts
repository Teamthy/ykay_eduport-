import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../setup";
import { PATCH } from "@/app/api/admin/cbt/questions/[id]/review/route";
import { assertNotImpersonating, requireRoleOr503 } from "@/lib/session";

vi.mock("@prisma/client", () => ({
  UserRole: { ADMIN: "ADMIN", SUPER_ADMIN: "SUPER_ADMIN" },
}));

vi.mock("@/lib/session", () => ({
  assertNotImpersonating: vi.fn(),
  requireRoleOr503: vi.fn(),
}));

const context = { params: Promise.resolve({ id: "question_a" }) };
const approval = {
  decision: "APPROVE",
  reference: "NERDC Basic Education Curriculum, 2024, p. 42",
  notes: "Checked the key, all distractors, the explanation and the class-level alignment.",
  question: {
    topic: "Addition",
    term: "second",
    week: 6,
    difficulty: 2,
    stem: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correctIndex: 1,
    explanation: "Adding two and two gives four; option B is the only correct answer.",
    source: "original-draft",
  },
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/admin/cbt/questions/question_a/review", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("CBT question review state transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRoleOr503).mockResolvedValue({ id: "admin_a" } as never);
    vi.mocked(assertNotImpersonating).mockReturnValue(null);
    mockPrisma.cbtQuestion.findUnique.mockResolvedValue({
      id: "question_a",
      status: "draft",
    } as never);
    mockPrisma.cbtQuestion.updateMany.mockResolvedValue({ count: 1 } as never);
  });

  it("allows approval only from draft and persists the approved content and citation", async () => {
    const response = await PATCH(request(approval), context);

    expect(response.status).toBe(200);
    expect(mockPrisma.cbtQuestion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "question_a", status: "draft" },
        data: expect.objectContaining({
          status: "reviewed",
          difficulty: 2,
          term: "second",
          week: 6,
          source: "original-draft",
          reviewReference: approval.reference,
          reviewedByUserId: "admin_a",
        }),
      }),
    );
  });

  it("rejects approval if the question leaves draft during review", async () => {
    mockPrisma.cbtQuestion.updateMany.mockResolvedValue({ count: 0 } as never);

    const response = await PATCH(request(approval), context);

    expect(response.status).toBe(409);
  });

  it("blocks direct approval of archived questions", async () => {
    mockPrisma.cbtQuestion.findUnique.mockResolvedValue({
      id: "question_a",
      status: "archived",
    } as never);

    const response = await PATCH(request(approval), context);

    expect(response.status).toBe(409);
    expect(mockPrisma.cbtQuestion.updateMany).not.toHaveBeenCalled();
  });

  it("blocks returning a draft through the reviewed-question action", async () => {
    const response = await PATCH(
      request({ decision: "RETURN", notes: "Return this item for revision and factual review." }),
      context,
    );

    expect(response.status).toBe(409);
    expect(mockPrisma.cbtQuestion.updateMany).not.toHaveBeenCalled();
  });
});
