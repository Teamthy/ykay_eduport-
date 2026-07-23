$ProjectRoot = "C:\Users\USER\Desktop\PROJECTS\ykay_edu\envoys-site"

function Write-ProjectFile {
    param(
        [string]$RelativePath,
        [string]$Content
    )

    $FullPath = Join-Path $ProjectRoot $RelativePath
    $Dir = Split-Path $FullPath -Parent
    if (-not (Test-Path $Dir)) { New-Item -ItemType Directory -Path $Dir -Force | Out-Null }
    Set-Content -Path $FullPath -Value $Content -Encoding UTF8
    Write-Host "Updated $RelativePath" -ForegroundColor Green
}

Write-Host "Applying Phase 3A Teacher Attendance files..." -ForegroundColor Cyan

# --- prisma/schema.prisma ---
$content = @'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  DIRECTOR
  BURSAR
  COORDINATOR
  HOD
  TEACHER
  PARENT
  STUDENT
}

enum ApplicationStatus {
  DRAFT
  PENDING_REVIEW
  DOCUMENTS_REQUESTED
  APPROVED
  DECLINED
  WAITLISTED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  ABANDONED
}

enum AdmissionDocumentType {
  BIRTH_CERTIFICATE
  PASSPORT_PHOTO
  REPORT_CARD
  TRANSFER_CERTIFICATE
}

enum PaymentProvider {
  PAYSTACK
  BANK_TRANSFER
  CASH
}

enum TeacherAssignmentRole {
  FORM_TEACHER
  SUBJECT_TEACHER
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
}

model School {
  id        String   @id @default(cuid())
  slug      String   @unique
  name      String
  address   String
  phone     String
  email     String?
  motto     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users                   User[]
  applications            AdmissionApplication[]
  auditLogs               AuditLog[]
  classes                 SchoolClass[]
  teacherProfiles         TeacherProfile[]
  studentProfiles         StudentProfile[]
  teacherClassAssignments TeacherClassAssignment[]
  attendanceSessions      AttendanceSession[]
}

model User {
  id           String    @id @default(cuid())
  schoolId     String
  email        String    @unique
  name         String
  role         UserRole
  passwordHash String
  isActive     Boolean   @default(true)
  isSuspended  Boolean   @default(false)
  lastLoginAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  school              School               @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  refreshTokens       RefreshToken[]
  passwordResetTokens PasswordResetToken[]
  auditLogs           AuditLog[]
  teacherProfile      TeacherProfile?

  @@index([schoolId, role])
}

model TeacherProfile {
  id          String   @id @default(cuid())
  schoolId    String
  userId      String   @unique
  displayName String
  phone       String?
  photoUrl    String?
  roleLabel   String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  school             School                  @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  user               User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  classAssignments   TeacherClassAssignment[]
  attendanceSessions AttendanceSession[]

  @@index([schoolId, displayName])
}

model SchoolClass {
  id          String   @id @default(cuid())
  schoolId    String
  level       String
  arm         String
  displayName String
  isActive    Boolean  @default(true)
  capacity    Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  school             School                  @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  students           StudentProfile[]
  teacherAssignments TeacherClassAssignment[]
  attendanceSessions AttendanceSession[]

  @@unique([schoolId, displayName])
  @@index([schoolId, level, arm])
}

model StudentProfile {
  id            String   @id @default(cuid())
  schoolId      String
  currentClassId String
  studentId     String
  firstName     String
  lastName      String
  otherNames    String?
  displayName   String
  gender        String?
  guardianName  String?
  guardianPhone String?
  guardianEmail String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  school            School            @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  currentClass      SchoolClass       @relation(fields: [currentClassId], references: [id], onDelete: Restrict)
  attendanceEntries AttendanceEntry[]

  @@unique([schoolId, studentId])
  @@index([currentClassId, isActive])
  @@index([schoolId, displayName])
}

model TeacherClassAssignment {
  id               String                @id @default(cuid())
  schoolId         String
  teacherProfileId String
  classId          String
  role             TeacherAssignmentRole
  subjectName      String?
  isActive         Boolean               @default(true)
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt

  school             School               @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  teacherProfile     TeacherProfile       @relation(fields: [teacherProfileId], references: [id], onDelete: Cascade)
  classroom          SchoolClass          @relation(fields: [classId], references: [id], onDelete: Cascade)
  attendanceSessions AttendanceSession[]

  @@unique([teacherProfileId, classId, role])
  @@index([schoolId, classId, role])
  @@index([teacherProfileId, isActive])
}

model AttendanceSession {
  id               String   @id @default(cuid())
  schoolId         String
  classId          String
  teacherProfileId String
  assignmentId     String?
  sessionDate      DateTime
  periodKey        String   @default("DAILY_REGISTER")
  notes            String?
  submittedAt      DateTime?
  isLocked         Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  school         School                  @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  classroom      SchoolClass             @relation(fields: [classId], references: [id], onDelete: Cascade)
  teacherProfile TeacherProfile          @relation(fields: [teacherProfileId], references: [id], onDelete: Cascade)
  assignment     TeacherClassAssignment? @relation(fields: [assignmentId], references: [id], onDelete: SetNull)
  entries        AttendanceEntry[]

  @@unique([classId, sessionDate, periodKey])
  @@index([teacherProfileId, sessionDate])
  @@index([schoolId, sessionDate])
}

model AttendanceEntry {
  id               String           @id @default(cuid())
  sessionId        String
  studentProfileId String
  status           AttendanceStatus
  note             String?
  markedAt         DateTime         @default(now())

  session        AttendanceSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  studentProfile StudentProfile    @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)

  @@unique([sessionId, studentProfileId])
  @@index([studentProfileId, markedAt])
}

model AdmissionApplication {
  id                   String            @id @default(cuid())
  applicationId        String            @unique
  schoolId             String
  firstName            String
  middleName           String?
  lastName             String
  dateOfBirth          DateTime
  gender               String
  stateOfOrigin        String
  lga                  String
  religion             String?
  bloodGroup           String?
  genotype             String?
  classApplying        String
  preferredArm         String?
  fatherName           String?
  motherName           String?
  guardianName         String?
  guardianRelationship String?
  primaryContact       String
  parentPhone          String
  whatsappPhone        String?
  parentEmail          String
  parentAddress        String
  occupation           String?
  previousSchool       String
  previousClass        String
  reasonForLeaving     String?
  achievements         String?
  status               ApplicationStatus @default(DRAFT)
  statusNote           String?
  paymentStatus        PaymentStatus     @default(PENDING)
  paymentReference     String?           @unique
  uploadTokenHash      String?
  uploadTokenExpiresAt DateTime?
  submittedAt          DateTime?
  reviewedAt           DateTime?
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt

  school    School               @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  documents AdmissionDocument[]
  payment   PaymentTransaction?

  @@index([schoolId, status, createdAt])
  @@index([schoolId, parentEmail])
}

model AdmissionDocument {
  id            String                @id @default(cuid())
  applicationId String
  type          AdmissionDocumentType
  fileName      String
  contentType   String
  sizeBytes     Int
  storageKey    String                @unique
  uploadedAt    DateTime              @default(now())

  application AdmissionApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@unique([applicationId, type])
  @@index([applicationId])
}

model PaymentTransaction {
  id            String          @id @default(cuid())
  applicationId String          @unique
  reference     String          @unique
  provider      PaymentProvider @default(PAYSTACK)
  amountKobo    Int
  currency      String          @default("NGN")
  status        PaymentStatus   @default(PENDING)
  paidAt        DateTime?
  providerData  Json?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  application AdmissionApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, expiresAt])
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, expiresAt])
}

model AuditLog {
  id          String   @id @default(cuid())
  schoolId    String
  actorUserId String?
  action      String
  entityType  String
  entityId    String?
  metadata    Json?
  ipAddress   String?
  createdAt   DateTime @default(now())

  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  actor  User?  @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([schoolId, entityType, entityId])
  @@index([actorUserId, createdAt])
}
'@
Write-ProjectFile -RelativePath 'prisma\schema.prisma' -Content $content

# --- prisma/migrations/20260723120000_phase_3a_teacher_attendance/migration.sql ---
$content = @'
-- CreateEnum
CREATE TYPE "public"."TeacherAssignmentRole" AS ENUM ('FORM_TEACHER', 'SUBJECT_TEACHER');

-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');

-- CreateTable
CREATE TABLE "public"."TeacherProfile" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phone" TEXT,
    "photoUrl" TEXT,
    "roleLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SchoolClass" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "arm" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentProfile" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "currentClassId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "otherNames" TEXT,
    "displayName" TEXT NOT NULL,
    "gender" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "guardianEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeacherClassAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherProfileId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "role" "public"."TeacherAssignmentRole" NOT NULL,
    "subjectName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherClassAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceSession" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherProfileId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "periodKey" TEXT NOT NULL DEFAULT 'DAILY_REGISTER',
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "status" "public"."AttendanceStatus" NOT NULL,
    "note" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "public"."TeacherProfile"("userId");

-- CreateIndex
CREATE INDEX "TeacherProfile_schoolId_displayName_idx" ON "public"."TeacherProfile"("schoolId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_schoolId_displayName_key" ON "public"."SchoolClass"("schoolId", "displayName");

-- CreateIndex
CREATE INDEX "SchoolClass_schoolId_level_arm_idx" ON "public"."SchoolClass"("schoolId", "level", "arm");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_schoolId_studentId_key" ON "public"."StudentProfile"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "StudentProfile_currentClassId_isActive_idx" ON "public"."StudentProfile"("currentClassId", "isActive");

-- CreateIndex
CREATE INDEX "StudentProfile_schoolId_displayName_idx" ON "public"."StudentProfile"("schoolId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherClassAssignment_teacherProfileId_classId_role_key" ON "public"."TeacherClassAssignment"("teacherProfileId", "classId", "role");

-- CreateIndex
CREATE INDEX "TeacherClassAssignment_schoolId_classId_role_idx" ON "public"."TeacherClassAssignment"("schoolId", "classId", "role");

-- CreateIndex
CREATE INDEX "TeacherClassAssignment_teacherProfileId_isActive_idx" ON "public"."TeacherClassAssignment"("teacherProfileId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_classId_sessionDate_periodKey_key" ON "public"."AttendanceSession"("classId", "sessionDate", "periodKey");

-- CreateIndex
CREATE INDEX "AttendanceSession_teacherProfileId_sessionDate_idx" ON "public"."AttendanceSession"("teacherProfileId", "sessionDate");

-- CreateIndex
CREATE INDEX "AttendanceSession_schoolId_sessionDate_idx" ON "public"."AttendanceSession"("schoolId", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceEntry_sessionId_studentProfileId_key" ON "public"."AttendanceEntry"("sessionId", "studentProfileId");

-- CreateIndex
CREATE INDEX "AttendanceEntry_studentProfileId_markedAt_idx" ON "public"."AttendanceEntry"("studentProfileId", "markedAt");

-- AddForeignKey
ALTER TABLE "public"."TeacherProfile" ADD CONSTRAINT "TeacherProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SchoolClass" ADD CONSTRAINT "SchoolClass_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentProfile" ADD CONSTRAINT "StudentProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentProfile" ADD CONSTRAINT "StudentProfile_currentClassId_fkey" FOREIGN KEY ("currentClassId") REFERENCES "public"."SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeacherClassAssignment" ADD CONSTRAINT "TeacherClassAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeacherClassAssignment" ADD CONSTRAINT "TeacherClassAssignment_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "public"."TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeacherClassAssignment" ADD CONSTRAINT "TeacherClassAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceSession" ADD CONSTRAINT "AttendanceSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceSession" ADD CONSTRAINT "AttendanceSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceSession" ADD CONSTRAINT "AttendanceSession_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "public"."TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceSession" ADD CONSTRAINT "AttendanceSession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."TeacherClassAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
'@
Write-ProjectFile -RelativePath 'prisma\migrations\20260723120000_phase_3a_teacher_attendance\migration.sql' -Content $content

# --- lib/teacher-attendance.ts ---
$content = @'
import { AttendanceStatus, TeacherAssignmentRole, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/lib/session";

export const ATTENDANCE_ALLOWED_ROLES: UserRole[] = [
  UserRole.TEACHER,
  UserRole.HOD,
  UserRole.ADMIN,
  UserRole.DIRECTOR,
];

export type TeacherAttendanceContext = {
  user: SessionUser;
  teacherProfile: {
    id: string;
    displayName: string;
    classAssignments: Array<{
      id: string;
      role: TeacherAssignmentRole;
      subjectName: string | null;
      classroom: {
        id: string;
        displayName: string;
        level: string;
        arm: string;
      };
    }>;
  };
};

export async function getTeacherAttendanceContext(): Promise<TeacherAttendanceContext | null> {
  const user = await requireRole(ATTENDANCE_ALLOWED_ROLES);
  if (!user) return null;

  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: {
      schoolId: user.schoolId,
      userId: user.id,
      isActive: true,
    },
    select: {
      id: true,
      displayName: true,
      classAssignments: {
        where: { isActive: true },
        orderBy: [
          { role: "asc" },
          { classroom: { displayName: "asc" } },
        ],
        select: {
          id: true,
          role: true,
          subjectName: true,
          classroom: {
            select: {
              id: true,
              displayName: true,
              level: true,
              arm: true,
            },
          },
        },
      },
    },
  });

  if (!teacherProfile) return null;
  return { user, teacherProfile };
}

export function normalizeAttendanceDate(input?: string | null) {
  const candidate = input && /^\d{4}-\d{2}-\d{2}$/.test(input) ? input : new Date().toISOString().slice(0, 10);
  return new Date(`${candidate}T12:00:00.000Z`);
}

export function attendanceDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function summarizeStatuses<T extends { status: AttendanceStatus }>(entries: T[]) {
  return entries.reduce(
    (summary, entry) => {
      if (entry.status === AttendanceStatus.PRESENT) summary.present += 1;
      if (entry.status === AttendanceStatus.ABSENT) summary.absent += 1;
      if (entry.status === AttendanceStatus.LATE) summary.late += 1;
      summary.total += 1;
      return summary;
    },
    { present: 0, absent: 0, late: 0, total: 0 }
  );
}
'@
Write-ProjectFile -RelativePath 'lib\teacher-attendance.ts' -Content $content

# --- app/api/teacher/attendance/register/route.ts ---
$content = @'
import { AttendanceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp, jsonNoStore } from "@/lib/requests";
import {
  attendanceDateKey,
  getTeacherAttendanceContext,
  normalizeAttendanceDate,
  summarizeStatuses,
} from "@/lib/teacher-attendance";

export const runtime = "nodejs";

const SAVE_SCHEMA = z.object({
  classId: z.string().trim().min(1),
  sessionDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodKey: z.string().trim().min(1).max(40).default("DAILY_REGISTER"),
  notes: z.string().trim().max(500).optional().nullable(),
  finalize: z.boolean().default(false),
  entries: z
    .array(
      z.object({
        studentProfileId: z.string().trim().min(1),
        status: z.nativeEnum(AttendanceStatus),
        note: z.string().trim().max(280).optional().nullable(),
      })
    )
    .min(1),
});

function buildClassOptions(context: NonNullable<Awaited<ReturnType<typeof getTeacherAttendanceContext>>>) {
  const byClass = new Map<
    string,
    {
      id: string;
      displayName: string;
      level: string;
      arm: string;
      roles: string[];
      subjectNames: string[];
    }
  >();

  for (const assignment of context.teacherProfile.classAssignments) {
    const current = byClass.get(assignment.classroom.id);
    if (current) {
      if (!current.roles.includes(assignment.role)) current.roles.push(assignment.role);
      if (assignment.subjectName && !current.subjectNames.includes(assignment.subjectName)) {
        current.subjectNames.push(assignment.subjectName);
      }
      continue;
    }

    byClass.set(assignment.classroom.id, {
      id: assignment.classroom.id,
      displayName: assignment.classroom.displayName,
      level: assignment.classroom.level,
      arm: assignment.classroom.arm,
      roles: [assignment.role],
      subjectNames: assignment.subjectName ? [assignment.subjectName] : [],
    });
  }

  return [...byClass.values()].sort((left, right) => left.displayName.localeCompare(right.displayName));
}

function selectAssignment(
  context: NonNullable<Awaited<ReturnType<typeof getTeacherAttendanceContext>>>,
  classId?: string | null
) {
  if (classId) {
    return context.teacherProfile.classAssignments.find((assignment) => assignment.classroom.id === classId) || null;
  }

  return (
    context.teacherProfile.classAssignments.find((assignment) => assignment.role === "FORM_TEACHER") ||
    context.teacherProfile.classAssignments[0] ||
    null
  );
}

export async function GET(request: NextRequest) {
  const context = await getTeacherAttendanceContext();
  if (!context) {
    return jsonNoStore({ error: "Teacher attendance access is not available for this account." }, { status: 403 });
  }

  const availableClasses = buildClassOptions(context);
  if (!availableClasses.length) {
    return jsonNoStore({
      teacher: { displayName: context.teacherProfile.displayName },
      availableClasses: [],
      selectedClass: null,
      session: null,
      roster: [],
      summary: { present: 0, absent: 0, late: 0, total: 0 },
    });
  }

  const requestedClassId = request.nextUrl.searchParams.get("classId");
  const selectedAssignment = selectAssignment(context, requestedClassId);
  if (!selectedAssignment) {
    return jsonNoStore({ error: "You are not assigned to the selected class." }, { status: 404 });
  }

  const sessionDate = normalizeAttendanceDate(request.nextUrl.searchParams.get("date"));
  const periodKey = request.nextUrl.searchParams.get("periodKey")?.trim() || "DAILY_REGISTER";

  const [session, roster] = await Promise.all([
    prisma.attendanceSession.findUnique({
      where: {
        classId_sessionDate_periodKey: {
          classId: selectedAssignment.classroom.id,
          sessionDate,
          periodKey,
        },
      },
      select: {
        id: true,
        sessionDate: true,
        periodKey: true,
        notes: true,
        isLocked: true,
        submittedAt: true,
        entries: {
          select: {
            studentProfileId: true,
            status: true,
            note: true,
          },
        },
      },
    }),
    prisma.studentProfile.findMany({
      where: {
        schoolId: context.user.schoolId,
        currentClassId: selectedAssignment.classroom.id,
        isActive: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        studentId: true,
        displayName: true,
        guardianName: true,
        guardianPhone: true,
      },
    }),
  ]);

  const entryMap = new Map(session?.entries.map((entry) => [entry.studentProfileId, entry]) || []);
  const rows = roster.map((student) => {
    const entry = entryMap.get(student.id);
    return {
      studentProfileId: student.id,
      studentId: student.studentId,
      displayName: student.displayName,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      status: entry?.status || AttendanceStatus.PRESENT,
      note: entry?.note || "",
    };
  });

  return jsonNoStore({
    teacher: { displayName: context.teacherProfile.displayName },
    availableClasses,
    selectedClass: {
      id: selectedAssignment.classroom.id,
      displayName: selectedAssignment.classroom.displayName,
      level: selectedAssignment.classroom.level,
      arm: selectedAssignment.classroom.arm,
      role: selectedAssignment.role,
      subjectName: selectedAssignment.subjectName,
    },
    session: session
      ? {
          id: session.id,
          date: attendanceDateKey(session.sessionDate),
          periodKey: session.periodKey,
          notes: session.notes,
          isLocked: session.isLocked,
          submittedAt: session.submittedAt?.toISOString() || null,
        }
      : {
          id: null,
          date: attendanceDateKey(sessionDate),
          periodKey,
          notes: "",
          isLocked: false,
          submittedAt: null,
        },
    roster: rows,
    summary: summarizeStatuses(rows),
  });
}

export async function POST(request: NextRequest) {
  const context = await getTeacherAttendanceContext();
  if (!context) {
    return jsonNoStore({ error: "Teacher attendance access is not available for this account." }, { status: 403 });
  }

  try {
    const payload = SAVE_SCHEMA.parse(await request.json());
    const selectedAssignment = selectAssignment(context, payload.classId);
    if (!selectedAssignment || selectedAssignment.classroom.id !== payload.classId) {
      return jsonNoStore({ error: "You are not assigned to the selected class." }, { status: 404 });
    }

    const sessionDate = normalizeAttendanceDate(payload.sessionDate);
    const validStudents = await prisma.studentProfile.findMany({
      where: {
        schoolId: context.user.schoolId,
        currentClassId: payload.classId,
        isActive: true,
      },
      select: { id: true },
    });

    const validIds = new Set(validStudents.map((student) => student.id));
    if (
      payload.entries.length !== validStudents.length ||
      payload.entries.some((entry) => !validIds.has(entry.studentProfileId))
    ) {
      return jsonNoStore({ error: "Attendance entries do not match the active class roster." }, { status: 422 });
    }

    const duplicateCheck = new Set<string>();
    for (const entry of payload.entries) {
      if (duplicateCheck.has(entry.studentProfileId)) {
        return jsonNoStore({ error: "A student appears more than once in this register." }, { status: 422 });
      }
      duplicateCheck.add(entry.studentProfileId);
    }

    const ipAddress = getClientIp(request);
    const summary = summarizeStatuses(payload.entries);

    const savedSession = await prisma.$transaction(async (tx) => {
      const existingSession = await tx.attendanceSession.findUnique({
        where: {
          classId_sessionDate_periodKey: {
            classId: payload.classId,
            sessionDate,
            periodKey: payload.periodKey,
          },
        },
        select: { id: true, isLocked: true },
      });

      if (existingSession?.isLocked) {
        throw new Error("This attendance register has already been submitted and locked.");
      }

      const session = existingSession
        ? await tx.attendanceSession.update({
            where: { id: existingSession.id },
            data: {
              teacherProfileId: context.teacherProfile.id,
              assignmentId: selectedAssignment.id,
              notes: payload.notes || null,
              isLocked: payload.finalize,
              submittedAt: payload.finalize ? new Date() : null,
            },
            select: { id: true, isLocked: true, submittedAt: true, periodKey: true, sessionDate: true },
          })
        : await tx.attendanceSession.create({
            data: {
              schoolId: context.user.schoolId,
              classId: payload.classId,
              teacherProfileId: context.teacherProfile.id,
              assignmentId: selectedAssignment.id,
              sessionDate,
              periodKey: payload.periodKey,
              notes: payload.notes || null,
              isLocked: payload.finalize,
              submittedAt: payload.finalize ? new Date() : null,
            },
            select: { id: true, isLocked: true, submittedAt: true, periodKey: true, sessionDate: true },
          });

      await tx.attendanceEntry.deleteMany({ where: { sessionId: session.id } });
      await tx.attendanceEntry.createMany({
        data: payload.entries.map((entry) => ({
          sessionId: session.id,
          studentProfileId: entry.studentProfileId,
          status: entry.status,
          note: entry.note?.trim() || null,
        })),
      });

      await tx.auditLog.create({
        data: {
          schoolId: context.user.schoolId,
          actorUserId: context.user.id,
          action: payload.finalize ? "ATTENDANCE_SESSION_SUBMITTED" : "ATTENDANCE_SESSION_SAVED",
          entityType: "AttendanceSession",
          entityId: session.id,
          ipAddress,
          metadata: {
            classId: payload.classId,
            className: selectedAssignment.classroom.displayName,
            sessionDate: attendanceDateKey(sessionDate),
            periodKey: payload.periodKey,
            summary,
          },
        },
      });

      return session;
    });

    return jsonNoStore({
      ok: true,
      session: {
        id: savedSession.id,
        date: attendanceDateKey(savedSession.sessionDate),
        periodKey: savedSession.periodKey,
        isLocked: savedSession.isLocked,
        submittedAt: savedSession.submittedAt?.toISOString() || null,
      },
      summary,
      notificationPreview: {
        absent: summary.absent,
        late: summary.late,
        queuedParentAlerts: summary.absent + summary.late,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save attendance right now.";
    const status = message.includes("locked") ? 409 : 400;
    return jsonNoStore({ error: message }, { status });
  }
}
'@
Write-ProjectFile -RelativePath 'app\api\teacher\attendance\register\route.ts' -Content $content

# --- app/api/teacher/attendance/history/route.ts ---
$content = @'
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonNoStore } from "@/lib/requests";
import { attendanceDateKey, getTeacherAttendanceContext } from "@/lib/teacher-attendance";

function buildClassOptions(context: NonNullable<Awaited<ReturnType<typeof getTeacherAttendanceContext>>>) {
  const byClass = new Map<
    string,
    {
      id: string;
      displayName: string;
      roles: string[];
    }
  >();

  for (const assignment of context.teacherProfile.classAssignments) {
    const current = byClass.get(assignment.classroom.id);
    if (current) {
      if (!current.roles.includes(assignment.role)) current.roles.push(assignment.role);
      continue;
    }

    byClass.set(assignment.classroom.id, {
      id: assignment.classroom.id,
      displayName: assignment.classroom.displayName,
      roles: [assignment.role],
    });
  }

  return [...byClass.values()].sort((left, right) => left.displayName.localeCompare(right.displayName));
}

function monthWindow(monthValue?: string | null) {
  if (monthValue && /^\d{4}-\d{2}$/.test(monthValue)) {
    const [year, month] = monthValue.split("-").map(Number);
    const from = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
    const to = new Date(Date.UTC(year, month, 1, 12, 0, 0));
    return { from, to, month: monthValue };
  }

  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12, 0, 0));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 12, 0, 0));
  return { from, to, month: from.toISOString().slice(0, 7) };
}

export async function GET(request: NextRequest) {
  const context = await getTeacherAttendanceContext();
  if (!context) {
    return jsonNoStore({ error: "Teacher attendance history is not available for this account." }, { status: 403 });
  }

  const availableClasses = buildClassOptions(context);
  if (!availableClasses.length) {
    return jsonNoStore({
      teacher: { displayName: context.teacherProfile.displayName },
      availableClasses: [],
      selectedClassId: null,
      month: monthWindow(null).month,
      records: [],
      totals: { sessions: 0, present: 0, absent: 0, late: 0, attendanceRate: 0 },
    });
  }

  const requestedClassId = request.nextUrl.searchParams.get("classId");
  const selectedAssignment =
    context.teacherProfile.classAssignments.find((assignment) => assignment.classroom.id === requestedClassId) ||
    context.teacherProfile.classAssignments.find((assignment) => assignment.role === "FORM_TEACHER") ||
    context.teacherProfile.classAssignments[0];

  if (!selectedAssignment) {
    return jsonNoStore({ error: "You are not assigned to the selected class." }, { status: 404 });
  }

  const range = monthWindow(request.nextUrl.searchParams.get("month"));
  const sessions = await prisma.attendanceSession.findMany({
    where: {
      schoolId: context.user.schoolId,
      classId: selectedAssignment.classroom.id,
      sessionDate: {
        gte: range.from,
        lt: range.to,
      },
    },
    orderBy: [{ sessionDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      sessionDate: true,
      periodKey: true,
      isLocked: true,
      submittedAt: true,
      entries: {
        select: {
          status: true,
        },
      },
    },
  });

  const records = sessions.map((session) => {
    const present = session.entries.filter((entry) => entry.status === "PRESENT").length;
    const absent = session.entries.filter((entry) => entry.status === "ABSENT").length;
    const late = session.entries.filter((entry) => entry.status === "LATE").length;
    const total = session.entries.length;
    const attendanceRate = total ? Math.round((present / total) * 100) : 0;

    return {
      id: session.id,
      date: attendanceDateKey(session.sessionDate),
      periodKey: session.periodKey,
      isLocked: session.isLocked,
      submittedAt: session.submittedAt?.toISOString() || null,
      present,
      absent,
      late,
      total,
      attendanceRate,
    };
  });

  const totals = records.reduce(
    (summary, record) => {
      summary.sessions += 1;
      summary.present += record.present;
      summary.absent += record.absent;
      summary.late += record.late;
      summary.total += record.total;
      return summary;
    },
    { sessions: 0, present: 0, absent: 0, late: 0, total: 0 }
  );

  return jsonNoStore({
    teacher: { displayName: context.teacherProfile.displayName },
    availableClasses,
    selectedClassId: selectedAssignment.classroom.id,
    month: range.month,
    records,
    totals: {
      sessions: totals.sessions,
      present: totals.present,
      absent: totals.absent,
      late: totals.late,
      attendanceRate: totals.total ? Math.round((totals.present / totals.total) * 100) : 0,
    },
  });
}
'@
Write-ProjectFile -RelativePath 'app\api\teacher\attendance\history\route.ts' -Content $content

# --- app/teacher/attendance/page.tsx ---
$content = @'
import { redirect } from "next/navigation";

export default function TeacherAttendanceRedirectPage() {
  redirect("/teacher/class/attendance");
}
'@
Write-ProjectFile -RelativePath 'app\teacher\attendance\page.tsx' -Content $content

# --- app/teacher/class/attendance/page.tsx ---
$content = @'
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import { useToast } from "@/components/Toast";
import {
  BellRing,
  Calendar,
  Check,
  Clock,
  FileWarning,
  LoaderCircle,
  Lock,
  Save,
  Send,
  UserCheck,
  X,
} from "lucide-react";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

type RegisterResponse = {
  teacher: { displayName: string };
  availableClasses: Array<{
    id: string;
    displayName: string;
    level: string;
    arm: string;
    roles: string[];
    subjectNames: string[];
  }>;
  selectedClass: {
    id: string;
    displayName: string;
    level: string;
    arm: string;
    role: string;
    subjectName: string | null;
  } | null;
  session: {
    id: string | null;
    date: string;
    periodKey: string;
    notes: string | null;
    isLocked: boolean;
    submittedAt: string | null;
  } | null;
  roster: AttendanceRow[];
  summary: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
};

type AttendanceRow = {
  studentProfileId: string;
  studentId: string;
  displayName: string;
  guardianName: string | null;
  guardianPhone: string | null;
  status: AttendanceStatus;
  note: string;
};

const STATUS_BUTTONS: Array<{ label: string; value: AttendanceStatus; accent: string }> = [
  { label: "P", value: "PRESENT", accent: "bg-brand-green text-white" },
  { label: "A", value: "ABSENT", accent: "bg-red-500 text-white" },
  { label: "L", value: "LATE", accent: "bg-brand-orange text-white" },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function summarize(rows: AttendanceRow[]) {
  return rows.reduce(
    (summary, row) => {
      if (row.status === "PRESENT") summary.present += 1;
      if (row.status === "ABSENT") summary.absent += 1;
      if (row.status === "LATE") summary.late += 1;
      summary.total += 1;
      return summary;
    },
    { present: 0, absent: 0, late: 0, total: 0 }
  );
}

export default function ClassAttendancePage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [selectedClassId, setSelectedClassId] = useState(() => searchParams.get("classId") || "");
  const [selectedDate, setSelectedDate] = useState(() => searchParams.get("date") || todayKey());
  const [register, setRegister] = useState<RegisterResponse | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState<null | "draft" | "submit">(null);
  const [error, setError] = useState("");

  const stats = useMemo(() => summarize(rows), [rows]);
  const isLocked = Boolean(register?.session?.isLocked);
  const notificationPreview = stats.absent + stats.late;

  useEffect(() => {
    let active = true;

    async function loadRegister() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ date: selectedDate });
        if (selectedClassId) params.set("classId", selectedClassId);
        const response = await fetch(`/api/teacher/attendance/register?${params.toString()}`, {
          cache: "no-store",
        });
        const body = (await response.json()) as RegisterResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load the attendance register.");
        if (!active) return;

        setRegister(body);
        setRows(body.roster);
        setNotes(body.session?.notes || "");

        if (!selectedClassId && body.selectedClass?.id) {
          setSelectedClassId(body.selectedClass.id);
        }
      } catch (loadError) {
        if (!active) return;
        setRegister(null);
        setRows([]);
        setError(loadError instanceof Error ? loadError.message : "Unable to load the attendance register.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadRegister();
    return () => {
      active = false;
    };
  }, [selectedClassId, selectedDate]);

  function updateStatus(studentProfileId: string, status: AttendanceStatus) {
    if (isLocked || savingMode) return;
    setRows((current) =>
      current.map((row) =>
        row.studentProfileId === studentProfileId
          ? {
              ...row,
              status,
              note: status === "PRESENT" ? "" : row.note,
            }
          : row
      )
    );
  }

  function updateNote(studentProfileId: string, note: string) {
    if (isLocked || savingMode) return;
    setRows((current) =>
      current.map((row) => (row.studentProfileId === studentProfileId ? { ...row, note } : row))
    );
  }

  function markAllPresent() {
    if (isLocked || savingMode) return;
    setRows((current) => current.map((row) => ({ ...row, status: "PRESENT", note: "" })));
    toast("All active students marked present.", "success");
  }

  async function saveRegister(finalize: boolean) {
    if (!register?.selectedClass) return;

    setSavingMode(finalize ? "submit" : "draft");
    setError("");
    try {
      const response = await fetch("/api/teacher/attendance/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: register.selectedClass.id,
          sessionDate: selectedDate,
          periodKey: register.session?.periodKey || "DAILY_REGISTER",
          notes,
          finalize,
          entries: rows.map((row) => ({
            studentProfileId: row.studentProfileId,
            status: row.status,
            note: row.note || null,
          })),
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        session?: RegisterResponse["session"];
        notificationPreview?: { absent: number; late: number; queuedParentAlerts: number };
      };
      if (!response.ok) throw new Error(body.error || "Unable to save attendance.");

      setRegister((current) =>
        current
          ? {
              ...current,
              session: body.session || current.session,
            }
          : current
      );

      if (finalize) {
        toast(
          body.notificationPreview?.queuedParentAlerts
            ? `Attendance submitted. ${body.notificationPreview.queuedParentAlerts} parent alert(s) prepared for delivery.`
            : "Attendance submitted and locked successfully.",
          "success"
        );
      } else {
        toast("Attendance draft saved successfully.", "success");
      }

      const params = new URLSearchParams({
        classId: register.selectedClass.id,
        date: selectedDate,
      });
      const refreshed = await fetch(`/api/teacher/attendance/register?${params.toString()}`, { cache: "no-store" });
      const refreshedBody = (await refreshed.json()) as RegisterResponse & { error?: string };
      if (refreshed.ok) {
        setRegister(refreshedBody);
        setRows(refreshedBody.roster);
        setNotes(refreshedBody.session?.notes || "");
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save attendance.");
      toast("Attendance could not be saved.", "error");
    } finally {
      setSavingMode(null);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pb-10 pt-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/40 bg-brand-orange/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-orange">
                <Calendar size={11} /> Teacher attendance workflow
              </span>
              {register?.selectedClass ? (
                <span className="text-xs text-white/45">{register.selectedClass.displayName}</span>
              ) : null}
            </div>
            <h1 className="font-display text-4xl tracking-widest text-white md:text-5xl">
              ATTENDANCE <span className="text-brand-orange">REGISTER</span>
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-white/65">
              Live class attendance register backed by the database. Save progress while marking or submit to lock the day&apos;s register.
            </p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Assigned class
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(event) => setSelectedClassId(event.target.value)}
                    className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--input-text)] outline-none focus:border-[var(--input-border-focus)]"
                    disabled={loading || !(register?.availableClasses.length)}
                  >
                    {!register?.availableClasses.length ? <option value="">No class assignment found</option> : null}
                    {register?.availableClasses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.displayName}
                        {item.roles.includes("FORM_TEACHER") ? " · Form teacher" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Session date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--input-text)] outline-none focus:border-[var(--input-border-focus)]"
                    disabled={loading}
                  />
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Register state</div>
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-widest ${
                      isLocked ? "bg-brand-green/15 text-brand-green" : "bg-brand-orange/15 text-brand-orange"
                    }`}
                  >
                    <Lock size={12} /> {isLocked ? "Locked" : "Editable"}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-10 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading attendance register...
                  </div>
                </div>
              ) : null}

              {!loading && error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-500">
                  {error}
                </div>
              ) : null}

              {!loading && register && !register.availableClasses.length ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <div className="flex items-start gap-3">
                    <FileWarning className="mt-0.5 text-brand-orange" size={20} />
                    <div>
                      <h2 className="font-display text-2xl text-[var(--text-primary)]">No class assignment found</h2>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        This teacher account does not yet have an active class assignment in the database. Create a teacher profile and class assignment before using the attendance register.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {!loading && register?.availableClasses.length ? (
                <>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[
                      { label: "Present", value: stats.present, icon: UserCheck, color: "text-brand-green", bg: "bg-brand-green/10" },
                      { label: "Absent", value: stats.absent, icon: X, color: "text-red-500", bg: "bg-red-500/10" },
                      { label: "Late", value: stats.late, icon: Clock, color: "text-brand-orange", bg: "bg-brand-orange/10" },
                      {
                        label: "Attendance rate",
                        value: stats.total ? `${Math.round((stats.present / stats.total) * 100)}%` : "0%",
                        icon: Calendar,
                        color: "text-brand-green",
                        bg: "bg-brand-green/10",
                      },
                    ].map((card) => (
                      <div key={card.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
                        <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>
                          <card.icon size={18} />
                        </div>
                        <div className={`font-display text-3xl ${card.color}`}>{card.value}</div>
                        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{card.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={markAllPresent}
                      disabled={isLocked || Boolean(savingMode)}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-green/10 px-4 py-2.5 text-sm font-bold text-brand-green transition-all hover:bg-brand-green hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check size={14} /> Mark all present
                    </button>
                    <span className="text-xs text-[var(--text-muted)]">
                      {stats.total} active student{stats.total === 1 ? "" : "s"} in the selected class
                    </span>
                    {register.session?.submittedAt ? (
                      <span className="text-xs text-brand-green">
                        Submitted: {new Date(register.session.submittedAt).toLocaleString()}
                      </span>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--card-shadow)]">
                    <div className="border-b border-[var(--border-subtle)] px-6 py-4">
                      <h2 className="font-display text-xl text-[var(--text-primary)]">
                        {register.selectedClass?.displayName} · Daily register
                      </h2>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Period key: {register.session?.periodKey || "DAILY_REGISTER"}
                      </p>
                    </div>

                    <div className="divide-y divide-[var(--border-subtle)]">
                      {rows.map((row) => (
                        <div key={row.studentProfileId} className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-[var(--text-primary)]">{row.displayName}</div>
                            <div className="text-[11px] text-[var(--text-muted)]">{row.studentId}</div>
                            {row.guardianPhone ? (
                              <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                                Guardian: {row.guardianName || "Linked parent"} · {row.guardianPhone}
                              </div>
                            ) : null}
                          </div>

                          {(row.status === "ABSENT" || row.status === "LATE") && !isLocked ? (
                            <input
                              value={row.note}
                              onChange={(event) => updateNote(row.studentProfileId, event.target.value)}
                              placeholder={row.status === "ABSENT" ? "Optional absence note" : "Optional late note"}
                              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--input-text)] outline-none focus:border-[var(--input-border-focus)] lg:w-72"
                              disabled={Boolean(savingMode)}
                            />
                          ) : row.note ? (
                            <div className="w-full rounded-xl bg-[var(--surface-disabled)] px-4 py-2.5 text-sm text-[var(--text-secondary)] lg:w-72">
                              {row.note}
                            </div>
                          ) : null}

                          <div className="flex gap-2">
                            {STATUS_BUTTONS.map((button) => {
                              const active = row.status === button.value;
                              return (
                                <button
                                  key={button.value}
                                  onClick={() => updateStatus(row.studentProfileId, button.value)}
                                  disabled={isLocked || Boolean(savingMode)}
                                  className={`h-11 w-11 rounded-xl text-xs font-bold transition-all ${
                                    active
                                      ? button.accent
                                      : "bg-[var(--surface-disabled)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]"
                                  } disabled:cursor-not-allowed disabled:opacity-50`}
                                  title={button.value}
                                >
                                  {button.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-disabled)] px-6 py-4">
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Register note
                      </label>
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Optional note for this attendance session"
                        className="min-h-24 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--input-text)] outline-none focus:border-[var(--input-border-focus)]"
                        disabled={isLocked || Boolean(savingMode)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 p-4 text-sm text-[var(--text-secondary)]">
                      <div className="flex items-start gap-3">
                        <BellRing className="mt-0.5 shrink-0 text-brand-green" size={18} />
                        <p>
                          When submitted, this session becomes locked. Parent alerts can be queued for
                          <strong className="text-brand-green"> {notificationPreview}</strong> absent/late case(s).
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() => void saveRegister(false)}
                        disabled={isLocked || Boolean(savingMode) || !rows.length}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-default)] px-6 py-3 text-sm font-bold uppercase tracking-widest text-[var(--text-primary)] transition-all hover:bg-[var(--surface-disabled)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingMode === "draft" ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
                        Save draft
                      </button>
                      <button
                        onClick={() => void saveRegister(true)}
                        disabled={isLocked || Boolean(savingMode) || !rows.length}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green px-6 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingMode === "submit" ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
                        Submit & lock
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
'@
Write-ProjectFile -RelativePath 'app\teacher\class\attendance\page.tsx' -Content $content

# --- app/teacher/class/attendance-history/page.tsx ---
$content = @'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TeacherSidebar from "@/components/TeacherSidebar";
import {
  BarChart3,
  Calendar,
  Check,
  Clock,
  FileWarning,
  LoaderCircle,
  X,
} from "lucide-react";

type HistoryResponse = {
  teacher: { displayName: string };
  availableClasses: Array<{
    id: string;
    displayName: string;
    roles: string[];
  }>;
  selectedClassId: string | null;
  month: string;
  records: Array<{
    id: string;
    date: string;
    periodKey: string;
    isLocked: boolean;
    submittedAt: string | null;
    present: number;
    absent: number;
    late: number;
    total: number;
    attendanceRate: number;
  }>;
  totals: {
    sessions: number;
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
  };
};

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export default function AttendanceHistoryPage() {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ month: selectedMonth });
        if (selectedClassId) params.set("classId", selectedClassId);
        const response = await fetch(`/api/teacher/attendance/history?${params.toString()}`, {
          cache: "no-store",
        });
        const body = (await response.json()) as HistoryResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load attendance history.");
        if (!active) return;
        setHistory(body);
        if (!selectedClassId && body.selectedClassId) setSelectedClassId(body.selectedClassId);
      } catch (historyError) {
        if (!active) return;
        setHistory(null);
        setError(historyError instanceof Error ? historyError.message : "Unable to load attendance history.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHistory();
    return () => {
      active = false;
    };
  }, [selectedClassId, selectedMonth]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pb-10 pt-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-orange/40 bg-brand-orange/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-orange">
              <BarChart3 size={11} /> Teacher attendance history
            </div>
            <h1 className="font-display text-4xl tracking-widest text-white md:text-5xl">
              ATTENDANCE <span className="text-brand-orange">HISTORY</span>
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-white/65">
              Review submitted attendance sessions by class and month, including present, absent, late, and attendance-rate summaries.
            </p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_240px]">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Assigned class
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(event) => setSelectedClassId(event.target.value)}
                    className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--input-text)] outline-none focus:border-[var(--input-border-focus)]"
                    disabled={loading || !(history?.availableClasses.length)}
                  >
                    {!history?.availableClasses.length ? <option value="">No class assignment found</option> : null}
                    {history?.availableClasses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Month
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--input-text)] outline-none focus:border-[var(--input-border-focus)]"
                    disabled={loading}
                  />
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-10 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading attendance history...
                  </div>
                </div>
              ) : null}

              {!loading && error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-500">
                  {error}
                </div>
              ) : null}

              {!loading && history && !history.availableClasses.length ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <div className="flex items-start gap-3">
                    <FileWarning className="mt-0.5 text-brand-orange" size={20} />
                    <div>
                      <h2 className="font-display text-2xl text-[var(--text-primary)]">No attendance classes assigned</h2>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        Attendance history will appear here when this teacher account has an active class assignment and submitted attendance sessions.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {!loading && history?.availableClasses.length ? (
                <>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[
                      { label: "Sessions", value: history.totals.sessions, icon: Calendar, color: "text-brand-green", bg: "bg-brand-green/10" },
                      { label: "Present", value: history.totals.present, icon: Check, color: "text-brand-green", bg: "bg-brand-green/10" },
                      { label: "Absent", value: history.totals.absent, icon: X, color: "text-red-500", bg: "bg-red-500/10" },
                      { label: "Late", value: history.totals.late, icon: Clock, color: "text-brand-orange", bg: "bg-brand-orange/10" },
                    ].map((card) => (
                      <div key={card.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
                        <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>
                          <card.icon size={18} />
                        </div>
                        <div className={`font-display text-3xl ${card.color}`}>{card.value}</div>
                        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{card.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-display text-2xl text-[var(--text-primary)]">Monthly summary</h2>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          Overall attendance rate for {selectedMonth}: <strong className="text-brand-green">{history.totals.attendanceRate}%</strong>
                        </p>
                      </div>
                      {history.selectedClassId ? (
                        <Link
                          href={`/teacher/class/attendance?classId=${encodeURIComponent(history.selectedClassId)}`}
                          className="inline-flex items-center justify-center rounded-full bg-brand-green px-5 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-brand-green-dark"
                        >
                          Open live register
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--card-shadow)]">
                    <div className="border-b border-[var(--border-subtle)] px-6 py-4">
                      <h2 className="font-display text-xl text-[var(--text-primary)]">Submitted sessions</h2>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Most recent sessions for the selected class and month.</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--surface-disabled)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                          <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Period</th>
                            <th className="px-6 py-3">Present</th>
                            <th className="px-6 py-3">Absent</th>
                            <th className="px-6 py-3">Late</th>
                            <th className="px-6 py-3">Rate</th>
                            <th className="px-6 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.records.map((record) => (
                            <tr key={record.id} className="border-t border-[var(--border-subtle)]">
                              <td className="px-6 py-4 font-medium text-[var(--text-primary)]">
                                {new Date(`${record.date}T12:00:00.000Z`).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-[var(--text-secondary)]">{record.periodKey}</td>
                              <td className="px-6 py-4 text-brand-green">{record.present}</td>
                              <td className="px-6 py-4 text-red-500">{record.absent}</td>
                              <td className="px-6 py-4 text-brand-orange">{record.late}</td>
                              <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">{record.attendanceRate}%</td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                                    record.isLocked
                                      ? "bg-brand-green/15 text-brand-green"
                                      : "bg-brand-orange/15 text-brand-orange"
                                  }`}
                                >
                                  {record.isLocked ? "Locked" : "Draft"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {!history.records.length ? (
                      <div className="px-6 py-10 text-center text-sm text-[var(--text-muted)]">
                        No attendance sessions found for the selected month.
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
'@
Write-ProjectFile -RelativePath 'app\teacher\class\attendance-history\page.tsx' -Content $content

Write-Host "Phase 3A Teacher Attendance files applied successfully." -ForegroundColor Cyan