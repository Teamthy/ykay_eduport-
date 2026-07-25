import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherContext } from "@/lib/teacher-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getTeacherContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!ctx.formClassId) {
    return NextResponse.json({ className: null, students: [] });
  }

  const students = await prisma.studentProfile.findMany({ take: 100,
    where: { currentClassId: ctx.formClassId, isActive: true },
    select: {
      id: true,
      studentId: true,
      displayName: true,
    },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json({
    className: ctx.formClassName,
    students: students.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      displayName: s.displayName,
      latestReport: null,
    })),
  });
}
