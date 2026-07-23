import { TeacherAssignmentRole, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.COORDINATOR, UserRole.SUPER_ADMIN];

export async function GET() {
  const user = await requireRole(ADMIN_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [classes, teachers] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId: user.schoolId, isActive: true },
      orderBy: { displayName: "asc" },
      include: {
        students: {
          where: { isActive: true },
          orderBy: { displayName: "asc" },
          select: { id: true, studentId: true, displayName: true, gender: true, guardianName: true, guardianPhone: true },
        },
        teacherAssignments: {
          where: { isActive: true, role: TeacherAssignmentRole.FORM_TEACHER },
          include: { teacherProfile: { select: { id: true, displayName: true } } },
        },
      },
    }),
    prisma.teacherProfile.findMany({
      where: { schoolId: user.schoolId, isActive: true },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, roleLabel: true },
    }),
  ]);

  const archivedCount = await prisma.studentProfile.count({
    where: { schoolId: user.schoolId, isActive: false },
  });

  return NextResponse.json({
    archivedCount,
    teachers,
    classes: classes.map((schoolClass) => ({
      id: schoolClass.id,
      displayName: schoolClass.displayName,
      level: schoolClass.level,
      arm: schoolClass.arm,
      capacity: schoolClass.capacity,
      studentCount: schoolClass.students.length,
      formTeacher: schoolClass.teacherAssignments[0]
        ? {
            assignmentId: schoolClass.teacherAssignments[0].id,
            teacherProfileId: schoolClass.teacherAssignments[0].teacherProfile.id,
            displayName: schoolClass.teacherAssignments[0].teacherProfile.displayName,
          }
        : null,
      students: schoolClass.students,
    })),
  });
}

const patchSchema = z.object({
  action: z.enum(["CHANGE_FORM_TEACHER", "ARCHIVE_STUDENT", "RESTORE_STUDENT", "MOVE_STUDENT"]),
  classId: z.string().trim().min(1).optional(),
  teacherProfileId: z.string().trim().min(1).optional(),
  studentProfileId: z.string().trim().min(1).optional(),
  targetClassId: z.string().trim().min(1).optional(),
});

export async function PATCH(request: NextRequest) {
  const user = await requireRole(ADMIN_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: z.infer<typeof patchSchema>;
  try {
    payload = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const audit = async (action: string, entityType: string, entityId: string, metadata?: object) =>
    prisma.auditLog.create({
      data: {
        schoolId: user.schoolId,
        actorUserId: user.id,
        action,
        entityType,
        entityId,
        metadata: metadata as never,
        ipAddress: getClientIp(request),
      },
    });

  if (payload.action === "CHANGE_FORM_TEACHER") {
    if (!payload.classId || !payload.teacherProfileId) {
      return NextResponse.json({ error: "Class and teacher are required." }, { status: 400 });
    }
    const [schoolClass, teacher] = await Promise.all([
      prisma.schoolClass.findFirst({ where: { id: payload.classId, schoolId: user.schoolId } }),
      prisma.teacherProfile.findFirst({ where: { id: payload.teacherProfileId, schoolId: user.schoolId, isActive: true } }),
    ]);
    if (!schoolClass || !teacher) return NextResponse.json({ error: "Class or teacher not found." }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.teacherClassAssignment.updateMany({
        where: { classId: schoolClass.id, role: TeacherAssignmentRole.FORM_TEACHER, isActive: true },
        data: { isActive: false },
      });
      await tx.teacherClassAssignment.upsert({
        where: {
          teacherProfileId_classId_role: {
            teacherProfileId: teacher.id,
            classId: schoolClass.id,
            role: TeacherAssignmentRole.FORM_TEACHER,
          },
        },
        update: { isActive: true, schoolId: user.schoolId },
        create: {
          schoolId: user.schoolId,
          teacherProfileId: teacher.id,
          classId: schoolClass.id,
          role: TeacherAssignmentRole.FORM_TEACHER,
        },
      });
    });
    await audit("FORM_TEACHER_CHANGED", "SchoolClass", schoolClass.id, {
      className: schoolClass.displayName,
      teacherName: teacher.displayName,
    });
    return NextResponse.json({ ok: true, message: `${teacher.displayName} is now the form teacher of ${schoolClass.displayName}.` });
  }

  if (!payload.studentProfileId) {
    return NextResponse.json({ error: "Student is required." }, { status: 400 });
  }
  const student = await prisma.studentProfile.findFirst({
    where: { id: payload.studentProfileId, schoolId: user.schoolId },
  });
  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  if (payload.action === "ARCHIVE_STUDENT") {
    await prisma.studentProfile.update({ where: { id: student.id }, data: { isActive: false } });
    await audit("STUDENT_ARCHIVED", "StudentProfile", student.id, { studentId: student.studentId });
    return NextResponse.json({ ok: true, message: `${student.displayName} archived. Records are preserved and can be restored.` });
  }

  if (payload.action === "RESTORE_STUDENT") {
    await prisma.studentProfile.update({ where: { id: student.id }, data: { isActive: true } });
    await audit("STUDENT_RESTORED", "StudentProfile", student.id, { studentId: student.studentId });
    return NextResponse.json({ ok: true, message: `${student.displayName} restored to ${"active roll"}.` });
  }

  // MOVE_STUDENT
  if (!payload.targetClassId) return NextResponse.json({ error: "Target class is required." }, { status: 400 });
  const targetClass = await prisma.schoolClass.findFirst({
    where: { id: payload.targetClassId, schoolId: user.schoolId, isActive: true },
  });
  if (!targetClass) return NextResponse.json({ error: "Target class not found." }, { status: 404 });

  await prisma.studentProfile.update({ where: { id: student.id }, data: { currentClassId: targetClass.id } });
  await audit("STUDENT_MOVED", "StudentProfile", student.id, {
    studentId: student.studentId,
    toClass: targetClass.displayName,
  });
  return NextResponse.json({ ok: true, message: `${student.displayName} moved to ${targetClass.displayName}.` });
}
