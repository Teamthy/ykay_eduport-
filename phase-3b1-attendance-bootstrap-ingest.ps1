$ProjectRoot = "C:\Users\USER\Desktop\PROJECTS\ykay_edu\envoys-site"

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-ProjectFile {
    param(
        [string]$RelativePath,
        [string]$Content
    )

    $FullPath = Join-Path $ProjectRoot $RelativePath
    $Dir = Split-Path $FullPath -Parent
    if ($Dir -and -not (Test-Path $Dir)) { New-Item -ItemType Directory -Path $Dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($FullPath, $Content, $Utf8NoBom)
    Write-Host "Updated $RelativePath" -ForegroundColor Green
}

Write-Host "Applying Phase 3B.1 attendance bootstrap files..." -ForegroundColor Cyan

# --- .env.example ---
$content = @'
# PostgreSQL / Neon
# Replace every placeholder before deployment.
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# Core auth / URL
AUTH_SECRET="replace-with-a-32-character-or-longer-secret"
NEXT_PUBLIC_SITE_URL="https://ykaycollege.edu.ng"
EMAIL_FROM="Ykay College <noreply@ykaycollege.edu.ng>"
RESEND_API_KEY="re_replace_me"

# School profile
SCHOOL_SLUG="ykay-college"
SCHOOL_NAME="Ykay College & Leadership Academy"
SCHOOL_ADDRESS="Km 38, Lagos-Abeokuta Expressway, Sango Ota, Ogun State, Nigeria"
SCHOOL_PHONE="+2347015374411"
SCHOOL_EMAIL="info@ykaycollege.com"
SCHOOL_MOTTO="Excellence in Education"

# Initial admin bootstrap
INITIAL_ADMIN_EMAIL="admin@ykaycollege.com"
INITIAL_ADMIN_PASSWORD="replace-with-a-strong-admin-password"
INITIAL_ADMIN_NAME="Ykay College Administrator"

# Optional attendance/bootstrap portal users
# Leave passwords blank to let the bootstrap script generate secure random passwords.
BOOTSTRAP_TEACHER_EMAIL="grace.o@ykaycollege.com"
BOOTSTRAP_TEACHER_PASSWORD=""
BOOTSTRAP_STUDENT_EMAIL="student.demo@ykaycollege.com"
BOOTSTRAP_STUDENT_PASSWORD=""
BOOTSTRAP_PARENT_EMAIL="parent.demo@ykaycollege.com"
BOOTSTRAP_PARENT_PASSWORD=""

# Paystack — use test keys locally and live keys only in Production.
PAYSTACK_PUBLIC_KEY="pk_test_replace_me"
PAYSTACK_SECRET_KEY="sk_test_replace_me"

# Upstash Redis — recommended in Production for rate limiting.
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Private S3-compatible document bucket (AWS S3 / Cloudflare R2).
S3_BUCKET=""
S3_REGION="us-east-1"
S3_ENDPOINT=""
S3_FORCE_PATH_STYLE="false"
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_ADMISSIONS_PREFIX="admissions"
'@
Write-ProjectFile -RelativePath '.env.example' -Content $content

# --- package.json ---
$content = @'
{
  "name": "ykay-college-leadership-academy",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "prisma:generate": "prisma generate",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:migrate:dev": "prisma migrate dev",
    "prebuild": "prisma generate",
    "db:seed-admin": "tsx prisma/seed.ts",
    "db:bootstrap-attendance": "tsx prisma/seed-attendance.ts"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1092.0",
    "@aws-sdk/s3-request-presigner": "^3.1092.0",
    "@prisma/client": "^6.15.0",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-slot": "^1.2.0",
    "@upstash/ratelimit": "^2.0.8",
    "@upstash/redis": "^1.38.0",
    "bcryptjs": "^2.4.3",
    "class-variance-authority": "^0.2.4",
    "clsx": "^2.1.1",
    "framer-motion": "^12.0.0",
    "jose": "^5.10.0",
    "jspdf": "^4.2.1",
    "lenis": "^1.2.3",
    "lucide-react": "^0.469.0",
    "next": "^16.2.10",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "resend": "^4.8.0",
    "tailwind-merge": "^2.6.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.20.0",
    "eslint-config-next": "15.0.0",
    "postcss": "^8.5.0",
    "prisma": "^6.15.0",
    "tailwindcss": "^4.0.0",
    "tsx": "^4.23.1",
    "typescript": "^5.9.3"
  },
  "allowScripts": {
    "@prisma/client@6.15.0": true,
    "prisma@6.15.0": true,
    "@prisma/engines@6.15.0": true,
    "sharp@0.34.5": true,
    "esbuild@0.28.1": true,
    "unrs-resolver@1.12.2": true,
    "core-js@3.49.0": true
  }
}
'@
Write-ProjectFile -RelativePath 'package.json' -Content $content

# --- prisma/seed-attendance.ts ---
$content = @'
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  AlertChannel,
  AlertDeliveryStatus,
  AttendanceCorrectionStatus,
  AttendanceStatus,
  Prisma,
  TeacherAssignmentRole,
  UserRole,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getSchool } from "../lib/school";

type SeedUserConfig = {
  email: string;
  name: string;
  role: UserRole;
  passwordEnv?: string;
};

type SeedUserResult = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  issuedPassword: string | null;
  created: boolean;
};

function env(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

function optionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function generatedPassword(prefix: string) {
  return `${prefix}-${crypto.randomBytes(10).toString("base64url")}`;
}

async function upsertPortalUser(config: SeedUserConfig, schoolId: string): Promise<SeedUserResult> {
  const existing = await prisma.user.findUnique({ where: { email: config.email } });
  const providedPassword = config.passwordEnv ? optionalEnv(config.passwordEnv) : null;
  const shouldSetPassword = Boolean(providedPassword) || !existing;
  const issuedPassword = shouldSetPassword ? providedPassword || generatedPassword(config.role) : null;
  const passwordHash = shouldSetPassword && issuedPassword ? await bcrypt.hash(issuedPassword, 12) : existing?.passwordHash;

  if (!passwordHash) {
    throw new Error(`Unable to determine a password hash for ${config.email}.`);
  }

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          schoolId,
          email: config.email,
          name: config.name,
          role: config.role,
          isActive: true,
          isSuspended: false,
          ...(shouldSetPassword ? { passwordHash } : {}),
        },
      })
    : await prisma.user.create({
        data: {
          schoolId,
          email: config.email,
          name: config.name,
          role: config.role,
          passwordHash,
        },
      });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    issuedPassword,
    created: !existing,
  };
}

function firstWeekdaysOfMonth(targetMonth: Date, count: number) {
  const dates: Date[] = [];
  const cursor = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), 1, 12, 0, 0));

  while (dates.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function attendanceMessage(input: {
  studentName: string;
  status: AttendanceStatus;
  className: string;
  date: string;
  note?: string;
}) {
  const statusLabel = input.status === AttendanceStatus.ABSENT ? "absent" : "late";
  const note = input.note ? ` Teacher note: ${input.note}.` : "";
  return `Attendance Alert: ${input.studentName} was marked ${statusLabel} in ${input.className} on ${input.date}.${note}`;
}

async function main() {
  const school = await getSchool();

  const teacherUser = await upsertPortalUser(
    {
      email: env("BOOTSTRAP_TEACHER_EMAIL", "grace.o@ykaycollege.com"),
      name: "Dr. Grace Okonkwo",
      role: UserRole.TEACHER,
      passwordEnv: "BOOTSTRAP_TEACHER_PASSWORD",
    },
    school.id
  );

  const studentUser = await upsertPortalUser(
    {
      email: env("BOOTSTRAP_STUDENT_EMAIL", "student.demo@ykaycollege.com"),
      name: "Emmanuel Adebayo",
      role: UserRole.STUDENT,
      passwordEnv: "BOOTSTRAP_STUDENT_PASSWORD",
    },
    school.id
  );

  const parentUser = await upsertPortalUser(
    {
      email: env("BOOTSTRAP_PARENT_EMAIL", "parent.demo@ykaycollege.com"),
      name: "Mrs. Chinwe Ogunlade",
      role: UserRole.PARENT,
      passwordEnv: "BOOTSTRAP_PARENT_PASSWORD",
    },
    school.id
  );

  const schoolClass = await prisma.schoolClass.upsert({
    where: { schoolId_displayName: { schoolId: school.id, displayName: "SS2A" } },
    update: {
      level: "SS2",
      arm: "A",
      isActive: true,
      capacity: 40,
    },
    create: {
      schoolId: school.id,
      level: "SS2",
      arm: "A",
      displayName: "SS2A",
      isActive: true,
      capacity: 40,
    },
  });

  const teacherProfile = await prisma.teacherProfile.upsert({
    where: { userId: teacherUser.id },
    update: {
      schoolId: school.id,
      displayName: teacherUser.name,
      phone: "+2348034567890",
      roleLabel: "Form Teacher · Mathematics",
      isActive: true,
    },
    create: {
      schoolId: school.id,
      userId: teacherUser.id,
      displayName: teacherUser.name,
      phone: "+2348034567890",
      roleLabel: "Form Teacher · Mathematics",
      isActive: true,
    },
  });

  const parentProfile = await prisma.parentProfile.upsert({
    where: { userId: parentUser.id },
    update: {
      schoolId: school.id,
      displayName: parentUser.name,
      phone: "+2347015374411",
      isActive: true,
    },
    create: {
      schoolId: school.id,
      userId: parentUser.id,
      displayName: parentUser.name,
      phone: "+2347015374411",
      isActive: true,
    },
  });

  const studentConfigs = [
    {
      studentId: "YKC/2026/001",
      firstName: "Emmanuel",
      lastName: "Adebayo",
      displayName: "Emmanuel Adebayo",
      gender: "Male",
      guardianName: parentProfile.displayName,
      guardianPhone: parentProfile.phone,
      guardianEmail: parentUser.email,
      userId: studentUser.id,
    },
    {
      studentId: "YKC/2026/002",
      firstName: "Fatima",
      lastName: "Yusuf",
      displayName: "Fatima Yusuf",
      gender: "Female",
      guardianName: parentProfile.displayName,
      guardianPhone: parentProfile.phone,
      guardianEmail: parentUser.email,
      userId: null,
    },
    {
      studentId: "YKC/2026/003",
      firstName: "Blessing",
      lastName: "Eze",
      displayName: "Blessing Eze",
      gender: "Female",
      guardianName: "Mr. Emeka Eze",
      guardianPhone: "+2348021234567",
      guardianEmail: "emeka.eze@example.com",
      userId: null,
    },
    {
      studentId: "YKC/2026/004",
      firstName: "Chinedu",
      lastName: "Okoro",
      displayName: "Chinedu Okoro",
      gender: "Male",
      guardianName: "Mrs. Ngozi Okoro",
      guardianPhone: "+2348063344556",
      guardianEmail: "ngozi.okoro@example.com",
      userId: null,
    },
    {
      studentId: "YKC/2026/005",
      firstName: "Aisha",
      lastName: "Ibrahim",
      displayName: "Aisha Ibrahim",
      gender: "Female",
      guardianName: "Mr. Musa Ibrahim",
      guardianPhone: "+2348097788990",
      guardianEmail: "musa.ibrahim@example.com",
      userId: null,
    },
    {
      studentId: "YKC/2026/006",
      firstName: "David",
      lastName: "Okoye",
      displayName: "David Okoye",
      gender: "Male",
      guardianName: "Mrs. Ifeoma Okoye",
      guardianPhone: "+2348072233445",
      guardianEmail: "ifeoma.okoye@example.com",
      userId: null,
    },
  ];

  const studentProfiles = [] as Awaited<ReturnType<typeof prisma.studentProfile.upsert>>[];
  for (const config of studentConfigs) {
    const profile = await prisma.studentProfile.upsert({
      where: { schoolId_studentId: { schoolId: school.id, studentId: config.studentId } },
      update: {
        currentClassId: schoolClass.id,
        firstName: config.firstName,
        lastName: config.lastName,
        displayName: config.displayName,
        gender: config.gender,
        guardianName: config.guardianName,
        guardianPhone: config.guardianPhone,
        guardianEmail: config.guardianEmail,
        userId: config.userId,
        isActive: true,
      },
      create: {
        schoolId: school.id,
        currentClassId: schoolClass.id,
        studentId: config.studentId,
        firstName: config.firstName,
        lastName: config.lastName,
        displayName: config.displayName,
        gender: config.gender,
        guardianName: config.guardianName,
        guardianPhone: config.guardianPhone,
        guardianEmail: config.guardianEmail,
        userId: config.userId,
        isActive: true,
      },
    });
    studentProfiles.push(profile);
  }

  await prisma.parentStudentLink.upsert({
    where: {
      parentProfileId_studentProfileId: {
        parentProfileId: parentProfile.id,
        studentProfileId: studentProfiles[0].id,
      },
    },
    update: { relationship: "Mother", isPrimary: true },
    create: {
      parentProfileId: parentProfile.id,
      studentProfileId: studentProfiles[0].id,
      relationship: "Mother",
      isPrimary: true,
    },
  });

  await prisma.parentStudentLink.upsert({
    where: {
      parentProfileId_studentProfileId: {
        parentProfileId: parentProfile.id,
        studentProfileId: studentProfiles[1].id,
      },
    },
    update: { relationship: "Mother", isPrimary: false },
    create: {
      parentProfileId: parentProfile.id,
      studentProfileId: studentProfiles[1].id,
      relationship: "Mother",
      isPrimary: false,
    },
  });

  await prisma.teacherClassAssignment.upsert({
    where: {
      teacherProfileId_classId_role: {
        teacherProfileId: teacherProfile.id,
        classId: schoolClass.id,
        role: TeacherAssignmentRole.FORM_TEACHER,
      },
    },
    update: { schoolId: school.id, isActive: true, subjectName: null },
    create: {
      schoolId: school.id,
      teacherProfileId: teacherProfile.id,
      classId: schoolClass.id,
      role: TeacherAssignmentRole.FORM_TEACHER,
      isActive: true,
    },
  });

  const subjectAssignment = await prisma.teacherClassAssignment.upsert({
    where: {
      teacherProfileId_classId_role: {
        teacherProfileId: teacherProfile.id,
        classId: schoolClass.id,
        role: TeacherAssignmentRole.SUBJECT_TEACHER,
      },
    },
    update: { schoolId: school.id, isActive: true, subjectName: "Mathematics" },
    create: {
      schoolId: school.id,
      teacherProfileId: teacherProfile.id,
      classId: schoolClass.id,
      role: TeacherAssignmentRole.SUBJECT_TEACHER,
      subjectName: "Mathematics",
      isActive: true,
    },
  });

  const sessionDates = firstWeekdaysOfMonth(new Date(), 5);
  const sessionBlueprints = [
    {
      date: sessionDates[0],
      notes: "Strong start to the month.",
      overrides: new Map<string, { status: AttendanceStatus; note?: string }>([]),
    },
    {
      date: sessionDates[1],
      notes: "Attendance note captured for absence follow-up.",
      overrides: new Map<string, { status: AttendanceStatus; note?: string }>([
        [studentProfiles[0].id, { status: AttendanceStatus.ABSENT, note: "Reported ill at home." }],
      ]),
    },
    {
      date: sessionDates[2],
      notes: "Late arrival recorded during assembly window.",
      overrides: new Map<string, { status: AttendanceStatus; note?: string }>([
        [studentProfiles[1].id, { status: AttendanceStatus.LATE, note: "Traffic delay." }],
      ]),
    },
    {
      date: sessionDates[3],
      notes: "Follow-up day with mixed attendance outcomes.",
      overrides: new Map<string, { status: AttendanceStatus; note?: string }>([
        [studentProfiles[0].id, { status: AttendanceStatus.LATE, note: "Arrived after first bell." }],
        [studentProfiles[3].id, { status: AttendanceStatus.ABSENT, note: "Family travel." }],
      ]),
    },
    {
      date: sessionDates[4],
      notes: "Regular class attendance recorded.",
      overrides: new Map<string, { status: AttendanceStatus; note?: string }>([]),
    },
  ];

  for (const [index, blueprint] of sessionBlueprints.entries()) {
    const session = await prisma.attendanceSession.upsert({
      where: {
        classId_sessionDate_periodKey: {
          classId: schoolClass.id,
          sessionDate: blueprint.date,
          periodKey: "DAILY_REGISTER",
        },
      },
      update: {
        schoolId: school.id,
        teacherProfileId: teacherProfile.id,
        assignmentId: subjectAssignment.id,
        notes: blueprint.notes,
        isLocked: true,
        submittedAt: blueprint.date,
      },
      create: {
        schoolId: school.id,
        classId: schoolClass.id,
        teacherProfileId: teacherProfile.id,
        assignmentId: subjectAssignment.id,
        sessionDate: blueprint.date,
        periodKey: "DAILY_REGISTER",
        notes: blueprint.notes,
        isLocked: true,
        submittedAt: blueprint.date,
      },
    });

    await prisma.attendanceEntry.deleteMany({ where: { sessionId: session.id } });
    await prisma.attendanceEntry.createMany({
      data: studentProfiles.map((student) => {
        const override = blueprint.overrides.get(student.id);
        return {
          sessionId: session.id,
          studentProfileId: student.id,
          status: override?.status || AttendanceStatus.PRESENT,
          note: override?.note || null,
        };
      }),
    });

    await prisma.attendanceAlertJob.deleteMany({ where: { attendanceSessionId: session.id } });

    const affectedStudents = studentProfiles.filter((student) => blueprint.overrides.has(student.id));
    for (const student of affectedStudents) {
      const override = blueprint.overrides.get(student.id);
      if (!override || override.status === AttendanceStatus.PRESENT) continue;

      const isLinkedParentStudent = student.id === studentProfiles[0].id || student.id === studentProfiles[1].id;
      const recipientName = isLinkedParentStudent ? parentProfile.displayName : student.guardianName || student.displayName;
      const recipientPhone = isLinkedParentStudent ? parentProfile.phone : student.guardianPhone;
      const recipientEmail = isLinkedParentStudent ? parentUser.email : student.guardianEmail;
      const messagePreview = attendanceMessage({
        studentName: student.displayName,
        status: override.status,
        className: schoolClass.displayName,
        date: blueprint.date.toISOString().slice(0, 10),
        note: override.note,
      });

      const jobs: Prisma.AttendanceAlertJobCreateManyInput[] = [];

      if (recipientPhone) {
        jobs.push({
          schoolId: school.id,
          attendanceSessionId: session.id,
          studentProfileId: student.id,
          parentProfileId: isLinkedParentStudent ? parentProfile.id : null,
          channel: AlertChannel.SMS,
          status: AlertDeliveryStatus.PENDING,
          recipientName,
          recipientPhone,
          recipientEmail: null,
          messagePreview,
          payload: { seeded: true, sessionIndex: index + 1 },
        });
        jobs.push({
          schoolId: school.id,
          attendanceSessionId: session.id,
          studentProfileId: student.id,
          parentProfileId: isLinkedParentStudent ? parentProfile.id : null,
          channel: AlertChannel.WHATSAPP,
          status: AlertDeliveryStatus.PENDING,
          recipientName,
          recipientPhone,
          recipientEmail: null,
          messagePreview,
          payload: { seeded: true, sessionIndex: index + 1 },
        });
      }

      if (recipientEmail) {
        jobs.push({
          schoolId: school.id,
          attendanceSessionId: session.id,
          studentProfileId: student.id,
          parentProfileId: isLinkedParentStudent ? parentProfile.id : null,
          channel: AlertChannel.EMAIL,
          status: AlertDeliveryStatus.PENDING,
          recipientName,
          recipientPhone: null,
          recipientEmail,
          messagePreview,
          payload: { seeded: true, sessionIndex: index + 1 },
        });
      }

      if (jobs.length) {
        await prisma.attendanceAlertJob.createMany({ data: jobs });
      }
    }

    await prisma.auditLog.create({
      data: {
        schoolId: school.id,
        actorUserId: teacherUser.id,
        action: "SEEDED_ATTENDANCE_SESSION",
        entityType: "AttendanceSession",
        entityId: session.id,
        metadata: {
          sessionIndex: index + 1,
          className: schoolClass.displayName,
          date: blueprint.date.toISOString().slice(0, 10),
        },
      },
    });
  }

  const correctionSession = await prisma.attendanceSession.findFirst({
    where: {
      classId: schoolClass.id,
      sessionDate: sessionDates[1],
      periodKey: "DAILY_REGISTER",
    },
    select: { id: true },
  });

  if (correctionSession) {
    await prisma.attendanceCorrectionRequest.deleteMany({
      where: {
        attendanceSessionId: correctionSession.id,
        requestedByUserId: teacherUser.id,
      },
    });

    await prisma.attendanceCorrectionRequest.create({
      data: {
        schoolId: school.id,
        attendanceSessionId: correctionSession.id,
        teacherProfileId: teacherProfile.id,
        requestedByUserId: teacherUser.id,
        reason: "Need to correct the attendance entry for Emmanuel Adebayo after parent follow-up.",
        status: AttendanceCorrectionStatus.PENDING,
      },
    });
  }

  console.log("\nAttendance bootstrap complete.\n");
  console.table([
    {
      role: "Teacher",
      email: teacherUser.email,
      password: teacherUser.issuedPassword || "unchanged",
      note: teacherUser.created ? "Created" : "Existing user updated",
    },
    {
      role: "Student",
      email: studentUser.email,
      password: studentUser.issuedPassword || "unchanged",
      note: studentUser.created ? "Created" : "Existing user updated",
    },
    {
      role: "Parent",
      email: parentUser.email,
      password: parentUser.issuedPassword || "unchanged",
      note: parentUser.created ? "Created" : "Existing user updated",
    },
  ]);

  console.log(`Class ready: ${schoolClass.displayName}`);
  console.log(`Students seeded: ${studentProfiles.length}`);
  console.log(`Teacher profile: ${teacherProfile.displayName}`);
  console.log(`Parent profile: ${parentProfile.displayName}`);
  console.log("Attendance history, alert queue items, and one pending correction request were seeded.");
  console.log("If a password shows 'unchanged', the existing stored password was preserved.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
'@
Write-ProjectFile -RelativePath 'prisma\seed-attendance.ts' -Content $content

# --- PHASE3B1_BOOTSTRAP_ATTENDANCE_NOTES.md ---
$content = @'
# Phase 3B.1 — Bootstrap Seed for Attendance Portals

## Purpose
This bootstrap seed creates the minimum live data needed for the Phase 3A + 3B attendance experience to work immediately after migration.

It provisions:
- one teacher user
- one student user
- one parent user
- one teacher profile
- one parent profile
- one live class (`SS2A`)
- six student profiles
- teacher/class assignments
- parent/student links
- attendance history sessions for the current month
- queued attendance alert jobs
- one pending attendance correction request for admin review

---

## Files added/updated
- `package.json`
- `.env.example`
- `prisma/seed-attendance.ts`

---

## New npm script
```powershell
npm run db:bootstrap-attendance
```

---

## Optional environment variables
If these are not set, the bootstrap script will:
- use sensible demo emails
- generate secure random passwords for new users
- preserve existing passwords for existing users unless you explicitly provide new ones

Optional env vars:
- `BOOTSTRAP_TEACHER_EMAIL`
- `BOOTSTRAP_TEACHER_PASSWORD`
- `BOOTSTRAP_STUDENT_EMAIL`
- `BOOTSTRAP_STUDENT_PASSWORD`
- `BOOTSTRAP_PARENT_EMAIL`
- `BOOTSTRAP_PARENT_PASSWORD`

---

## Recommended run order
After ingesting the Phase 3B bootstrap files:

```powershell
npx prisma generate
npm run db:bootstrap-attendance
npm run build
```

If you have not yet ingested Phase 3B itself, do that first and run its migration before running this seed.

---

## What you can test after running the seed
### Teacher
- `/teacher/class/attendance`
- `/teacher/class/attendance-history`

### Student
- `/student/attendance`

### Parent
- `/parent/attendance`
- `/parent/dashboard`

### Admin
- `/admin/attendance-corrections`

---

## What the seed prints
It prints a small credential table in the terminal showing:
- Teacher email/password
- Student email/password
- Parent email/password

If a password says `unchanged`, that means an existing user was preserved and no new password was generated.
'@
Write-ProjectFile -RelativePath 'PHASE3B1_BOOTSTRAP_ATTENDANCE_NOTES.md' -Content $content

Write-Host "Phase 3B.1 attendance bootstrap files applied successfully." -ForegroundColor Cyan