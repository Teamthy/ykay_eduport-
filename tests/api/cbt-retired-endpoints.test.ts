import { describe, expect, it } from "vitest";

import { POST as postAttempts } from "@/app/api/cbt/attempts/route";
import { POST as postCheck } from "@/app/api/cbt/check/route";
import { GET as getQuiz } from "@/app/api/cbt/quiz/route";

describe("retired stateless CBT endpoints", () => {
  it("return an explicit 410 instead of an unusable runner response", async () => {
    const responses = await Promise.all([getQuiz(), postCheck(), postAttempts()]);

    expect(responses.map((response) => response.status)).toEqual([410, 410, 410]);
    const quiz = await responses[0].json();
    expect(quiz.next).toBe("/student/personal-practice");
    expect((await responses[1].json()).error).toContain("saved practice session");
    expect((await responses[2].json()).error).toContain("saved practice session");
  });
});
