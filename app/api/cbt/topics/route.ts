import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, requireCbtUser } from "@/lib/cbt-auth";
import { REVIEWED_QUESTION_FILTER } from "@/lib/cbt-review";

/** Signed-in: distinct reviewed topics for a subject slug. */
export async function GET(req: NextRequest) {
  const user = await requireCbtUser();
  if (isResponse(user)) return user;

  const slug = req.nextUrl.searchParams.get("subject") ?? "";
  const term = (req.nextUrl.searchParams.get("term") ?? "all").trim().toLowerCase();
  if (!["all", "first", "second", "third"].includes(term)) {
    return NextResponse.json(
      { error: "Choose first, second, third or all terms." },
      { status: 400 },
    );
  }
  const subject = await prisma.cbtSubject.findUnique({ where: { slug }, select: { id: true } });
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  const rows = await prisma.cbtQuestion.findMany({
    where: {
      subjectId: subject.id,
      ...REVIEWED_QUESTION_FILTER,
      ...(term !== "all" ? { term } : {}),
    },
    distinct: ["topic"],
    select: { topic: true },
    orderBy: { topic: "asc" },
    take: 200,
  });
  return NextResponse.json({ topics: rows.map((r) => r.topic).filter(Boolean) });
}
