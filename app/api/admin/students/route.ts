import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { PEOPLE_ADMIN_ROLES, oneTimeSecret, passwordHash, uniqueStudentNumber } from "@/lib/people";
import { requireRole } from "@/lib/session";

const schema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  otherNames: z.string().trim().max(120).optional(),
  gender: z.string().trim().max(30).optional(),
  classId: z.string().min(1),
  guardianName: z.string().trim().min(2).max(160),
  guardianPhone: z.string().trim().min(7).max(30),
  // Empty string (an untouched optional field) must be treated as "not provided".
  // zod's .optional() only handles undefined, so "" would fail .email() and 400.
  guardianEmail: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().toLowerCase().email().optional(),
  ),
});
export async function GET() {
  const user = await requireRole(PEOPLE_ADMIN_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [students, classes] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { schoolId: user.schoolId, isActive: true },
      include: {
        currentClass: { select: { id: true, displayName: true } },
        // Enough to filter and sort by payment status without a second
        // request per row. Only the balance is needed, so this stays cheap.
        feeInvoices: { select: { balanceDue: true } },
      },
      orderBy: { displayName: "asc" },
      // Raised from 200. A 200-row cap silently hid students in a school
      // bigger than that, with nothing on screen to say the list was cut.
      take: 2000,
    }),
    prisma.schoolClass.findMany({
      where: { schoolId: user.schoolId, isActive: true },
      orderBy: { displayName: "asc" },
    }),
  ]);
  return NextResponse.json({
    students: students.map((s) => {
      const outstanding = s.feeInvoices.reduce((sum, i) => sum + (i.balanceDue ?? 0), 0);
      return {
        ...s,
        feeInvoices: undefined,
        className: s.currentClass.displayName,
        classId: s.currentClass.id,
        outstanding,
        // NOT_BILLED is distinct from PAID on purpose: no invoice means
        // nobody has billed them, which is a gap, not a settled account.
        feeStatus: s.feeInvoices.length === 0 ? "NOT_BILLED" : outstanding > 0 ? "OWING" : "PAID",
      };
    }),
    classes,
  });
}
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
    return NextResponse.json({ error: "Invalid student details." }, { status: 400 });
  }
  const existing = await prisma.idempotencyRecord.findUnique({
    where: { schoolId_scope_key: { schoolId: user.schoolId, scope: "STUDENT_ENROLLMENT", key } },
  });
  if (existing)
    return NextResponse.json(
      { ...(existing.response as object), idempotentReplay: true },
      { status: existing.statusCode },
    );
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: input.classId, schoolId: user.schoolId, isActive: true },
    include: { _count: { select: { students: { where: { isActive: true } } } } },
  });
  if (!schoolClass) return NextResponse.json({ error: "Class not found." }, { status: 404 });
  if (schoolClass.capacity !== null && schoolClass._count.students >= schoolClass.capacity)
    return NextResponse.json({ error: "This class is already at capacity." }, { status: 409 });
  const duplicate = await prisma.studentProfile.findFirst({
    where: {
      schoolId: user.schoolId,
      firstName: { equals: input.firstName, mode: "insensitive" },
      lastName: { equals: input.lastName, mode: "insensitive" },
      guardianPhone: input.guardianPhone,
    },
  });
  if (duplicate)
    return NextResponse.json(
      {
        error:
          "A matching active student record already exists. Review the student list before enrolling.",
      },
      { status: 409 },
    );
  const number = await uniqueStudentNumber(user.schoolId);
  const displayName = [input.firstName, input.otherNames, input.lastName].filter(Boolean).join(" ");
  const tempPassword = oneTimeSecret();
  try {
    const result = await prisma.$transaction(async (tx) => {
      let parentId: string | undefined;
      let parentCreated = false;
      if (input.guardianEmail) {
        let parent = await tx.parentProfile.findFirst({
          where: { schoolId: user.schoolId, user: { email: input.guardianEmail } },
        });
        if (!parent) {
          const pUser = await tx.user.create({
            data: {
              schoolId: user.schoolId,
              email: input.guardianEmail,
              name: input.guardianName,
              role: "PARENT",
              passwordHash: await passwordHash(tempPassword),
              mustChangePassword: true,
            },
          });
          parent = await tx.parentProfile.create({
            data: {
              schoolId: user.schoolId,
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
          schoolId: user.schoolId,
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
      if (parentId)
        await tx.parentStudentLink.create({
          data: {
            parentProfileId: parentId,
            studentProfileId: student.id,
            relationship: "Guardian",
            isPrimary: true,
          },
        });
      await tx.auditLog.create({
        data: {
          schoolId: user.schoolId,
          actorUserId: user.id,
          action: "STUDENT_ENROLLED",
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
        schoolId: user.schoolId,
        scope: "STUDENT_ENROLLMENT",
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
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      const prior = await prisma.idempotencyRecord.findUnique({
        where: {
          schoolId_scope_key: { schoolId: user.schoolId, scope: "STUDENT_ENROLLMENT", key },
        },
      });
      if (prior)
        return NextResponse.json(
          { ...(prior.response as object), idempotentReplay: true },
          { status: prior.statusCode },
        );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Enrollment could not be completed. No partial record was saved." },
      { status: 500 },
    );
  }
}
