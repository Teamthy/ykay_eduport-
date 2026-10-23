import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shuffled, type PublicQuestion } from "@/lib/cbt";
import { isResponse, requireCbtUser } from "@/lib/cbt-auth";
import { signCbtDraw } from "@/lib/cbt-draw";

/**
 * Signed-in: fetch a randomized set of published questions for a subject.
 *
 * Query: subject (slug), limit (1-100), difficulty (0 mixed / 1-3), topic.
 *
 * SECURITY (SEC-02): anonymous access let anyone enumerate the practice
 * bank and harvest answers through /check. This now requires a session
 * (the /cbt page already redirects anonymous visitors to login), samples
 * by ID instead of loading every stem/option for the subject, and returns
 * a signed `drawToken` naming the exact questions issued. /check and
 * /attempts accept only questions inside a valid draw for this user.
 * The response still NEVER contains correctIndex or explanation.
 */
export async function GET(req: NextRequest) {
  const user = await requireCbtUser();
  if (isResponse(user)) return user;

  const slug = req.nextUrl.searchParams.get("subject") ?? "";
  const questionCount = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 30) || 30, 1),
    100,
  );
  const difficulty = Number(req.nextUrl.searchParams.get("difficulty") ?? 0) || 0;
  const topic = (req.nextUrl.searchParams.get("topic") ?? "").trim();

  const subject = await prisma.cbtSubject.findUnique({ where: { slug } });
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  const where = {
    subjectId: subject.id,
    status: "published",
    ...(difficulty >= 1 && difficulty <= 3 ? { difficulty } : {}),
    ...(topic ? { topic } : {}),
  };

  // Sample IDs first so a 30-question paper no longer loads the text of the
  // whole published bank into memory.
  const idRows = await prisma.cbtQuestion.findMany({
    where,
    select: { id: true },
    orderBy: { id: "asc" },
    take: 5000,
  });
  const drawnIds = shuffled(idRows.map((row) => row.id)).slice(0, questionCount);

  const rows = drawnIds.length
    ? await prisma.cbtQuestion.findMany({
        where: { id: { in: drawnIds }, subjectId: subject.id, status: "published" },
        select: { id: true, topic: true, difficulty: true, stem: true, options: true },
      })
    : [];
  const byId = new Map(rows.map((row) => [row.id, row]));

  const questions: PublicQuestion[] = drawnIds.flatMap((id) => {
    const q = byId.get(id);
    if (!q) return [];
    return [
      {
        id: q.id,
        topic: q.topic,
        difficulty: q.difficulty,
        stem: q.stem,
        options: (q.options as string[]).map((o, i) => `${"ABCD"[i]}. ${o}`),
      },
    ];
  });

  return NextResponse.json({
    subject: { slug: subject.slug, name: subject.name },
    questions,
    drawToken: signCbtDraw({
      userId: user.id,
      subjectId: subject.id,
      questionIds: questions.map((q) => q.id),
    }),
  });
}
