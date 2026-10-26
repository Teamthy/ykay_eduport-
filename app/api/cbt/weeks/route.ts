import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, requireCbtUser } from "@/lib/cbt-auth";
import { REVIEWED_QUESTION_FILTER } from "@/lib/cbt-review";

/** Signed-in: verified week numbers with reviewed questions for the selected class/term. */
export async function GET(request: NextRequest) {
  const user = await requireCbtUser();
  if (isResponse(user)) return user;

  const classLevel = (request.nextUrl.searchParams.get("classLevel") ?? "").trim().toLowerCase();
  const term = (request.nextUrl.searchParams.get("term") ?? "").trim().toLowerCase();
  if (!["jss1", "jss2", "jss3", "ss1", "ss2", "ss3"].includes(classLevel)) {
    return NextResponse.json({ error: "Choose a class from JSS1 to SS3." }, { status: 400 });
  }
  if (!["first", "second", "third"].includes(term)) {
    return NextResponse.json(
      { error: "Choose first, second or third term before filtering by week." },
      { status: 400 },
    );
  }

  const rows = await prisma.cbtQuestion.findMany({
    where: {
      ...REVIEWED_QUESTION_FILTER,
      term,
      week: { not: null },
      subject: { is: { classLevel } },
    },
    distinct: ["week"],
    select: { week: true },
    orderBy: { week: "asc" },
    take: 52,
  });
  return NextResponse.json({ weeks: rows.flatMap((row) => (row.week == null ? [] : [row.week])) });
}
