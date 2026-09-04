import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shuffled, type PublicQuestion } from "@/lib/cbt";

/**
 * Public: fetch a randomized set of published questions for a subject.
 *
 * SECURITY: the response NEVER contains correctIndex or explanation —
 * practice answers are checked one at a time via /api/cbt/check, and exam
 * papers are graded server-side at submit. The client cannot read the key.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("subject") ?? "";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 30) || 30, 50);

  const subject = await prisma.cbtSubject.findUnique({ where: { slug } });
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  const rows = await prisma.cbtQuestion.findMany({
    where: { subjectId: subject.id, status: "published" },
    select: { id: true, topic: true, difficulty: true, stem: true, options: true },
  });

  const questions: PublicQuestion[] = shuffled(rows)
    .slice(0, limit)
    .map((q) => ({
      id: q.id,
      topic: q.topic,
      difficulty: q.difficulty,
      stem: q.stem,
      options: (q.options as string[]).map((o, i) => `${"ABCD"[i]}. ${o}`),
    }));

  return NextResponse.json({ subject: { slug: subject.slug, name: subject.name }, questions });
}
