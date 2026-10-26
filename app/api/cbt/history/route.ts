import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isResponse, requireCbtUser } from "@/lib/cbt-auth";

export const dynamic = "force-dynamic";

const filtersSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  classLevel: z.enum(["all", "jss1", "jss2", "jss3", "ss1", "ss2", "ss3"]).default("all"),
  practiceMode: z.enum(["all", "topic", "subject", "mixed"]).default("all"),
  period: z.enum(["all", "30", "90", "365"]).default("all"),
});

const PAGE_SIZE = 10;

type HistoryAttemptRow = {
  id: string;
  subjectId: string;
  subjectIds: unknown;
  classLevel: string | null;
  practiceMode: string | null;
  topic: string | null;
  term: string | null;
  total: number;
  correct: number;
  skipped: number;
  scorePct: number;
  durationSeconds: number;
  isTimed: boolean;
  completedAt: Date | null;
  createdAt: Date;
};

type SubjectNameRow = { id: string; name: string };

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

export async function GET(request: NextRequest) {
  const user = await requireCbtUser();
  if (isResponse(user)) return user;

  const parsed = filtersSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid practice-history filters." },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const { page, classLevel, practiceMode, period } = parsed.data;
  const since =
    period === "all" ? null : new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000);
  const where = {
    userId: user.id,
    schoolId: user.schoolId,
    mode: "practice",
    status: "COMPLETED",
    ...(classLevel !== "all" ? { classLevel } : {}),
    ...(practiceMode !== "all" ? { practiceMode } : {}),
    ...(since ? { createdAt: { gte: since } } : {}),
  };

  const total = await prisma.cbtAttempt.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const [summary, rows] = await Promise.all([
    prisma.cbtAttempt.aggregate({
      where,
      _avg: { scorePct: true },
      _max: { scorePct: true },
      _sum: { total: true, correct: true, durationSeconds: true },
    }),
    prisma.cbtAttempt.findMany({
      where,
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        subjectId: true,
        subjectIds: true,
        classLevel: true,
        practiceMode: true,
        topic: true,
        term: true,
        total: true,
        correct: true,
        skipped: true,
        scorePct: true,
        durationSeconds: true,
        isTimed: true,
        completedAt: true,
        createdAt: true,
      },
    }),
  ]);

  const historyRows = rows as HistoryAttemptRow[];
  const subjectIds = [
    ...new Set(
      historyRows.flatMap((row) => {
        const ids = stringArray(row.subjectIds);
        return ids.length ? ids : [row.subjectId];
      }),
    ),
  ];
  const subjects = subjectIds.length
    ? await prisma.cbtSubject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true },
      })
    : [];
  const subjectRows = subjects as SubjectNameRow[];
  const names = new Map(subjectRows.map((subject) => [subject.id, subject.name]));

  return NextResponse.json(
    {
      items: historyRows.map((row) => {
        const ids = stringArray(row.subjectIds);
        const subjectNames = (ids.length ? ids : [row.subjectId]).flatMap((id) => {
          const name = names.get(id);
          return name ? [name] : [];
        });
        return {
          id: row.id,
          classLevel: row.classLevel,
          practiceMode: row.practiceMode,
          topic: row.topic,
          term: row.term,
          subjectNames,
          total: row.total,
          correct: row.correct,
          skipped: row.skipped,
          scorePct: row.scorePct,
          durationSeconds: row.durationSeconds,
          isTimed: row.isTimed,
          completedAt: (row.completedAt ?? row.createdAt).toISOString(),
        };
      }),
      summary: {
        attempts: total,
        averageScorePct: Math.round(summary._avg.scorePct ?? 0),
        bestScorePct: summary._max.scorePct ?? 0,
        questions: summary._sum.total ?? 0,
        correct: summary._sum.correct ?? 0,
        practiceSeconds: summary._sum.durationSeconds ?? 0,
      },
      pagination: { page: safePage, pageSize: PAGE_SIZE, total, pages },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
