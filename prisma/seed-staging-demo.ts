import bcrypt from "bcryptjs";
import {
  EnrolmentOutcome,
  ItEnrollmentStatus,
  SubjectCategory,
  TeacherAssignmentRole,
  UserRole,
} from "@prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getSchool } from "@/lib/school";
import { createSession, setCurrentTerm } from "@/lib/academic-session";
import {
  DEMO_CLASS_ARMS,
  DEMO_CLASS_LEVELS,
  DEMO_EMAIL_DOMAIN,
  DEMO_PARENTS,
  DEMO_ROLE_COUNTS,
  DEMO_STAFF_ACCOUNTS,
  DEMO_STUDENTS,
  DEMO_TEACHERS,
  type DemoRole,
} from "./staging-demo-seed-plan";
import { validateStagingDemoTarget } from "./staging-demo-target";

const CONFIRMATION = "SEED STAGING DEMO";
const SESSION_LABEL = "2026/2027";
const SESSION_STARTS_ON = new Date("2026-09-01T00:00:00.000Z");
const SESSION_ENDS_ON = new Date("2027-07-31T00:00:00.000Z");
const DEMO_SUBJECTS = [
  { name: "English Studies", code: "DEMO-ENG" },
  { name: "Mathematics", code: "DEMO-MTH" },
];

function validateInputs() {
  validateStagingDemoTarget({
    databaseUrl: process.env.DATABASE_URL,
    stagingDatabaseHost: process.env.STAGING_DATABASE_HOST,
    productionDatabaseHost: process.env.PRODUCTION_DATABASE_HOST,
  });

  if (process.env.DEMO_SEED_CONFIRMATION !== CONFIRMATION) {
    throw new Error(`Set DEMO_SEED_CONFIRMATION to the exact text: ${CONFIRMATION}`);
  }

  const password = process.env.DEMO_SEED_PASSWORD?.trim() ?? "";
  if (password.length < 12) {
    throw new Error("DEMO_SEED_PASSWORD is required and must be at least 12 characters.");
  }
  return password;
}

function getRole(value: DemoRole): UserRole {
  return UserRole[value];
}

async function upsertUser(params: {
  schoolId: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
}) {
  return prisma.user.upsert({
    where: { schoolId_email: { schoolId: params.schoolId, email: params.email } },
    update: {
      name: params.name,
      role: params.role,
      passwordHash: params.passwordHash,
      isActive: true,
      isSuspended: false,
      tokenVersion: { increment: 1 },
      mustChangePassword: false,
    },
    create: {
      schoolId: params.schoolId,
      email: params.email,
      name: params.name,
      role: params.role,
      passwordHash: params.passwordHash,
      isActive: true,
      isSuspended: false,
      mustChangePassword: false,
    },
  });
}

async function ensureAcademicSession(schoolId: string) {
  let session = await prisma.academicSession.findFirst({
    where: { schoolId, label: SESSION_LABEL },
    include: { terms: { orderBy: { index: "asc" } } },
  });

  if (!session) {
    session = await createSession({
      schoolId,
      label: SESSION_LABEL,
      startsOn: SESSION_STARTS_ON,
      endsOn: SESSION_ENDS_ON,
      makeCurrent: true,
    });
  }

  const currentTerm = session.terms.find((term) => term.isCurrent) ?? session.terms[0];
  if (!currentTerm) throw new Error(`Academic session ${SESSION_LABEL} has no terms.`);
  await setCurrentTerm(schoolId, currentTerm.id);

  return session;
}

async function main() {
  if (process.argv.includes("--check-target")) {
    const host = validateStagingDemoTarget({
      databaseUrl: process.env.DATABASE_URL,
      stagingDatabaseHost: process.env.STAGING_DATABASE_HOST,
      productionDatabaseHost: process.env.PRODUCTION_DATABASE_HOST,
    });
    console.log(`Staging database target validated (${host}). No database changes made.`);
    return;
  }

  const demoPassword = validateInputs();
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  console.log("\n🌱 Isolated staging demo seed — no real user data\n");

  const school = await getSchool();
  console.log(`School: ${school.name} (${school.slug})`);

  const classMap = new Map<string, { id: string; level: string; arm: string }>();
  for (const level of DEMO_CLASS_LEVELS) {
    for (const arm of DEMO_CLASS_ARMS) {
      const displayName = `${level}${arm}`;
      const classroom = await prisma.schoolClass.upsert({
        where: { schoolId_displayName: { schoolId: school.id, displayName } },
        update: { isActive: true, capacity: 40 },
        create: {
          schoolId: school.id,
          level,
          arm,
          displayName,
          isActive: true,
          capacity: 40,
        },
      });
      classMap.set(displayName, { id: classroom.id, level, arm });
    }
  }

  const session = await ensureAcademicSession(school.id);

  const subjectsByLevel = new Map<string, { id: string; name: string }[]>();
  for (const level of DEMO_CLASS_LEVELS) {
    const subjects = [];
    for (const subjectDefinition of DEMO_SUBJECTS) {
      const subject = await prisma.subject.upsert({
        where: {
          schoolId_level_name: {
            schoolId: school.id,
            level,
            name: subjectDefinition.name,
          },
        },
        update: {
          code: subjectDefinition.code,
          category: SubjectCategory.COMPULSORY,
          isActive: true,
        },
        create: {
          schoolId: school.id,
          level,
          name: subjectDefinition.name,
          code: subjectDefinition.code,
          category: SubjectCategory.COMPULSORY,
          isActive: true,
        },
      });
      subjects.push({ id: subject.id, name: subject.name });
    }
    subjectsByLevel.set(level, subjects);
  }

  const userByEmail = new Map<string, { id: string; role: UserRole }>();
  for (const account of DEMO_STAFF_ACCOUNTS) {
    const user = await upsertUser({
      schoolId: school.id,
      email: account.email,
      name: account.name,
      role: getRole(account.role),
      passwordHash,
    });
    userByEmail.set(account.email, { id: user.id, role: user.role });
  }

  for (const teacher of DEMO_TEACHERS.filter((item) => item.role === "TEACHER")) {
    const user = await upsertUser({
      schoolId: school.id,
      email: teacher.email,
      name: teacher.name,
      role: UserRole.TEACHER,
      passwordHash,
    });
    userByEmail.set(teacher.email, { id: user.id, role: user.role });
  }

  const allClasses = [...classMap.entries()];
  for (const [index, teacher] of DEMO_TEACHERS.entries()) {
    const user = userByEmail.get(teacher.email);
    if (!user) throw new Error(`Missing demo user for ${teacher.email}.`);

    const profile = await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: {
        schoolId: school.id,
        displayName: teacher.name,
        roleLabel: teacher.roleLabel,
        isActive: true,
      },
      create: {
        schoolId: school.id,
        userId: user.id,
        displayName: teacher.name,
        roleLabel: teacher.roleLabel,
        isActive: true,
      },
    });

    const formClass = allClasses[index % allClasses.length]?.[1];
    const subjectClass = allClasses[(index + 1) % allClasses.length]?.[1];
    if (formClass) {
      await prisma.teacherClassAssignment.upsert({
        where: {
          teacherProfileId_classId_role: {
            teacherProfileId: profile.id,
            classId: formClass.id,
            role: TeacherAssignmentRole.FORM_TEACHER,
          },
        },
        update: { isActive: true },
        create: {
          schoolId: school.id,
          teacherProfileId: profile.id,
          classId: formClass.id,
          role: TeacherAssignmentRole.FORM_TEACHER,
          isActive: true,
        },
      });
    }
    if (subjectClass) {
      await prisma.teacherClassAssignment.upsert({
        where: {
          teacherProfileId_classId_role: {
            teacherProfileId: profile.id,
            classId: subjectClass.id,
            role: TeacherAssignmentRole.SUBJECT_TEACHER,
          },
        },
        update: { subjectName: teacher.subject, isActive: true },
        create: {
          schoolId: school.id,
          teacherProfileId: profile.id,
          classId: subjectClass.id,
          role: TeacherAssignmentRole.SUBJECT_TEACHER,
          subjectName: teacher.subject,
          isActive: true,
        },
      });
    }
  }

  const parentProfiles = new Map<string, { id: string; name: string }>();
  for (const parent of DEMO_PARENTS) {
    const user = await upsertUser({
      schoolId: school.id,
      email: parent.email,
      name: parent.name,
      role: UserRole.PARENT,
      passwordHash,
    });
    userByEmail.set(parent.email, { id: user.id, role: user.role });

    const profile = await prisma.parentProfile.upsert({
      where: { userId: user.id },
      update: { schoolId: school.id, displayName: parent.name, phone: null, isActive: true },
      create: { schoolId: school.id, userId: user.id, displayName: parent.name, phone: null },
    });
    parentProfiles.set(parent.email, { id: profile.id, name: parent.name });
  }

  for (const student of DEMO_STUDENTS) {
    const classroom = classMap.get(`${student.classLevel}${student.arm}`);
    if (!classroom) throw new Error(`Missing class for ${student.displayName}.`);

    const user = await upsertUser({
      schoolId: school.id,
      email: student.email,
      name: student.displayName,
      role: UserRole.STUDENT,
      passwordHash,
    });
    userByEmail.set(student.email, { id: user.id, role: user.role });

    const profile = await prisma.studentProfile.upsert({
      where: { schoolId_studentId: { schoolId: school.id, studentId: student.studentId } },
      update: {
        firstName: student.firstName,
        lastName: student.lastName,
        displayName: student.displayName,
        gender: student.gender,
        currentClassId: classroom.id,
        guardianName: student.parentName,
        guardianPhone: null,
        guardianEmail: student.parentEmail,
        isActive: true,
      },
      create: {
        schoolId: school.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        displayName: student.displayName,
        gender: student.gender,
        currentClassId: classroom.id,
        guardianName: student.parentName,
        guardianPhone: null,
        guardianEmail: student.parentEmail,
        isActive: true,
      },
    });

    await prisma.studentProfile.updateMany({
      where: { schoolId: school.id, userId: user.id, id: { not: profile.id } },
      data: { userId: null },
    });
    await prisma.studentProfile.update({
      where: { id: profile.id },
      data: { userId: user.id },
    });

    const subjects = subjectsByLevel.get(student.classLevel) ?? [];
    for (const subject of subjects) {
      await prisma.studentSubject.upsert({
        where: {
          studentProfileId_subjectId: {
            studentProfileId: profile.id,
            subjectId: subject.id,
          },
        },
        update: { schoolId: school.id, isActive: true },
        create: {
          schoolId: school.id,
          studentProfileId: profile.id,
          subjectId: subject.id,
          isActive: true,
        },
      });
    }

    await prisma.studentEnrolment.upsert({
      where: {
        studentProfileId_sessionId: { studentProfileId: profile.id, sessionId: session.id },
      },
      update: {
        schoolId: school.id,
        classId: classroom.id,
        outcome: EnrolmentOutcome.IN_PROGRESS,
      },
      create: {
        schoolId: school.id,
        studentProfileId: profile.id,
        classId: classroom.id,
        sessionId: session.id,
        outcome: EnrolmentOutcome.IN_PROGRESS,
      },
    });

    const parent = parentProfiles.get(student.parentEmail);
    if (!parent) throw new Error(`Missing demo parent for ${student.displayName}.`);
    await prisma.parentStudentLink.upsert({
      where: {
        parentProfileId_studentProfileId: {
          parentProfileId: parent.id,
          studentProfileId: profile.id,
        },
      },
      update: { relationship: "Guardian", isPrimary: true },
      create: {
        parentProfileId: parent.id,
        studentProfileId: profile.id,
        relationship: "Guardian",
        isPrimary: true,
      },
    });
  }

  const itStudent = userByEmail.get(
    DEMO_STAFF_ACCOUNTS.find((account) => account.role === "IT_STUDENT")!.email,
  );
  if (!itStudent) throw new Error("Missing demo IT student account.");

  const itCourse = await prisma.itCourse.upsert({
    where: { slug: "staging-demo-digital-literacy" },
    update: {
      title: "Demo Digital Literacy",
      tagline: "A staging-only sample course",
      description: "Fictional course content for role and page testing in staging.",
      level: "Beginner",
      certification: "Demo completion certificate",
      durationWeeks: 4,
      sortOrder: 999,
      isActive: true,
    },
    create: {
      slug: "staging-demo-digital-literacy",
      title: "Demo Digital Literacy",
      tagline: "A staging-only sample course",
      description: "Fictional course content for role and page testing in staging.",
      level: "Beginner",
      certification: "Demo completion certificate",
      durationWeeks: 4,
      sortOrder: 999,
      isActive: true,
    },
  });

  const moduleTitle = "Demo module: getting started";
  const existingModule = await prisma.itModule.findFirst({
    where: { courseId: itCourse.id, title: moduleTitle },
  });
  if (existingModule) {
    await prisma.itModule.update({
      where: { id: existingModule.id },
      data: {
        summary: "A short fictional module for staging UI testing.",
        content: "This is sample content. No real course material is included.",
        durationMinutes: 20,
        sortOrder: 1,
      },
    });
  } else {
    await prisma.itModule.create({
      data: {
        courseId: itCourse.id,
        title: moduleTitle,
        summary: "A short fictional module for staging UI testing.",
        content: "This is sample content. No real course material is included.",
        durationMinutes: 20,
        sortOrder: 1,
      },
    });
  }

  await prisma.itEnrollment.upsert({
    where: { userId_courseId: { userId: itStudent.id, courseId: itCourse.id } },
    update: { schoolId: school.id, status: ItEnrollmentStatus.ACTIVE },
    create: {
      schoolId: school.id,
      userId: itStudent.id,
      courseId: itCourse.id,
      status: ItEnrollmentStatus.ACTIVE,
    },
  });

  const accounts = await prisma.user.findMany({
    where: {
      schoolId: school.id,
      email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` },
    },
    select: { role: true },
  });
  const actualCounts = accounts.reduce<Record<string, number>>((counts, account) => {
    counts[account.role] = (counts[account.role] ?? 0) + 1;
    return counts;
  }, {});
  for (const [role, expectedCount] of Object.entries(DEMO_ROLE_COUNTS)) {
    if (actualCounts[role] !== expectedCount) {
      throw new Error(
        `Demo seed verification failed for ${role}: expected ${expectedCount}, found ${actualCounts[role] ?? 0}.`,
      );
    }
  }
  if (accounts.length !== 72) {
    throw new Error(
      `Demo seed verification failed: expected 72 accounts, found ${accounts.length}.`,
    );
  }

  console.log("\n✅ Staging demo seed is ready.");
  console.log("   Accounts: 72 total — 1 per staff role, 5 teachers, 50 students, 10 parents.");
  console.log("   Student-parent links: 5 fictional students per parent.");
  console.log(
    "   Student login pattern: student001@demo.example.invalid … student050@demo.example.invalid",
  );
  console.log(
    "   Teacher login pattern: teacher01@demo.example.invalid … teacher05@demo.example.invalid",
  );
  console.log(
    "   Parent login pattern: parent001@demo.example.invalid … parent010@demo.example.invalid",
  );
  console.log("   All demo accounts use the protected DEMO_SEED_PASSWORD secret.");
  console.log("   No real email addresses or payment transactions were seeded.\n");
}

async function run() {
  try {
    await main();
  } catch (error) {
    logger.error("Staging demo seed failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void run();
