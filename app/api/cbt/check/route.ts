import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isResponse, requireCbtUser } from "@/lib/cbt-auth";
import { verifyCbtDraw } from "@/lib/cbt-draw";

const checkSchema = z.object({
  questionId: z.string().trim().min(1).max(120),
  selectedIndex: z.number().int().min(0).max(3),
  drawToken: z.string().min(20).max(16_000),
});

/**
 * Signed-in practice-mode answer check for ONE question (SEC-02).
 *
 * Reveals the correct option and explanation only for a question that was
 * actually issued to this user in a signed draw (see lib/cbt-draw.ts).
 * Before this gate, the endpoint was anonymous and accepted any question
 * ID, so the whole answer key could be harvested by enumeration.
 */
export async function POST(req: NextRequest) {
  const user = await requireCbtUser();
  if (isResponse(user)) return user;

  const parsed = checkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "questionId, selectedIndex (0-3), and a valid practice draw are required." },
      { status: 400 },
    );
  }
  const { questionId, selectedIndex, drawToken } = parsed.data;

  const draw = verifyCbtDraw(drawToken, user.id);
  if (!draw || !draw.questionIds.includes(questionId)) {
    return NextResponse.json(
      { error: "This question was not part of your practice paper. Start a new paper." },
      { status: 403 },
    );
  }

  const q = await prisma.cbtQuestion.findUnique({
    where: { id: questionId },
    select: { correctIndex: true, explanation: true, subjectId: true, status: true },
  });
  if (!q || q.subjectId !== draw.subjectId || q.status !== "published") {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json({
    correct: selectedIndex === q.correctIndex,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  });
}
