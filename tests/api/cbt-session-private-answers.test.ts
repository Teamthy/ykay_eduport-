import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../setup";
import { signCbtDraw } from "@/lib/cbt-draw";

const auth = vi.hoisted(() => ({
  user: { id: "student_1", schoolId: "school_1", role: "STUDENT" },
}));

vi.mock("@/lib/cbt-auth", () => ({
  requireCbtUser: vi.fn(async () => auth.user),
  isResponse: (value: unknown) => value instanceof Response,
}));

import { GET, PATCH } from "@/app/api/cbt/sessions/[id]/route";

const attemptId = "attempt_1";
const questionId = "question_1";
const userId = "student_1";

function attemptRow() {
  return {
    id: attemptId,
    subjectId: "subject_1",
    userId,
    schoolId: "school_1",
    studentProfileId: "student_profile_1",
    classLevel: "ss1",
    practiceMode: "subject",
    topic: null,
    subjectIds: ["subject_1"],
    questionIds: [questionId],
    drawToken: signCbtDraw({ userId, subjectId: "subject_1", questionIds: [questionId] }),
    status: "IN_PROGRESS",
    isTimed: false,
    deadlineAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    completedAt: null,
    createdAt: new Date(Date.now() - 5_000),
    correct: 0,
    skipped: 0,
    scorePct: 0,
    durationSeconds: 0,
  };
}

const bankQuestion = {
  id: questionId,
  subjectId: "subject_1",
  topic: "Fractions",
  difficulty: 1,
  stem: "Which fraction is equivalent to one half?",
  options: ["1/3", "2/4", "3/5", "4/7"],
  correctIndex: 1,
  explanation: "Multiply the numerator and denominator of 1/2 by two.",
  subject: { name: "Mathematics" },
};

const storedAnswer = {
  questionId,
  selectedIndex: 1,
  isCorrect: true,
  correctIndex: 1,
  explanation: bankQuestion.explanation,
};

function request(body: unknown) {
  return new NextRequest(`http://localhost/api/cbt/sessions/${attemptId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("personal practice answer privacy before submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long-for-testing";
    mockPrisma.cbtAttempt.findFirst.mockResolvedValue(attemptRow() as never);
    mockPrisma.cbtQuestion.findMany.mockResolvedValue([bankQuestion] as never);
    mockPrisma.cbtPracticeAnswer.findMany.mockResolvedValue([storedAnswer] as never);
    mockPrisma.cbtPracticeAnswer.upsert.mockResolvedValue(storedAnswer as never);
  });

  it("omits correctness and explanation from an in-progress session read", async () => {
    const response = await GET(new NextRequest(`http://localhost/api/cbt/sessions/${attemptId}`), {
      params: Promise.resolve({ id: attemptId }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.answers).toEqual([{ questionId, selectedIndex: 1 }]);
    expect(JSON.stringify(payload)).not.toContain("correctIndex");
    expect(JSON.stringify(payload)).not.toContain("explanation");
  });

  it("saves a selection without returning answer-key information", async () => {
    const response = await PATCH(request({ action: "SAVE", questionId, selectedIndex: 1 }), {
      params: Promise.resolve({ id: attemptId }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, saved: true, questionId, selectedIndex: 1 });
    expect(JSON.stringify(payload)).not.toContain("correctIndex");
    expect(JSON.stringify(payload)).not.toContain("explanation");
    expect(mockPrisma.cbtPracticeAnswer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { attemptId_questionId: { attemptId, questionId } },
        update: expect.objectContaining({ selectedIndex: 1 }),
      }),
    );
  });
});
