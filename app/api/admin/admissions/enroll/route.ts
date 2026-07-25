import { NextRequest, NextResponse } from "next/server";
import { ApplicationStatus, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PEOPLE_ADMIN_ROLES, oneTimeSecret, passwordHash, uniqueStudentNumber } from "@/lib/people";
import { getClientIp } from "@/lib/requests";
import { requireRole } from "@/lib/session";
const schema = z.object({
  applicationId: z.string().min(1),
  classId: z.string().min(1),
  entranceScore: z.number().int().min(0).max(100),
  entrancePassed: z.boolean(),
  placementNote: z.string().trim().max(500).optional(),
});
export async function POST(request: NextRequest) {
  const user = await requireRole(PEOPLE_ADMIN_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key || key.length < 16)
    return NextResponse.json(
      { error: "An Idempotency-Key header (min. 16 chars) is required." },
      { status: 400 },
    );
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid placement details." }, { status: 400 });
  }
  const replay = await prisma.idempotencyRecord.findUnique({
    where: { schoolId_scope_key: { schoolId: user.schoolId, scope: "ADMISSION_ENROLLMENT", key } },
  });
  if (replay)
    return NextResponse.json(
      { ...(replay.response as object), idempotentReplay: true },
      { status: replay.statusCode },
    );
  const application = await prisma.admissionApplication.findFirst({
    where: { schoolId: user.schoolId, applicationId: input.applicationId },
    include: { enrolledStudent: true },
  });
  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (application.enrolledStudent)
    return NextResponse.json({
      student: {
        studentId: application.enrolledStudent.studentId,
        displayName: application.enrolledStudent.displayName,
      },
      alreadyEnrolled: true,
    });
  if (application.paymentStatus !== PaymentStatus.PAID)
    return NextResponse.json(
      { error: "Admission payment has not been verified." },
      { status: 409 },
    );
  if (!input.entrancePassed)
    return NextResponse.json(
      { error: "Only applicants who passed the entrance assessment may be enrolled." },
      { status: 409 },
    );
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: input.classId, schoolId: user.schoolId, isActive: true },
    include: { _count: { select: { students: { where: { isActive: true } } } } },
  });
  if (!schoolClass) return NextResponse.json({ error: "Class not found." }, { status: 404 });
  if (schoolClass.level !== application.classApplying)
    return NextResponse.json(
      { error: `Placement must match the applied class level (${application.classApplying}).` },
      { status: 409 },
    );
  if (schoolClass.capacity !== null && schoolClass._count.students >= schoolClass.capacity)
    return NextResponse.json({ error: "This class is at capacity." }, { status: 409 });
  const existingParent = await prisma.user.findUnique({
    where: { email: application.parentEmail },
  });
  const number = await uniqueStudentNumber(user.schoolId);
  const displayName = [application.firstName, application.middleName, application.lastName]
    .filter(Boolean)
    .join(" ");
  const tempPassword = oneTimeSecret();
  try {
    const result = await prisma.$transaction(async (tx) => {
      let parent = existingParent
        ? await tx.parentProfile.findFirst({ where: { userId: existingParent.id } })
        : null;
      let parentCreated = false;
      if (!parent) {
        const parentUser = await tx.user.create({
          data: {
            schoolId: user.schoolId,
            email: application.parentEmail,
            name:
              application.guardianName ||
              application.fatherName ||
              application.motherName ||
              "Parent",
            role: "PARENT",
            passwordHash: await passwordHash(tempPassword),
            mustChangePassword: true,
          },
        });
        parent = await tx.parentProfile.create({
          data: {
            schoolId: user.schoolId,
            userId: parentUser.id,
            displayName: parentUser.name,
            phone: application.parentPhone,
          },
        });
        parentCreated = true;
      }
      const student = await tx.studentProfile.create({
        data: {
          schoolId: user.schoolId,
          currentClassId: schoolClass.id,
          admissionApplicationId: application.id,
          studentId: number,
          firstName: application.firstName,
          lastName: application.lastName,
          otherNames: application.middleName,
          displayName,
          gender: application.gender,
          guardianName: parent.displayName,
          guardianPhone: application.parentPhone,
          guardianEmail: application.parentEmail,
        },
      });
      await tx.parentStudentLink.create({
        data: {
          parentProfileId: parent.id,
          studentProfileId: student.id,
          relationship: application.guardianRelationship || "Guardian",
          isPrimary: true,
        },
      });
      await tx.admissionApplication.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.APPROVED,
          statusNote: input.placementNote || null,
          reviewedAt: new Date(),
          entranceScore: input.entranceScore,
          entrancePassed: true,
          recommendedClassId: schoolClass.id,
          entranceReviewedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId: user.schoolId,
          actorUserId: user.id,
          action: "ADMISSION_ENROLLED",
          entityType: "AdmissionApplication",
          entityId: application.applicationId,
          ipAddress: getClientIp(request),
          metadata: {
            studentId: number,
            className: schoolClass.displayName,
            entranceScore: input.entranceScore,
          },
        },
      });
      return { student, parentCreated };
    });
    const response = {
      student: { studentId: number, displayName, className: schoolClass.displayName },
      parentAccount: {
        email: application.parentEmail,
        temporaryPassword: result.parentCreated ? tempPassword : null,
        mustChangePassword: result.parentCreated,
      },
    };
    await prisma.idempotencyRecord.create({
      data: {
        schoolId: user.schoolId,
        scope: "ADMISSION_ENROLLMENT",
        key,
        requestHash: "v1",
        response: {
          student: response.student,
          parentAccount: {
            email: response.parentAccount.email,
            temporaryPassword: null,
            mustChangePassword: response.parentAccount.mustChangePassword,
          },
        },
        statusCode: 201,
      },
    });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Enrollment could not be completed. No partial record was saved." },
      { status: 500 },
    );
  }
}
