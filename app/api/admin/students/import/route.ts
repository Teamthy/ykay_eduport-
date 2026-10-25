import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { PEOPLE_ADMIN_ROLES, oneTimeSecret, passwordHash, uniqueStudentNumber } from "@/lib/people";
import { requireRole } from "@/lib/session";
import { logger } from "@/lib/logger";
import {
  planStudentImport,
  studentTemplateCsv,
  type ExistingStudent,
  type ImportClass,
  type ImportSubject,
  type RawStudentRow,
} from "@/lib/student-import";

/**
 * Bulk student onboarding.
 *
 *   GET  → the context an import preview needs (classes, subjects, session)
 *   POST → plan the rows, and optionally commit them
 *
 * ── The contract ───────────────────────────────────────────────────────────
 * The browser parses the sheet and posts rows; this route re-runs the SAME
 * planner on what it receives. A preview is not a promise — the payload that
 * arrives is what gets validated, and nothing is written when `commit` is false.
 *
 * ── What "routes correctly" means here ─────────────────────────────────────
 * A student who is created but not linked up is worse than one who was never
 * imported: they appear on the roster, then fail to appear in their class
 * register, their subject lists, their exams and their parent's portal. So a
 * committed row writes, in one transaction:
 *
 *   StudentProfile           — the roster entry, with the resolved class
 *   StudentSubject           — the level's compulsory subjects plus every
 *                              elective named in the sheet that exists at
 *                              that level
 *   StudentEnrolment         — the student's place in the current session, so
 *                              promotion/broadsheet/attendance reporting see them
 *   ParentProfile + link     — reusing an existing parent with the same email,
 *                              so siblings share one parent account
 *   User (student, optional) — only when the sheet carries a student email;
 *                              inventing one would create accounts nobody owns
 *
 * Re-running the same sheet is safe: a matching name + guardian phone, or a
 * matching admission number, is skipped rather than duplicated.
 */

const MAX_ROWS_PER_REQUEST = 200;

async function loadContext(schoolId: string) {
  const [classes, subjects, students, session] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, displayName: true, level: true },
      orderBy: [{ level: "asc" }, { displayName: "asc" }],
    }),
    prisma.subject.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, name: true, level: true, category: true },
      orderBy: [{ level: "asc" }, { name: "asc" }],
    }),
    prisma.studentProfile.findMany({
      where: { schoolId, isActive: true },
      select: { firstName: true, lastName: true, guardianPhone: true, studentId: true },
      take: 20000,
    }),
    prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true, label: true },
    }),
  ]);

  const importClasses: ImportClass[] = classes;
  const importSubjects: ImportSubject[] = [];
  for (const subject of subjects) {
    importSubjects.push({
      id: subject.id,
      name: subject.name,
      level: subject.level,
      isCompulsory: subject.category === "COMPULSORY",
    });
  }
  const existing: ExistingStudent[] = students;

  return { classes: importClasses, subjects: importSubjects, existing, session };
}

export async function GET() {
  const user = await requireRole(PEOPLE_ADMIN_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const context = await loadContext(user.schoolId);
  return NextResponse.json({
    classes: context.classes,
    subjects: context.subjects,
    currentSession: context.session,
    existingCount: context.existing.length,
    template: studentTemplateCsv(),
    limits: { maxRowsPerRequest: MAX_ROWS_PER_REQUEST },
  });
}

type RowOutcome = {
  line: number;
  name: string;
  className: string;
  status: "created" | "skipped" | "failed";
  detail: string;
  studentNumber?: string;
  subjects?: string;
  studentLogin?: { email: string; temporaryPassword: string } | null;
  parentLogin?: { email: string; temporaryPassword: string } | null;
};

export async function POST(request: NextRequest) {
  const user = await requireRole(PEOPLE_ADMIN_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { rows?: RawStudentRow[]; commit?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) {
    return NextResponse.json({ error: "No rows were sent." }, { status: 400 });
  }
  if (rows.length > MAX_ROWS_PER_REQUEST) {
    return NextResponse.json(
      {
        error: `Send at most ${MAX_ROWS_PER_REQUEST} rows per request — split the sheet into batches. The browser does this automatically.`,
      },
      { status: 413 },
    );
  }

  const context = await loadContext(user.schoolId);

  // The planner is the same code the browser previewed with, re-run on what
  // actually arrived. Values are clamped to strings so a crafted payload cannot
  // smuggle objects into Prisma.
  const safeRows: RawStudentRow[] = rows.map((row, index) => {
    const out: RawStudentRow = { line: Number(row?.line) || index + 2 };
    for (const key of [
      "firstName",
      "lastName",
      "otherNames",
      "gender",
      "className",
      "subjects",
      "studentId",
      "guardianName",
      "guardianPhone",
      "guardianEmail",
      "studentEmail",
    ] as const) {
      const value = (row as Record<string, unknown>)?.[key];
      if (typeof value === "string") out[key] = value;
    }
    return out;
  });

  const plan = planStudentImport(safeRows, {
    classes: context.classes,
    subjects: context.subjects,
    existing: context.existing,
  });

  if (!body.commit) {
    return NextResponse.json({ dryRun: true, plan, currentSession: context.session });
  }

  const outcomes: RowOutcome[] = [];

  for (const planned of plan.rows) {
    const name = planned.student.displayName || "(unnamed)";
    if (planned.errors.length) {
      outcomes.push({
        line: planned.line,
        name,
        className: planned.className ?? "",
        status: "failed",
        detail: planned.errors.join(" "),
      });
      continue;
    }
    if (planned.action === "skip") {
      outcomes.push({
        line: planned.line,
        name,
        className: planned.className ?? "",
        status: "skipped",
        detail: planned.reason ?? "Already on the roster.",
        subjects: planned.subjectNames.join(", "),
      });
      continue;
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Serialise enrolments into one class so two concurrent imports cannot
        // both take the last seat.
        await tx.$queryRaw`SELECT id FROM "SchoolClass" WHERE id = ${planned.classId} AND "schoolId" = ${user.schoolId} AND "isActive" = true FOR UPDATE`;
        const classroom = await tx.schoolClass.findFirst({
          where: { id: planned.classId!, schoolId: user.schoolId, isActive: true },
          include: { _count: { select: { students: { where: { isActive: true } } } } },
        });
        if (!classroom) throw new Error("CLASS_NOT_FOUND");
        if (classroom.capacity !== null && classroom._count.students >= classroom.capacity) {
          throw new Error("CLASS_AT_CAPACITY");
        }

        const admissionNumber = planned.student.studentId
          ? await (async () => {
              const taken = await tx.studentProfile.findUnique({
                where: {
                  schoolId_studentId: {
                    schoolId: user.schoolId,
                    studentId: planned.student.studentId!,
                  },
                },
                select: { id: true },
              });
              if (taken) throw new Error("ADMISSION_NUMBER_TAKEN");
              return planned.student.studentId!;
            })()
          : await uniqueStudentNumber(user.schoolId);

        // 1. Optional student login. Only when the sheet states an address:
        // an invented email is an account nobody knows the owner of.
        let studentUserId: string | null = null;
        let studentPassword: string | null = null;
        if (planned.student.studentEmail) {
          const existingUser = await tx.user.findFirst({
            where: { schoolId: user.schoolId, email: planned.student.studentEmail },
            select: { id: true },
          });
          if (existingUser) throw new Error("STUDENT_EMAIL_TAKEN");
          studentPassword = oneTimeSecret();
          const created = await tx.user.create({
            data: {
              schoolId: user.schoolId,
              email: planned.student.studentEmail,
              name: planned.student.displayName,
              role: UserRole.STUDENT,
              passwordHash: await passwordHash(studentPassword),
              mustChangePassword: true,
            },
          });
          studentUserId = created.id;
        }

        // 2. The roster entry.
        const student = await tx.studentProfile.create({
          data: {
            schoolId: user.schoolId,
            currentClassId: classroom.id,
            userId: studentUserId,
            studentId: admissionNumber,
            firstName: planned.student.firstName,
            lastName: planned.student.lastName,
            otherNames: planned.student.otherNames,
            displayName: planned.student.displayName,
            gender: planned.student.gender,
            guardianName: planned.student.guardianName,
            guardianPhone: planned.student.guardianPhone,
            guardianEmail: planned.student.guardianEmail,
          },
        });

        // 3. Subjects — compulsory plus the electives named in the sheet.
        if (planned.subjectIds.length) {
          await tx.studentSubject.createMany({
            data: planned.subjectIds.map((subjectId) => ({
              schoolId: user.schoolId,
              studentProfileId: student.id,
              subjectId,
            })),
            skipDuplicates: true,
          });
        }

        // 4. The current session, so promotion and reporting see this student.
        if (context.session) {
          await tx.studentEnrolment.upsert({
            where: {
              studentProfileId_sessionId: {
                studentProfileId: student.id,
                sessionId: context.session.id,
              },
            },
            update: { classId: classroom.id },
            create: {
              schoolId: user.schoolId,
              studentProfileId: student.id,
              classId: classroom.id,
              sessionId: context.session.id,
            },
          });
        }

        // 5. Guardian. A parent who already exists for this email is reused, so
        // three siblings in the sheet produce one parent account, not three.
        let parentLogin: { email: string; temporaryPassword: string } | null = null;
        if (planned.student.guardianEmail) {
          const email = planned.student.guardianEmail;
          let parent = await tx.parentProfile.findFirst({
            where: { schoolId: user.schoolId, user: { email } },
            select: { id: true },
          });
          if (!parent) {
            const parentPassword = oneTimeSecret();
            const parentUser = await tx.user.create({
              data: {
                schoolId: user.schoolId,
                email,
                name: planned.student.guardianName || email,
                role: UserRole.PARENT,
                passwordHash: await passwordHash(parentPassword),
                mustChangePassword: true,
              },
            });
            parent = await tx.parentProfile.create({
              data: {
                schoolId: user.schoolId,
                userId: parentUser.id,
                displayName: planned.student.guardianName || email,
                phone: planned.student.guardianPhone,
              },
            });
            parentLogin = { email, temporaryPassword: parentPassword };
          }
          const alreadyLinked = await tx.parentStudentLink.findFirst({
            where: { parentProfileId: parent.id, studentProfileId: student.id },
            select: { id: true },
          });
          if (!alreadyLinked) {
            await tx.parentStudentLink.create({
              data: {
                parentProfileId: parent.id,
                studentProfileId: student.id,
                relationship: "Guardian",
                isPrimary: true,
              },
            });
          }
        }

        await tx.auditLog.create({
          data: {
            schoolId: user.schoolId,
            actorUserId: user.id,
            action: "STUDENT_BULK_IMPORTED",
            entityType: "StudentProfile",
            entityId: student.id,
            ipAddress: getClientIp(request),
            metadata: {
              line: planned.line,
              className: classroom.displayName,
              studentNumber: admissionNumber,
              subjects: planned.subjectIds.length,
              hadStudentLogin: Boolean(studentUserId),
              source: "sheet-import",
            },
          },
        });

        return {
          student,
          admissionNumber,
          studentPassword,
          studentEmail: planned.student.studentEmail,
          parentLogin,
        };
      });

      outcomes.push({
        line: planned.line,
        name: planned.student.displayName,
        className: planned.className ?? "",
        status: "created",
        detail: planned.warnings.join(" ") || "Enrolled with class, subjects and guardian links.",
        studentNumber: result.admissionNumber,
        subjects: planned.subjectNames.join(", "),
        studentLogin:
          result.studentEmail && result.studentPassword
            ? { email: result.studentEmail, temporaryPassword: result.studentPassword }
            : null,
        parentLogin: result.parentLogin,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const readable =
        reason === "CLASS_AT_CAPACITY"
          ? "That class is full. Raise its capacity or move the student."
          : reason === "ADMISSION_NUMBER_TAKEN"
            ? `Admission number ${planned.student.studentId} is already used by another student.`
            : reason === "STUDENT_EMAIL_TAKEN"
              ? `A user with the email ${planned.student.studentEmail} already exists in this school.`
              : reason === "CLASS_NOT_FOUND"
                ? "That class no longer exists. Reload and pick the class again."
                : "Could not save this row.";
      logger.error("student import: row failed", { line: planned.line, reason });
      outcomes.push({
        line: planned.line,
        name,
        className: planned.className ?? "",
        status: "failed",
        detail: readable,
      });
    }
  }

  const created = outcomes.filter((row) => row.status === "created").length;
  const skipped = outcomes.filter((row) => row.status === "skipped").length;
  const failed = outcomes.filter((row) => row.status === "failed").length;

  if (created) {
    await prisma.auditLog.create({
      data: {
        schoolId: user.schoolId,
        actorUserId: user.id,
        action: "STUDENT_BULK_IMPORT_BATCH",
        entityType: "StudentProfile",
        ipAddress: getClientIp(request),
        metadata: {
          created,
          skipped,
          failed,
          rows: safeRows.length,
          session: context.session?.label ?? null,
        },
      },
    });
  }

  return NextResponse.json({
    dryRun: false,
    totals: { rows: safeRows.length, created, skipped, failed },
    rows: outcomes,
    currentSession: context.session,
  });
}
