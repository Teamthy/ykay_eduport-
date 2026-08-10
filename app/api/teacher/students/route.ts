import { TeacherAssignmentRole, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { oneTimeSecret, passwordHash, uniqueStudentNumber } from "@/lib/people";
import { getClientIp } from "@/lib/requests";
import { requireRole } from "@/lib/session";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const enrollSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  otherNames: z.string().trim().max(120).optional(),
  gender: z.string().trim().max(30).optional(),
  classId: z.string().min(1),
  guardianName: z.string().trim().min(2).max(160),
  guardianPhone: z.string().trim().min(7).max(30),
  guardianEmail: z.string().trim().toLowerCase().email().optional(),
});

async function teacherContext() {
  const user = await requireRole([
    UserRole.TEACHER,
    UserRole.HOD,
    UserRole.ADMIN,
    UserRole.DIRECTOR,
  ]);
  if (!user) return null;
  const profile = await prisma.teacherProfile.findFirst({
    where: { schoolId: user.schoolId, userId: user.id, isActive: true },
    include: {
      classAssignments: {
        where: { isActive: true },
        include: {
          classroom: {
            select: {
              id: true,
              displayName: true,
              level: true,
              capacity: true,
              _count: { select: { students: { where: { isActive: true } } } },
            },
          },
        },
      },
    },
  });
  if (!profile) return null;
  return { user, profile };
}

export async function GET(request: NextRequest) {
  const ctx = await teacherContext();
  if (!ctx)
    return NextResponse.json({ error: "Unauthorized or no teacher profile." }, { status: 401 });

  const formClassIds = ctx.profile.classAssignments
    .filter((a) => a.role === TeacherAssignmentRole.FORM_TEACHER)
    .map((a) => a.classroom.id);
  const subjectClassIds = ctx.profile.classAssignments
    .filter((a) => a.role === TeacherAssignmentRole.SUBJECT_TEACHER)
    .map((a) => a.classroom.id);
  const allClassIds = [...new Set([...formClassIds, ...subjectClassIds])];

  const classFilter = request.nextUrl.searchParams.get("classId")?.trim();
  const whereClassIds =
    classFilter && allClassIds.includes(classFilter) ? [classFilter] : allClassIds;

  const students = whereClassIds.length
    ? await prisma.studentProfile.findMany({
        where: {
          schoolId: ctx.user.schoolId,
          isActive: true,
          currentClassId: { in: whereClassIds },
        },
        include: { currentClass: { select: { id: true, displayName: true } } },
        orderBy: [{ currentClass: { displayName: "asc" } }, { displayName: "asc" }],
        take: 500,
      })
    : [];

  // Entrance-passed applicants suggested into form teacher's class levels
  const formLevels = [
    ...new Set(
      ctx.profile.classAssignments
        .filter((a) => a.role === TeacherAssignmentRole.FORM_TEACHER)
        .map((a) => a.classroom.level),
    ),
  ];

  const suggestions =
    formLevels.length > 0
      ? await prisma.admissionApplication.findMany({
          where: {
            schoolId: ctx.user.schoolId,
            paymentStatus: "PAID",
            entrancePassed: true,
            enrolledStudent: null,
            classApplying: { in: formLevels },
            status: { in: ["APPROVED", "PENDING_REVIEW", "WAITLISTED"] },
          },
          select: {
            applicationId: true,
            firstName: true,
            lastName: true,
            classApplying: true,
            preferredArm: true,
            entranceScore: true,
            parentEmail: true,
            parentPhone: true,
            recommendedClassId: true,
          },
          orderBy: { entranceScore: "desc" },
          take: 50,
        })
      : [];

  return NextResponse.json({
    teacher: {
      displayName: ctx.profile.displayName,
      isFormTeacher: formClassIds.length > 0,
      isSubjectTeacher: subjectClassIds.length > 0,
    },
    assignments: ctx.profile.classAssignments.map((a) => ({
      id: a.id,
      role: a.role,
      subjectName: a.subjectName,
      classId: a.classroom.id,
      className: a.classroom.displayName,
      level: a.classroom.level,
      capacity: a.classroom.capacity,
      studentCount: a.classroom._count.students,
    })),
    students: students.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      displayName: s.displayName,
      gender: s.gender,
      classId: s.currentClass.id,
      className: s.currentClass.displayName,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      canManage: formClassIds.includes(s.currentClass.id),
    })),
    suggestions,
  });
}

export async function POST(request: NextRequest) {
  const ctx = await teacherContext();
  if (!ctx)
    return NextResponse.json({ error: "Unauthorized or no teacher profile." }, { status: 401 });

  const formClassIds = new Set(
    ctx.profile.classAssignments
      .filter((a) => a.role === TeacherAssignmentRole.FORM_TEACHER)
      .map((a) => a.classroom.id),
  );
  if (!formClassIds.size) {
    return NextResponse.json(
      {
        error: "Only form (class) teachers can enrol students into a class. Ask an administrator.",
      },
      { status: 403 },
    );
  }

  const key = request.headers.get("idempotency-key")?.trim();
  if (!key || key.length < 16) {
    return NextResponse.json(
      { error: "An Idempotency-Key header (min. 16 chars) is required." },
      { status: 400 },
    );
  }

  let input: z.infer<typeof enrollSchema>;
  try {
    input = enrollSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid student details." }, { status: 400 });
  }

  if (!formClassIds.has(input.classId)) {
    return NextResponse.json(
      { error: "You can only enrol students into your own form class." },
      { status: 403 },
    );
  }

  const existing = await prisma.idempotencyRecord.findUnique({
    where: {
      schoolId_scope_key: { schoolId: ctx.user.schoolId, scope: "TEACHER_STUDENT_ENROLLMENT", key },
    },
  });
  if (existing)
    return NextResponse.json(
      { ...(existing.response as object), idempotentReplay: true },
      { status: existing.statusCode },
    );

  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: input.classId, schoolId: ctx.user.schoolId, isActive: true },
    include: { _count: { select: { students: { where: { isActive: true } } } } },
  });
  if (!schoolClass) return NextResponse.json({ error: "Class not found." }, { status: 404 });
  if (schoolClass.capacity !== null && schoolClass._count.students >= schoolClass.capacity) {
    return NextResponse.json({ error: "This class is already at capacity." }, { status: 409 });
  }

  const number = await uniqueStudentNumber(ctx.user.schoolId);
  const displayName = [input.firstName, input.otherNames, input.lastName].filter(Boolean).join(" ");
  const tempPassword = oneTimeSecret();

  try {
    const result = await prisma.$transaction(async (tx) => {
      let parentId: string | undefined;
      let parentCreated = false;
      if (input.guardianEmail) {
        let parent = await tx.parentProfile.findFirst({
          where: { schoolId: ctx.user.schoolId, user: { email: input.guardianEmail } },
        });
        if (!parent) {
          const pUser = await tx.user.create({
            data: {
              schoolId: ctx.user.schoolId,
              email: input.guardianEmail,
              name: input.guardianName,
              role: "PARENT",
              passwordHash: await passwordHash(tempPassword),
              mustChangePassword: true,
            },
          });
          parent = await tx.parentProfile.create({
            data: {
              schoolId: ctx.user.schoolId,
              userId: pUser.id,
              displayName: input.guardianName,
              phone: input.guardianPhone,
            },
          });
          parentCreated = true;
        }
        parentId = parent.id;
      }

      const student = await tx.studentProfile.create({
        data: {
          schoolId: ctx.user.schoolId,
          currentClassId: schoolClass.id,
          studentId: number,
          firstName: input.firstName,
          lastName: input.lastName,
          otherNames: input.otherNames || null,
          displayName,
          gender: input.gender || null,
          guardianName: input.guardianName,
          guardianPhone: input.guardianPhone,
          guardianEmail: input.guardianEmail || null,
        },
      });

      if (parentId) {
        await tx.parentStudentLink.create({
          data: {
            parentProfileId: parentId,
            studentProfileId: student.id,
            relationship: "Guardian",
            isPrimary: true,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId: ctx.user.schoolId,
          actorUserId: ctx.user.id,
          action: "TEACHER_STUDENT_ENROLLED",
          entityType: "StudentProfile",
          entityId: student.id,
          ipAddress: getClientIp(request),
          metadata: { studentId: number, className: schoolClass.displayName, parentCreated },
        },
      });

      return { student, parentCreated };
    });

    const response = {
      student: {
        id: result.student.id,
        studentId: number,
        displayName,
        className: schoolClass.displayName,
      },
      parentAccount: input.guardianEmail
        ? {
            email: input.guardianEmail,
            temporaryPassword: result.parentCreated ? tempPassword : null,
            mustChangePassword: result.parentCreated,
          }
        : null,
    };

    await prisma.idempotencyRecord.create({
      data: {
        schoolId: ctx.user.schoolId,
        scope: "TEACHER_STUDENT_ENROLLMENT",
        key,
        requestHash: "v1",
        response: {
          student: response.student,
          parentAccount: response.parentAccount
            ? {
                email: response.parentAccount.email,
                temporaryPassword: null,
                mustChangePassword: response.parentAccount.mustChangePassword,
              }
            : null,
        },
        statusCode: 201,
      },
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logger.error("Request failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Enrollment could not be completed. No partial record was saved." },
      { status: 500 },
    );
  }
}
