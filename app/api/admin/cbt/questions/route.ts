import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertNotImpersonating, requireRoleOr503 } from "@/lib/session";
import { cbtQuestionDraftSchema, haveDistinctOptions } from "@/lib/cbt-question-validation";

export const dynamic = "force-dynamic";

const VALID_LEVELS = new Set(["jss1", "jss2", "jss3", "ss1", "ss2", "ss3"]);
const VALID_STATUSES = new Set(["draft", "reviewed", "archived"]);
const QUESTION_SELECT = {
  id: true,
  topic: true,
  difficulty: true,
  stem: true,
  options: true,
  correctIndex: true,
  explanation: true,
  source: true,
  status: true,
  reviewReference: true,
  reviewNotes: true,
  reviewedAt: true,
  subject: { select: { name: true, slug: true, classLevel: true, department: true } },
} as const;

export async function GET(request: NextRequest) {
  const auth = await requireRoleOr503([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  if (auth instanceof NextResponse) return auth;

  const status = (request.nextUrl.searchParams.get("status") ?? "draft").toLowerCase();
  const classLevel = (request.nextUrl.searchParams.get("classLevel") ?? "").toLowerCase();
  const cursor = request.nextUrl.searchParams.get("cursor") || undefined;
  const search = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json(
      { error: "Choose draft, reviewed or archived content." },
      { status: 400 },
    );
  }
  if (classLevel && !VALID_LEVELS.has(classLevel)) {
    return NextResponse.json({ error: "Choose a class from JSS1 to SS3." }, { status: 400 });
  }
  if (search.length > 120) {
    return NextResponse.json(
      { error: "Search text must be 120 characters or fewer." },
      { status: 400 },
    );
  }

  try {
    const questions = await prisma.cbtQuestion.findMany({
      where: {
        status,
        ...(classLevel ? { subject: { is: { classLevel } } } : {}),
        ...(search
          ? {
              OR: [
                { stem: { contains: search, mode: "insensitive" } },
                { topic: { contains: search, mode: "insensitive" } },
                { subject: { is: { name: { contains: search, mode: "insensitive" } } } },
                { subject: { is: { slug: { contains: search, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: 50,
      select: QUESTION_SELECT,
    });
    const nextCursor =
      questions.length === 50 ? (questions[questions.length - 1]?.id ?? null) : null;
    // Totals make an empty queue diagnosable in the UI instead of looking like a broken page.
    const grouped = (await prisma.cbtQuestion.groupBy({
      by: ["status"],
      _count: { _all: true },
    })) as Array<{ status: string; _count: { _all: number } }>;
    const totals = { draft: 0, reviewed: 0, archived: 0 };
    for (const row of grouped) {
      if (row.status in totals) totals[row.status as keyof typeof totals] = row._count._all;
    }
    return NextResponse.json({ questions, nextCursor, totals });
  } catch {
    return NextResponse.json(
      { error: "Question review is temporarily unavailable. Please retry shortly." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRoleOr503([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  if (auth instanceof NextResponse) return auth;
  const impersonationBlock = assertNotImpersonating(auth);
  if (impersonationBlock) return impersonationBlock;

  const parsed = cbtQuestionDraftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid subject, class, topic, stem, four options, answer and explanation." },
      { status: 400 },
    );
  }
  if (!haveDistinctOptions(parsed.data.options)) {
    return NextResponse.json(
      { error: "The four answer options must be distinct." },
      { status: 400 },
    );
  }

  try {
    const subject = await prisma.cbtSubject.upsert({
      where: { slug: parsed.data.subjectSlug },
      create: {
        slug: parsed.data.subjectSlug,
        name: parsed.data.subjectName,
        classLevel: parsed.data.classLevel,
        department: parsed.data.department || "general",
      },
      update: {},
      select: { id: true, classLevel: true },
    });
    if (subject.classLevel !== parsed.data.classLevel) {
      return NextResponse.json(
        { error: "That subject slug is already assigned to a different class level." },
        { status: 409 },
      );
    }
    const duplicate = await prisma.cbtQuestion.findFirst({
      where: { subjectId: subject.id, stem: parsed.data.stem },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "A question with this stem already exists for the subject." },
        { status: 409 },
      );
    }

    const question = await prisma.cbtQuestion.create({
      data: {
        subjectId: subject.id,
        topic: parsed.data.topic,
        difficulty: parsed.data.difficulty,
        stem: parsed.data.stem,
        options: parsed.data.options,
        correctIndex: parsed.data.correctIndex,
        explanation: parsed.data.explanation,
        source: parsed.data.source,
        status: "draft",
        reviewedByUserId: null,
        reviewedAt: null,
        reviewReference: null,
        reviewNotes: null,
      },
      select: QUESTION_SELECT,
    });
    return NextResponse.json({ question }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "The question could not be added right now. Please retry shortly." },
      { status: 503 },
    );
  }
}
