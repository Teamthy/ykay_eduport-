import { NextResponse } from "next/server";
import { REVIEWED_QUESTION_FILTER } from "@/lib/cbt-review";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

type StatusGroup = { subjectId: string; status: string; _count: { _all: number } };
type EligibleGroup = { subjectId: string; _count: { _all: number } };
type SubjectRow = { id: string; name: string; slug: string; classLevel: string };

/**
 * Read-only cross-platform CBT-bank readiness for the Super Admin console.
 *
 * CBT questions are shared content (CbtSubject has no schoolId), so this is a
 * global count, not a tenant-specific report. Students only receive rows that
 * match REVIEWED_QUESTION_FILTER; the eligible count makes incomplete review
 * records visible without exposing question text or user data.
 */
export async function GET() {
  const user = await requireRole(["SUPER_ADMIN"]);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [
    total,
    draft,
    reviewed,
    archived,
    eligibleForPractice,
    practiceAttempts,
    subjects,
    statusGroups,
    eligibleGroups,
  ] = await Promise.all([
    prisma.cbtQuestion.count(),
    prisma.cbtQuestion.count({ where: { status: "draft" } }),
    prisma.cbtQuestion.count({ where: { status: "reviewed" } }),
    prisma.cbtQuestion.count({ where: { status: "archived" } }),
    prisma.cbtQuestion.count({ where: REVIEWED_QUESTION_FILTER }),
    prisma.cbtAttempt.count({ where: { mode: "practice", createdAt: { gte: since } } }),
    prisma.cbtSubject.findMany({
      orderBy: [{ classLevel: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, classLevel: true },
    }),
    prisma.cbtQuestion.groupBy({
      by: ["subjectId", "status"],
      _count: { _all: true },
    }),
    prisma.cbtQuestion.groupBy({
      by: ["subjectId"],
      where: REVIEWED_QUESTION_FILTER,
      _count: { _all: true },
    }),
  ]);

  const statusBySubject = new Map<string, { draft: number; reviewed: number; archived: number }>();
  for (const row of statusGroups as StatusGroup[]) {
    const counts = statusBySubject.get(row.subjectId) ?? { draft: 0, reviewed: 0, archived: 0 };
    if (row.status === "draft" || row.status === "reviewed" || row.status === "archived") {
      counts[row.status] = row._count._all;
    }
    statusBySubject.set(row.subjectId, counts);
  }
  const eligibleBySubject = new Map(
    (eligibleGroups as EligibleGroup[]).map((row) => [row.subjectId, row._count._all]),
  );

  const subjectRows = (subjects as SubjectRow[]).map((subject) => {
    const counts = statusBySubject.get(subject.id) ?? { draft: 0, reviewed: 0, archived: 0 };
    return {
      name: subject.name,
      slug: subject.slug,
      classLevel: subject.classLevel,
      total: counts.draft + counts.reviewed + counts.archived,
      ...counts,
      eligibleForPractice: eligibleBySubject.get(subject.id) ?? 0,
    };
  });

  const byClassLevel = new Map<
    string,
    { subjects: number; total: number; eligibleForPractice: number }
  >();
  for (const subject of subjectRows) {
    const level = byClassLevel.get(subject.classLevel) ?? {
      subjects: 0,
      total: 0,
      eligibleForPractice: 0,
    };
    level.subjects += 1;
    level.total += subject.total;
    level.eligibleForPractice += subject.eligibleForPractice;
    byClassLevel.set(subject.classLevel, level);
  }

  const readiness = total === 0 ? "EMPTY" : eligibleForPractice === 0 ? "NEEDS_REVIEW" : "READY";
  return NextResponse.json(
    {
      readiness,
      counts: { total, draft, reviewed, archived, eligibleForPractice },
      practiceAttemptsLast30Days: practiceAttempts,
      byClassLevel: [...byClassLevel.entries()].map(([classLevel, counts]) => ({
        classLevel,
        ...counts,
      })),
      subjects: subjectRows,
      studentPracticePath: "/student/personal-practice",
      adminReviewPath: "/admin/cbt-bank",
      updatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
