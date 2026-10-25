import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoleOr503 } from "@/lib/session";

export const dynamic = "force-dynamic";

const VALID_LEVELS = new Set(["jss1", "jss2", "jss3", "ss1", "ss2", "ss3"]);

export async function GET(request: NextRequest) {
  const auth = await requireRoleOr503([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  if (auth instanceof NextResponse) return auth;

  const status = request.nextUrl.searchParams.get("status") ?? "draft";
  const classLevel = (request.nextUrl.searchParams.get("classLevel") ?? "").toLowerCase();
  const cursor = request.nextUrl.searchParams.get("cursor") || undefined;
  if (!["draft", "reviewed"].includes(status)) {
    return NextResponse.json({ error: "Choose draft or reviewed content." }, { status: 400 });
  }
  if (classLevel && !VALID_LEVELS.has(classLevel)) {
    return NextResponse.json({ error: "Choose a class from JSS1 to SS3." }, { status: 400 });
  }

  try {
    const questions = await prisma.cbtQuestion.findMany({
      where: {
        status,
        ...(classLevel ? { subject: { classLevel } } : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: 50,
      select: {
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
      },
    });
    const nextCursor =
      questions.length === 50 ? (questions[questions.length - 1]?.id ?? null) : null;
    return NextResponse.json({ questions, nextCursor });
  } catch {
    return NextResponse.json(
      {
        error:
          "Question review is temporarily unavailable. Check database connectivity and confirm the CBT review migration is applied.",
      },
      { status: 503 },
    );
  }
}
