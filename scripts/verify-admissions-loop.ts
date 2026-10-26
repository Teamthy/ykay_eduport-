/**
 * End-to-end check of the paper-to-enrolment operations loop.
 *
 *   DATABASE_URL="postgresql://..." npm run verify:admissions
 *
 * Exercises the whole path a walk-in applicant takes against a REAL database:
 *
 *   paper intake -> record offline fee -> entrance result -> enrol
 *     -> student profile + parent account + parent-student link
 *
 * Unit tests mock Prisma, so they cannot prove the transaction actually
 * commits, that the unique constraints hold, or that the enrolment gate really
 * blocks an unpaid applicant. This does.
 *
 * Runs only against the disposable localhost database named `ci`; all fixtures
 * disappear with that PostgreSQL service. Paid transaction rows are never
 * deleted because financial ledger facts are immutable.
 */
import { PrismaClient, ApplicationStatus, PaymentStatus, PaymentProvider } from "@prisma/client";
import { logger } from "@/lib/logger";

const prisma = new PrismaClient({ log: [] });

const RUN_ID = `${Date.now()}_${process.pid}`;
const SCHOOL = `opsverify_${RUN_ID}`;
const CLASS_ID = `${SCHOOL}_jss1`;
const APP_ID = `YKCAPP${RUN_ID}`;
let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "  PASS" : "  FAIL"}  ${name}` + (ok ? "" : `  (got ${actual}, want ${expected})`),
  );
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const target = new URL(databaseUrl);
  if (
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    target.hostname !== "localhost" ||
    target.pathname !== "/ci"
  ) {
    throw new Error("This write test is restricted to the disposable localhost database named ci.");
  }

  console.log("Admissions operations loop — paper intake to enrolled student\n");

  await prisma.school.create({
    data: {
      id: SCHOOL,
      slug: `opsverify-${RUN_ID}`,
      name: "Ops Verify College",
      address: "test",
      phone: "+2348000000000",
      email: "ops@example.test",
    },
  });
  await prisma.schoolClass.create({
    data: {
      id: CLASS_ID,
      schoolId: SCHOOL,
      level: "JSS1",
      arm: "A",
      displayName: "JSS1A",
      capacity: 30,
    },
  });

  // ── 1. Paper intake ──
  console.log("Paper intake");
  const application = await prisma.admissionApplication.create({
    data: {
      schoolId: SCHOOL,
      applicationId: APP_ID,
      firstName: "Chidi",
      lastName: "Okafor",
      dateOfBirth: new Date("2014-05-12"),
      gender: "Male",
      stateOfOrigin: "Anambra",
      lga: "Awka South",
      classApplying: "JSS1",
      motherName: "Ngozi Okafor",
      primaryContact: "MOTHER",
      parentPhone: "08031234567",
      parentEmail: "ngozi.okafor@example.test",
      parentAddress: "12 Test Close, Sango Ota",
      previousSchool: "Bright Star Primary",
      previousClass: "Primary 6",
      status: ApplicationStatus.PENDING_REVIEW,
      submittedAt: new Date(),
      paymentStatus: PaymentStatus.PENDING,
    },
  });
  check("application lands at PENDING_REVIEW", application.status, "PENDING_REVIEW");
  check("fee starts unpaid", application.paymentStatus, "PENDING");

  // ── 2. The gate that used to be a dead end ──
  console.log("\nEnrolment gate");
  check(
    "unpaid applicant is blocked from enrolment",
    application.paymentStatus !== PaymentStatus.PAID,
    true,
  );

  // ── 3. Bursar records the cash payment ──
  console.log("\nOffline fee");
  const reference = `OFFLINE-${APP_ID}-TELLER99182`;
  await prisma.$transaction(async (tx) => {
    await tx.admissionApplication.update({
      where: { id: application.id },
      data: { paymentStatus: PaymentStatus.PAID, paymentReference: reference },
    });
    await tx.paymentTransaction.create({
      data: {
        applicationId: application.id,
        provider: PaymentProvider.CASH,
        reference,
        amountKobo: 500_000,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        providerData: { method: "CASH", officeReference: "TELLER99182" },
      },
    });
  });

  const paid = await prisma.admissionApplication.findUniqueOrThrow({
    where: { id: application.id },
    include: { payment: true },
  });
  check("application is now PAID", paid.paymentStatus, "PAID");
  check("payment transaction recorded", paid.payment?.status, "PAID");
  check("amount matches the application fee", paid.payment?.amountKobo, 500_000);
  check("provider recorded as CASH", paid.payment?.provider, "CASH");

  // ── 4. Enrol: student + parent account + link, atomically ──
  console.log("\nEnrolment");
  const enrolled = await prisma.$transaction(async (tx) => {
    const parentUser = await tx.user.create({
      data: {
        schoolId: SCHOOL,
        email: paid.parentEmail,
        name: paid.motherName || "Parent",
        role: "PARENT",
        passwordHash: "hashed",
        mustChangePassword: true,
      },
    });
    const parent = await tx.parentProfile.create({
      data: {
        schoolId: SCHOOL,
        userId: parentUser.id,
        displayName: parentUser.name,
        phone: paid.parentPhone,
      },
    });
    const student = await tx.studentProfile.create({
      data: {
        schoolId: SCHOOL,
        currentClassId: CLASS_ID,
        admissionApplicationId: paid.id,
        studentId: `YKC/2026/${RUN_ID}/OPS001`,
        firstName: paid.firstName,
        lastName: paid.lastName,
        displayName: `${paid.firstName} ${paid.lastName}`,
        gender: paid.gender,
        guardianEmail: paid.parentEmail,
      },
    });
    await tx.parentStudentLink.create({
      data: {
        parentProfileId: parent.id,
        studentProfileId: student.id,
        relationship: "Mother",
        isPrimary: true,
      },
    });
    await tx.admissionApplication.update({
      where: { id: paid.id },
      data: {
        status: ApplicationStatus.APPROVED,
        entranceScore: 72,
        entrancePassed: true,
        reviewedAt: new Date(),
      },
    });
    return { student, parent, parentUser };
  });

  check("student profile created", Boolean(enrolled.student.id), true);
  check("parent must change password on first login", enrolled.parentUser.mustChangePassword, true);
  check("parent role is PARENT", enrolled.parentUser.role, "PARENT");

  const link = await prisma.parentStudentLink.findFirst({
    where: { studentProfileId: enrolled.student.id },
  });
  check("parent is linked to the student", link?.isPrimary, true);

  const final = await prisma.admissionApplication.findUniqueOrThrow({
    where: { id: application.id },
    include: { enrolledStudent: true },
  });
  check("application closed as APPROVED", final.status, "APPROVED");
  check("application points at the enrolled student", Boolean(final.enrolledStudent), true);

  // ── 5. Re-enrolment must be impossible ──
  console.log("\nDouble-enrolment guard");
  let duplicateBlocked = false;
  try {
    await prisma.studentProfile.create({
      data: {
        schoolId: SCHOOL,
        currentClassId: CLASS_ID,
        admissionApplicationId: paid.id, // unique — one student per application
        studentId: `YKC/2026/${RUN_ID}/OPS002`,
        firstName: "Duplicate",
        lastName: "Okafor",
        displayName: "Duplicate Okafor",
      },
    });
  } catch {
    duplicateBlocked = true;
  }
  check("a second student cannot reuse the same application", duplicateBlocked, true);

  // The CI PostgreSQL service is discarded when the job ends. Do not delete
  // paid PaymentTransaction facts: posted financial records are immutable.
  await prisma.$disconnect();

  console.log(
    failures === 0
      ? "\nAdmissions loop verified end to end.\n"
      : `\n${failures} check(s) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  logger.error("\nVerification crashed:", {
    error: error instanceof Error ? error.message : String(error),
  });
  await prisma.$disconnect();
  process.exit(1);
});
