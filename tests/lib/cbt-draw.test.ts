import { describe, expect, it } from "vitest";

process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long-for-testing";

/**
 * SEC-02 regression: /api/cbt/check and /attempts accept only questions in
 * a signed, unexpired draw issued to the same user.
 */
describe("CBT draw tokens", () => {
  it("round-trips a draw for its owner", async () => {
    const { signCbtDraw, verifyCbtDraw } = await import("@/lib/cbt-draw");
    const token = signCbtDraw({
      userId: "user_1",
      subjectId: "subject_1",
      questionIds: ["q1", "q2"],
      nowSeconds: 1_000,
    });
    const draw = verifyCbtDraw(token, "user_1", 1_500);
    expect(draw).not.toBeNull();
    expect(draw!.subjectId).toBe("subject_1");
    expect(draw!.questionIds).toEqual(["q1", "q2"]);
  });

  it("rejects a draw presented by a different user", async () => {
    const { signCbtDraw, verifyCbtDraw } = await import("@/lib/cbt-draw");
    const token = signCbtDraw({
      userId: "user_1",
      subjectId: "subject_1",
      questionIds: ["q1"],
      nowSeconds: 1_000,
    });
    expect(verifyCbtDraw(token, "user_2", 1_500)).toBeNull();
  });

  it("rejects expired draws", async () => {
    const { signCbtDraw, verifyCbtDraw, CBT_DRAW_TTL_SECONDS } = await import("@/lib/cbt-draw");
    const token = signCbtDraw({
      userId: "user_1",
      subjectId: "subject_1",
      questionIds: ["q1"],
      nowSeconds: 1_000,
    });
    expect(verifyCbtDraw(token, "user_1", 1_000 + CBT_DRAW_TTL_SECONDS + 1)).toBeNull();
  });

  it("rejects tampered payloads (question-ID injection)", async () => {
    const { signCbtDraw, verifyCbtDraw } = await import("@/lib/cbt-draw");
    const token = signCbtDraw({
      userId: "user_1",
      subjectId: "subject_1",
      questionIds: ["q1"],
      nowSeconds: 1_000,
    });
    const [payloadPart, signature] = token.split(".");
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as {
      ids: string[];
    };
    payload.ids = ["q1", "harvested-question-id"];
    const forged =
      Buffer.from(JSON.stringify(payload), "utf8").toString("base64url") + "." + signature;
    expect(verifyCbtDraw(forged, "user_1", 1_500)).toBeNull();
  });

  it("rejects missing and malformed tokens", async () => {
    const { verifyCbtDraw } = await import("@/lib/cbt-draw");
    expect(verifyCbtDraw(undefined, "user_1")).toBeNull();
    expect(verifyCbtDraw("", "user_1")).toBeNull();
    expect(verifyCbtDraw("not-a-token", "user_1")).toBeNull();
    expect(verifyCbtDraw("a.b.c", "user_1")).toBeNull();
  });
});
