/**
 * Creates a loginable STUDENT account and links it to an existing student profile.
 * Run ONCE:  npx tsx scripts/make-student-login.ts
 * (non-destructive — adds a user + links a profile; does not delete anything)
 */
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const EMAIL = "student1@ykaycollege.com";
const PASSWORD = "Ykay@2026!Secure";

async function main() {
  const school = await prisma.school.findFirst();
  if (!school) throw new Error("No school found — run the seed first (npm run seed).");

  // Pick an active student profile, preferring one without a linked user.
  let student = await prisma.studentProfile.findFirst({
    where: { schoolId: school.id, isActive: true, userId: null },
  });
  if (!student) {
    student = await prisma.studentProfile.findFirst({
      where: { schoolId: school.id, isActive: true },
    });
  }
  if (!student) throw new Error("No active student profile found — run the seed first.");

  const hash = await bcrypt.hash(PASSWORD, 10);

  // Create or update the student user (composite unique on [schoolId, email]).
  const existing = await prisma.user.findUnique({
    where: { schoolId_email: { schoolId: school.id, email: EMAIL } },
  });
  let user;
  if (existing) {
    user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "STUDENT",
        passwordHash: hash,
        name: student.displayName,
        mustChangePassword: false,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        schoolId: school.id,
        email: EMAIL,
        name: student.displayName,
        role: "STUDENT",
        passwordHash: hash,
        mustChangePassword: false,
      },
    });
  }

  // Link the profile to this user.
  await prisma.studentProfile.update({ where: { id: student.id }, data: { userId: user.id } });

  console.log("\n✅ Student login ready:");
  console.log(`   Email:    ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log(`   Linked:   ${student.displayName} (${student.studentId})`);
  console.log("   Log in on the mobile app to reach the Student portal.\n");
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
