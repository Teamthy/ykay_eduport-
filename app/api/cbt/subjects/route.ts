import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, requireCbtUser } from "@/lib/cbt-auth";

/** Signed-in: subjects with published question counts, for the /cbt picker (SEC-02). */
export async function GET() {
  const user = await requireCbtUser();
  if (isResponse(user)) return user;

  const subjects = await prisma.cbtSubject.findMany({
    orderBy: [{ classLevel: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      classLevel: true,
      department: true,
      _count: { select: { questions: { where: { status: "published" } } } },
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
