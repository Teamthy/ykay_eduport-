import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, requireCbtUser } from "@/lib/cbt-auth";
import { REVIEWED_QUESTION_FILTER } from "@/lib/cbt-review";

/** Signed-in: class-filtered subjects with reviewed-question counts for personal practice. */
export async function GET(request: NextRequest) {
  const user = await requireCbtUser();
  if (isResponse(user)) return user;

  const classLevel = (request.nextUrl.searchParams.get("classLevel") ?? "").trim().toLowerCase();
  const term = (request.nextUrl.searchParams.get("term") ?? "all").trim().toLowerCase();
  if (!["all", "first", "second", "third"].includes(term)) {
    return NextResponse.json(
      { error: "Choose first, second, third or all terms." },
      { status: 400 },
    );
  }
  const weekParam = (request.nextUrl.searchParams.get("week") ?? "all").trim().toLowerCase();
  const week = weekParam === "all" ? null : Number(weekParam);
  if (
    weekParam !== "all" &&
    (!Number.isInteger(week) || week! < 1 || week! > 52 || term === "all")
  ) {
    return NextResponse.json(
      { error: "Choose a valid week within a specific term." },
      { status: 400 },
    );
  }
  const questionFilter = {
    ...REVIEWED_QUESTION_FILTER,
    ...(term !== "all" ? { term } : {}),
    ...(week !== null ? { week } : {}),
  };
  const supportedLevels = new Set(["jss1", "jss2", "jss3", "ss1", "ss2", "ss3"]);
  if (classLevel && !supportedLevels.has(classLevel)) {
    return NextResponse.json({ error: "Choose a class from JSS1 to SS3." }, { status: 400 });
  }

  const subjects = await prisma.cbtSubject.findMany({
    where: {
      ...(classLevel ? { classLevel } : {}),
      questions: { some: questionFilter },
    },
    orderBy: [{ classLevel: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      classLevel: true,
      department: true,
      _count: { select: { questions: { where: questionFilter } } },
    },
  });
  return NextResponse.json({
    subjects: subjects.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      classLevel: s.classLevel,
      department: s.department,
      questionCount: s._count.questions,
    })),
  });
}
