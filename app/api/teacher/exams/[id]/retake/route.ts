import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getClientIp } from "@/lib/requests";

export const dynamic = "force-dynamic";

async function resolveExamAndTeacher(userId: string, schoolId: string, examId: string) {
  const profile = await prisma.teacherProfile.findFirst({
    where: { userId, schoolId, isActive: true },
    select: { id: true },
  });
  if (!profile) return null;
  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
    select: { id: true, title: true, subjectName: true, classId: true, classroom: { select: { displayName: true } } },
  });
  if (!exam) return null;
  return { profile, exam };
}

/** GET /api/teacher/exams/[id]/retake — exam + its class students + who already has a retake. */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireRole([UserRole.TEACHER, UserRole.HOD, UserRole.ADMIN, UserRole.DIRECTOR]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const ctx = await resolveExamAndTeacher(user.id, user.schoolId, id);
  if (!ctx) return NextResponse.json({ error: "Exam not found." }, { status: 404 });

  const [students, retakes] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { currentClassId: ctx.exam.classId, isActive: true },
      select: { id: true, studentId: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.examRetake.findMany({ where: { examId: ctx.exam.id }, select: { studentProfileId: true, used: true } }),
  ]);

  const retakeMap = new Map(retakes.map((r) => [r.studentProfileId, r.used]));
  return NextResponse.json({
    exam: {
      id: ctx.exam.id,
      title: ctx.exam.title,
      subjectName: ctx.exam.subjectName,
      className: ctx.exam.classroom.displayName,
    },
    students: students.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      displayName: s.displayName,
      hasRetake: retakeMap.has(s.id),
      retakeUsed: retakeMap.get(s.id) === true,
    })),
  });
}

const grantSchema = z.object({
  studentProfileIds: z.array(z.string().min(1)).min(1).max(500),
});

/** POST /api/teacher/exams/[id]/retake — grant a retake to one or many students (idempotent upsert). */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireRole([UserRole.TEACHER, UserRole.HOD, UserRole.ADMIN, UserRole.DIRECTOR]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const ctx = await resolveExamAndTeacher(user.id, user.schoolId, id);
  if (!ctx) return NextResponse.json({ error: "Exam not found." }, { status: 404 });

  let input: z.infer<typeof grantSchema>;
  try {
    input = grantSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Only grant retakes to active students in this exam's class.
  const eligible = await prisma.studentProfile.findMany({
    where: { id: { in: input.studentProfileIds }, currentClassId: ctx.exam.classId, isActive: true },
    select: { id: true },
  });
  const eligibleIds = new Set(eligible.map((s) => s.id));

  let granted = 0;
  for (const sid of input.studentProfileIds) {
    if (!eligibleIds.has(sid)) continue;
    await prisma.examRetake.upsert({
      where: { examId_studentProfileId: { examId: ctx.exam.id, studentProfileId: sid } },
      update: { used: false, grantedByUserId: user.id }, // re-arm a used/expired retake
      create: { examId: ctx.exam.id, studentProfileId: sid, grantedByUserId: user.id },
    });
    granted++;
  }

  await prisma.auditLog.create({
    data: {
      schoolId: user.schoolId,
      actorUserId: user.id,
      action: "EXAM_RETAKE_GRANTED",
      entityType: "Exam",
      entityId: ctx.exam.id,
      ipAddress: getClientIp(request),
      metadata: { examTitle: ctx.exam.title, count: granted } as never,
    },
  });

  return NextResponse.json({ granted, message: `Retake enabled for ${granted} student(s).` });
}
