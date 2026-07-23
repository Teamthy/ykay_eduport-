$ProjectRoot = "C:\Users\USER\Desktop\PROJECTS\ykay_edu\envoys-site"

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-ProjectFile {
    param(
        [string]$RelativePath,
        [string]$Content
    )

    $FullPath = Join-Path $ProjectRoot $RelativePath
    $Dir = Split-Path $FullPath -Parent
    if (-not (Test-Path $Dir)) { New-Item -ItemType Directory -Path $Dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($FullPath, $Content, $Utf8NoBom)
    Write-Host "Updated $RelativePath" -ForegroundColor Green
}

Write-Host "Applying Phase 3B Attendance Portals files..." -ForegroundColor Cyan

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

enum AlertChannel {
  SMS
  WHATSAPP
  EMAIL
}

enum AlertDeliveryStatus {
  PENDING
  SENT
  FAILED
  SKIPPED
}

enum AttendanceCorrectionStatus {
  PENDING
  APPROVED
  REJECTED
}

model School {
  id                     String                      @id @default(cuid())
  slug                   String                      @unique
  name                   String
  address                String
  phone                  String
  email                  String?
  motto                  String?
  createdAt              DateTime                    @default(now())
  updatedAt              DateTime                    @updatedAt

  users                   User[]
  applications            AdmissionApplication[]
  auditLogs               AuditLog[]
  classes                 SchoolClass[]
  teacherProfiles         TeacherProfile[]
  parentProfiles          ParentProfile[]
  studentProfiles         StudentProfile[]
  teacherClassAssignments TeacherClassAssignment[]
  attendanceSessions      AttendanceSession[]
  attendanceAlertJobs     AttendanceAlertJob[]
  correctionRequests      AttendanceCorrectionRequest[]
}

model User {
  id                         String                        @id @default(cuid())
  schoolId                   String
  email                      String                        @unique
  name                       String
  role                       UserRole
  passwordHash               String
  isActive                   Boolean                       @default(true)
  isSuspended                Boolean                       @default(false)
  lastLoginAt                DateTime?
  createdAt                  DateTime                      @default(now())
  updatedAt                  DateTime                      @updatedAt

  school                      School                        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  refreshTokens               RefreshToken[]
  passwordResetTokens         PasswordResetToken[]
  auditLogs                   AuditLog[]
  teacherProfile              TeacherProfile?
  studentProfile              StudentProfile?
  parentProfile               ParentProfile?
  requestedCorrectionRequests AttendanceCorrectionRequest[] @relation("CorrectionRequester")
  reviewedCorrectionRequests  AttendanceCorrectionRequest[] @relation("CorrectionReviewer")

  @@index([schoolId, role])
}

model TeacherProfile {
  id                 String                        @id @default(cuid())
  schoolId           String
  userId             String                        @unique
  displayName        String
  phone              String?
  photoUrl           String?
  roleLabel          String?
  isActive           Boolean                       @default(true)
  createdAt          DateTime                      @default(now())
  updatedAt          DateTime                      @updatedAt

  school             School                        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  user               User                          @relation(fields: [userId], references: [id], onDelete: Cascade)
  classAssignments   TeacherClassAssignment[]
  attendanceSessions AttendanceSession[]
  correctionRequests AttendanceCorrectionRequest[]

  @@index([schoolId, displayName])
}

model ParentProfile {
  id              String              @id @default(cuid())
  schoolId        String
  userId          String              @unique
  displayName     String
  phone           String?
  photoUrl        String?
  isActive        Boolean             @default(true)
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  school          School              @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  studentLinks    ParentStudentLink[]
  attendanceJobs  AttendanceAlertJob[]

  @@index([schoolId, displayName])
}

model SchoolClass {
  id                 String                   @id @default(cuid())
  schoolId           String
  level              String
  arm                String
  displayName        String
  isActive           Boolean                  @default(true)
  capacity           Int?
  createdAt          DateTime                 @default(now())
  updatedAt          DateTime                 @updatedAt

  school             School                   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  students           StudentProfile[]
  teacherAssignments TeacherClassAssignment[]
  attendanceSessions AttendanceSession[]

  @@unique([schoolId, displayName])
  @@index([schoolId, level, arm])
}

model StudentProfile {
  id               String              @id @default(cuid())
  schoolId         String
  currentClassId   String
  userId           String?             @unique
  studentId        String
  firstName        String
  lastName         String
  otherNames       String?
  displayName      String
  gender           String?
  guardianName     String?
  guardianPhone    String?
  guardianEmail    String?
  isActive         Boolean             @default(true)
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  school           School              @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  currentClass     SchoolClass         @relation(fields: [currentClassId], references: [id], onDelete: Restrict)
  user             User?               @relation(fields: [userId], references: [id], onDelete: SetNull)
  attendanceEntries AttendanceEntry[]
  parentLinks      ParentStudentLink[]
  attendanceJobs   AttendanceAlertJob[]

  @@unique([schoolId, studentId])
  @@index([currentClassId, isActive])
  @@index([schoolId, displayName])
}

model ParentStudentLink {
  id              String         @id @default(cuid())
  parentProfileId String
  studentProfileId String
  relationship    String?
  isPrimary       Boolean        @default(true)
  createdAt       DateTime       @default(now())

  parentProfile   ParentProfile  @relation(fields: [parentProfileId], references: [id], onDelete: Cascade)
  studentProfile  StudentProfile @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)

  @@unique([parentProfileId, studentProfileId])
  @@index([studentProfileId, isPrimary])
}

model TeacherClassAssignment {
  id                 String                @id @default(cuid())
  schoolId           String
  teacherProfileId   String
  classId            String
  role               TeacherAssignmentRole
  subjectName        String?
  isActive           Boolean               @default(true)
  createdAt          DateTime              @default(now())
  updatedAt          DateTime              @updatedAt

  school             School                @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  teacherProfile     TeacherProfile        @relation(fields: [teacherProfileId], references: [id], onDelete: Cascade)
  classroom          SchoolClass           @relation(fields: [classId], references: [id], onDelete: Cascade)
  attendanceSessions AttendanceSession[]

  @@unique([teacherProfileId, classId, role])
  @@index([schoolId, classId, role])
  @@index([teacherProfileId, isActive])
}

model AttendanceSession {
  id                  String                        @id @default(cuid())
  schoolId            String
  classId             String
  teacherProfileId    String
  assignmentId        String?
  sessionDate         DateTime
  periodKey           String                        @default("DAILY_REGISTER")
  notes               String?
  submittedAt         DateTime?
  isLocked            Boolean                       @default(false)
  createdAt           DateTime                      @default(now())
  updatedAt           DateTime                      @updatedAt

  school              School                        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  classroom           SchoolClass                   @relation(fields: [classId], references: [id], onDelete: Cascade)
  teacherProfile      TeacherProfile                @relation(fields: [teacherProfileId], references: [id], onDelete: Cascade)
  assignment          TeacherClassAssignment?       @relation(fields: [assignmentId], references: [id], onDelete: SetNull)
  entries             AttendanceEntry[]
  alertJobs           AttendanceAlertJob[]
  correctionRequests  AttendanceCorrectionRequest[]

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

  session          AttendanceSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  studentProfile   StudentProfile    @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)

  @@unique([sessionId, studentProfileId])
  @@index([studentProfileId, markedAt])
}

model AttendanceAlertJob {
  id               String              @id @default(cuid())
  schoolId         String
  attendanceSessionId String
  studentProfileId String
  parentProfileId  String?
  channel          AlertChannel
  status           AlertDeliveryStatus @default(PENDING)
  recipientName    String?
  recipientPhone   String?
  recipientEmail   String?
  messagePreview   String
  payload          Json?
  processedAt      DateTime?
  failureReason    String?
  createdAt        DateTime            @default(now())

  school           School              @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  attendanceSession AttendanceSession  @relation(fields: [attendanceSessionId], references: [id], onDelete: Cascade)
  studentProfile   StudentProfile      @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
  parentProfile    ParentProfile?      @relation(fields: [parentProfileId], references: [id], onDelete: SetNull)

  @@unique([attendanceSessionId, studentProfileId, channel])
  @@index([schoolId, status, channel, createdAt])
  @@index([parentProfileId, createdAt])
}

model AttendanceCorrectionRequest {
  id                String                     @id @default(cuid())
  schoolId          String
  attendanceSessionId String
  teacherProfileId  String
  requestedByUserId String
  reviewedByUserId  String?
  reason            String
  status            AttendanceCorrectionStatus @default(PENDING)
  resolutionNote    String?
  reviewedAt        DateTime?
  createdAt         DateTime                   @default(now())
  updatedAt         DateTime                   @updatedAt

  school            School                     @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  attendanceSession AttendanceSession          @relation(fields: [attendanceSessionId], references: [id], onDelete: Cascade)
  teacherProfile    TeacherProfile             @relation(fields: [teacherProfileId], references: [id], onDelete: Cascade)
  requestedBy       User                       @relation("CorrectionRequester", fields: [requestedByUserId], references: [id], onDelete: Cascade)
  reviewedBy        User?                      @relation("CorrectionReviewer", fields: [reviewedByUserId], references: [id], onDelete: SetNull)

  @@index([schoolId, status, createdAt])
  @@index([attendanceSessionId, status])
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

# --- prisma/migrations/20260723150000_phase_3b_attendance_portals/migration.sql ---
$content = @'
-- CreateEnum
CREATE TYPE "public"."AlertChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "public"."AlertDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."AttendanceCorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."StudentProfile"
ADD COLUMN "userId" TEXT;

-- CreateTable
CREATE TABLE "public"."ParentProfile" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phone" TEXT,
    "photoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ParentStudentLink" (
    "id" TEXT NOT NULL,
    "parentProfileId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "relationship" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentStudentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceAlertJob" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "attendanceSessionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "parentProfileId" TEXT,
    "channel" "public"."AlertChannel" NOT NULL,
    "status" "public"."AlertDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "recipientEmail" TEXT,
    "messagePreview" TEXT NOT NULL,
    "payload" JSONB,
    "processedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceAlertJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceCorrectionRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "attendanceSessionId" TEXT NOT NULL,
    "teacherProfileId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "public"."AttendanceCorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "resolutionNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceCorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "public"."StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentProfile_userId_key" ON "public"."ParentProfile"("userId");

-- CreateIndex
CREATE INDEX "ParentProfile_schoolId_displayName_idx" ON "public"."ParentProfile"("schoolId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "ParentStudentLink_parentProfileId_studentProfileId_key" ON "public"."ParentStudentLink"("parentProfileId", "studentProfileId");

-- CreateIndex
CREATE INDEX "ParentStudentLink_studentProfileId_isPrimary_idx" ON "public"."ParentStudentLink"("studentProfileId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceAlertJob_attendanceSessionId_studentProfileId_channel_key" ON "public"."AttendanceAlertJob"("attendanceSessionId", "studentProfileId", "channel");

-- CreateIndex
CREATE INDEX "AttendanceAlertJob_schoolId_status_channel_createdAt_idx" ON "public"."AttendanceAlertJob"("schoolId", "status", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceAlertJob_parentProfileId_createdAt_idx" ON "public"."AttendanceAlertJob"("parentProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceCorrectionRequest_schoolId_status_createdAt_idx" ON "public"."AttendanceCorrectionRequest"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceCorrectionRequest_attendanceSessionId_status_idx" ON "public"."AttendanceCorrectionRequest"("attendanceSessionId", "status");

-- AddForeignKey
ALTER TABLE "public"."StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParentProfile" ADD CONSTRAINT "ParentProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParentProfile" ADD CONSTRAINT "ParentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "public"."ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceAlertJob" ADD CONSTRAINT "AttendanceAlertJob_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceAlertJob" ADD CONSTRAINT "AttendanceAlertJob_attendanceSessionId_fkey" FOREIGN KEY ("attendanceSessionId") REFERENCES "public"."AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceAlertJob" ADD CONSTRAINT "AttendanceAlertJob_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceAlertJob" ADD CONSTRAINT "AttendanceAlertJob_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "public"."ParentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_attendanceSessionId_fkey" FOREIGN KEY ("attendanceSessionId") REFERENCES "public"."AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "public"."TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
'@
Write-ProjectFile -RelativePath 'prisma\migrations\20260723150000_phase_3b_attendance_portals\migration.sql' -Content $content

# --- lib/attendance-portal.ts ---
$content = @'
import { AttendanceStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export type CalendarStatus = "Present" | "Absent" | "Late";

export type CalendarDay = {
  date: string;
  status: CalendarStatus;
  note?: string;
};

export function parseMonth(input?: string | null) {
  if (input && /^\d{4}-\d{2}$/.test(input)) {
    const [year, month] = input.split("-").map(Number);
    const from = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
    const to = new Date(Date.UTC(year, month, 1, 12, 0, 0));
    return {
      key: input,
      monthLabel: from.toLocaleString("en-US", { month: "long" }),
      year,
      from,
      to,
    };
  }

  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12, 0, 0));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 12, 0, 0));
  return {
    key: from.toISOString().slice(0, 7),
    monthLabel: from.toLocaleString("en-US", { month: "long" }),
    year: from.getUTCFullYear(),
    from,
    to,
  };
}

function statusPriority(status: AttendanceStatus) {
  if (status === AttendanceStatus.ABSENT) return 3;
  if (status === AttendanceStatus.LATE) return 2;
  return 1;
}

function toCalendarStatus(status: AttendanceStatus): CalendarStatus {
  if (status === AttendanceStatus.ABSENT) return "Absent";
  if (status === AttendanceStatus.LATE) return "Late";
  return "Present";
}

export function summarizeCalendar(days: CalendarDay[]) {
  const present = days.filter((day) => day.status === "Present").length;
  const absent = days.filter((day) => day.status === "Absent").length;
  const late = days.filter((day) => day.status === "Late").length;
  const total = days.length;
  return {
    present,
    absent,
    late,
    total,
    attendanceRate: total ? Math.round((present / total) * 100) : 0,
  };
}

export function aggregateCalendarDays(
  entries: Array<{ status: AttendanceStatus; note: string | null; sessionDate: Date }>
): CalendarDay[] {
  const byDate = new Map<string, { status: AttendanceStatus; note?: string }>();

  for (const entry of entries) {
    const key = entry.sessionDate.toISOString().slice(0, 10);
    const existing = byDate.get(key);

    if (!existing || statusPriority(entry.status) > statusPriority(existing.status)) {
      byDate.set(key, {
        status: entry.status,
        note: entry.note || undefined,
      });
    } else if (!existing.note && entry.note) {
      byDate.set(key, {
        status: existing.status,
        note: entry.note,
      });
    }
  }

  return [...byDate.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, value]) => ({
      date,
      status: toCalendarStatus(value.status),
      note: value.note,
    }));
}

export async function getStudentPortalProfile() {
  const user = await requireRole([UserRole.STUDENT]);
  if (!user) return null;

  const profile = await prisma.studentProfile.findFirst({
    where: {
      schoolId: user.schoolId,
      userId: user.id,
      isActive: true,
    },
    select: {
      id: true,
      studentId: true,
      displayName: true,
      currentClass: {
        select: {
          id: true,
          displayName: true,
          level: true,
          arm: true,
        },
      },
    },
  });

  if (!profile) return null;
  return { user, profile };
}

export async function getParentPortalProfile() {
  const user = await requireRole([UserRole.PARENT]);
  if (!user) return null;

  const profile = await prisma.parentProfile.findFirst({
    where: {
      schoolId: user.schoolId,
      userId: user.id,
      isActive: true,
    },
    select: {
      id: true,
      displayName: true,
      studentLinks: {
        orderBy: [{ isPrimary: "desc" }, { studentProfile: { displayName: "asc" } }],
        select: {
          relationship: true,
          isPrimary: true,
          studentProfile: {
            select: {
              id: true,
              studentId: true,
              displayName: true,
              currentClass: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!profile) return null;
  return { user, profile };
}

export async function getStudentAttendanceMonth(studentProfileId: string, monthKey?: string | null) {
  const range = parseMonth(monthKey);
  const entries = await prisma.attendanceEntry.findMany({
    where: {
      studentProfileId,
      session: {
        sessionDate: {
          gte: range.from,
          lt: range.to,
        },
      },
    },
    orderBy: [{ session: { sessionDate: "asc" } }, { markedAt: "asc" }],
    select: {
      status: true,
      note: true,
      session: {
        select: {
          sessionDate: true,
        },
      },
    },
  });

  const days = aggregateCalendarDays(
    entries.map((entry) => ({
      status: entry.status,
      note: entry.note,
      sessionDate: entry.session.sessionDate,
    }))
  );

  return {
    month: range.key,
    monthLabel: range.monthLabel,
    year: range.year,
    days,
    summary: summarizeCalendar(days),
  };
}
'@
Write-ProjectFile -RelativePath 'lib\attendance-portal.ts' -Content $content

# --- app/api/student/attendance/route.ts ---
$content = @'
import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/requests";
import { getStudentAttendanceMonth, getStudentPortalProfile } from "@/lib/attendance-portal";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const context = await getStudentPortalProfile();
  if (!context) {
    return jsonNoStore({ error: "No live student profile is linked to this account yet." }, { status: 404 });
  }

  const attendance = await getStudentAttendanceMonth(
    context.profile.id,
    request.nextUrl.searchParams.get("month")
  );

  return jsonNoStore({
    student: {
      id: context.profile.studentId,
      displayName: context.profile.displayName,
      className: context.profile.currentClass.displayName,
    },
    month: attendance.month,
    monthLabel: attendance.monthLabel,
    year: attendance.year,
    days: attendance.days,
    summary: attendance.summary,
  });
}
'@
Write-ProjectFile -RelativePath 'app\api\student\attendance\route.ts' -Content $content

# --- app/api/parent/attendance/route.ts ---
$content = @'
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonNoStore } from "@/lib/requests";
import { getParentPortalProfile, getStudentAttendanceMonth } from "@/lib/attendance-portal";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const context = await getParentPortalProfile();
  if (!context) {
    return jsonNoStore({ error: "No live parent profile is linked to this account yet." }, { status: 404 });
  }

  const children = context.profile.studentLinks.map((link) => ({
    id: link.studentProfile.id,
    studentId: link.studentProfile.studentId,
    displayName: link.studentProfile.displayName,
    className: link.studentProfile.currentClass.displayName,
    relationship: link.relationship,
    isPrimary: link.isPrimary,
  }));

  if (!children.length) {
    return jsonNoStore({
      parent: { displayName: context.profile.displayName },
      children: [],
      selectedChild: null,
      month: null,
      monthLabel: null,
      year: null,
      days: [],
      summary: { present: 0, absent: 0, late: 0, total: 0, attendanceRate: 0 },
      recentAlerts: [],
    });
  }

  const requestedStudentId = request.nextUrl.searchParams.get("studentId");
  const selectedChild = children.find((child) => child.id === requestedStudentId) || children[0];
  const attendance = await getStudentAttendanceMonth(
    selectedChild.id,
    request.nextUrl.searchParams.get("month")
  );

  const recentAlerts = await prisma.attendanceAlertJob.findMany({
    where: {
      schoolId: context.user.schoolId,
      studentProfileId: selectedChild.id,
      OR: [{ parentProfileId: context.profile.id }, { parentProfileId: null }],
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      channel: true,
      status: true,
      messagePreview: true,
      createdAt: true,
    },
  });

  return jsonNoStore({
    parent: { displayName: context.profile.displayName },
    children,
    selectedChild,
    month: attendance.month,
    monthLabel: attendance.monthLabel,
    year: attendance.year,
    days: attendance.days,
    summary: attendance.summary,
    recentAlerts: recentAlerts.map((alert) => ({
      id: alert.id,
      channel: alert.channel,
      status: alert.status,
      messagePreview: alert.messagePreview,
      createdAt: alert.createdAt.toISOString(),
    })),
  });
}
'@
Write-ProjectFile -RelativePath 'app\api\parent\attendance\route.ts' -Content $content

# --- app/api/parent/dashboard/route.ts ---
$content = @'
import { prisma } from "@/lib/prisma";
import { jsonNoStore } from "@/lib/requests";
import { getParentPortalProfile, getStudentAttendanceMonth } from "@/lib/attendance-portal";

export const runtime = "nodejs";

export async function GET() {
  const context = await getParentPortalProfile();
  if (!context) {
    return jsonNoStore({ error: "No live parent profile is linked to this account yet." }, { status: 404 });
  }

  const children = context.profile.studentLinks.map((link) => ({
    id: link.studentProfile.id,
    studentId: link.studentProfile.studentId,
    displayName: link.studentProfile.displayName,
    className: link.studentProfile.currentClass.displayName,
    relationship: link.relationship,
    isPrimary: link.isPrimary,
  }));

  if (!children.length) {
    return jsonNoStore({
      parent: { displayName: context.profile.displayName },
      children: [],
      selectedChild: null,
      attendance: { present: 0, absent: 0, late: 0, total: 0, attendanceRate: 0 },
      recentAlerts: [],
    });
  }

  const selectedChild = children[0];
  const attendance = await getStudentAttendanceMonth(selectedChild.id, null);

  const recentAlerts = await prisma.attendanceAlertJob.findMany({
    where: {
      schoolId: context.user.schoolId,
      studentProfileId: selectedChild.id,
      OR: [{ parentProfileId: context.profile.id }, { parentProfileId: null }],
    },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true,
      channel: true,
      status: true,
      messagePreview: true,
      createdAt: true,
    },
  });

  return jsonNoStore({
    parent: { displayName: context.profile.displayName },
    children,
    selectedChild,
    attendance: attendance.summary,
    recentAlerts: recentAlerts.map((alert) => ({
      id: alert.id,
      channel: alert.channel,
      status: alert.status,
      messagePreview: alert.messagePreview,
      createdAt: alert.createdAt.toISOString(),
    })),
  });
}
'@
Write-ProjectFile -RelativePath 'app\api\parent\dashboard\route.ts' -Content $content

# --- app/api/teacher/attendance/correction-request/route.ts ---
$content = @'
import { AttendanceCorrectionStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp, jsonNoStore } from "@/lib/requests";
import { getTeacherAttendanceContext } from "@/lib/teacher-attendance";

export const runtime = "nodejs";

const REQUEST_SCHEMA = z.object({
  sessionId: z.string().trim().min(1),
  reason: z.string().trim().min(10, "Provide a clear reason for the correction request.").max(500),
});

export async function POST(request: NextRequest) {
  const context = await getTeacherAttendanceContext();
  if (!context) {
    return jsonNoStore({ error: "Teacher attendance correction access is not available for this account." }, { status: 403 });
  }

  try {
    const payload = REQUEST_SCHEMA.parse(await request.json());
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: payload.sessionId,
        schoolId: context.user.schoolId,
        teacherProfileId: context.teacherProfile.id,
      },
      select: {
        id: true,
        isLocked: true,
      },
    });

    if (!session) {
      return jsonNoStore({ error: "Attendance session not found." }, { status: 404 });
    }

    if (!session.isLocked) {
      return jsonNoStore({ error: "Only locked attendance sessions need correction requests." }, { status: 422 });
    }

    const existingPending = await prisma.attendanceCorrectionRequest.findFirst({
      where: {
        attendanceSessionId: session.id,
        status: AttendanceCorrectionStatus.PENDING,
      },
      select: { id: true },
    });

    if (existingPending) {
      return jsonNoStore({ error: "A correction request is already pending for this attendance session." }, { status: 409 });
    }

    const ipAddress = getClientIp(request);
    const created = await prisma.$transaction(async (tx) => {
      const correctionRequest = await tx.attendanceCorrectionRequest.create({
        data: {
          schoolId: context.user.schoolId,
          attendanceSessionId: session.id,
          teacherProfileId: context.teacherProfile.id,
          requestedByUserId: context.user.id,
          reason: payload.reason,
        },
        select: {
          id: true,
          status: true,
          reason: true,
          createdAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: context.user.schoolId,
          actorUserId: context.user.id,
          action: "ATTENDANCE_CORRECTION_REQUESTED",
          entityType: "AttendanceCorrectionRequest",
          entityId: correctionRequest.id,
          ipAddress,
          metadata: {
            attendanceSessionId: session.id,
            reason: payload.reason,
          },
        },
      });

      return correctionRequest;
    });

    return jsonNoStore({
      request: {
        id: created.id,
        status: created.status,
        reason: created.reason,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to request an attendance correction right now.";
    return jsonNoStore({ error: message }, { status: 400 });
  }
}
'@
Write-ProjectFile -RelativePath 'app\api\teacher\attendance\correction-request\route.ts' -Content $content

# --- app/api/admin/attendance/corrections/route.ts ---
$content = @'
import { AttendanceCorrectionStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { requireRole } from "@/lib/session";

const allowedRoles = [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.COORDINATOR];
const updateSchema = z.object({
  requestId: z.string().trim().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  resolutionNote: z.string().trim().max(500).optional(),
});

export async function GET() {
  const user = await requireRole(allowedRoles);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await prisma.attendanceCorrectionRequest.findMany({
    where: {
      schoolId: user.schoolId,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      reason: true,
      status: true,
      resolutionNote: true,
      createdAt: true,
      reviewedAt: true,
      attendanceSession: {
        select: {
          id: true,
          sessionDate: true,
          periodKey: true,
          isLocked: true,
          classroom: { select: { displayName: true } },
        },
      },
      teacherProfile: {
        select: {
          displayName: true,
        },
      },
      requestedBy: {
        select: {
          name: true,
          email: true,
        },
      },
      reviewedBy: {
        select: {
          name: true,
        },
      },
    },
  });

  return NextResponse.json({ requests });
}

export async function PATCH(request: NextRequest) {
  const user = await requireRole(allowedRoles);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const payload = updateSchema.parse(await request.json());
    const existing = await prisma.attendanceCorrectionRequest.findFirst({
      where: {
        id: payload.requestId,
        schoolId: user.schoolId,
      },
      select: {
        id: true,
        status: true,
        attendanceSessionId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Correction request not found." }, { status: 404 });
    }

    const decision = payload.decision as AttendanceCorrectionStatus;
    const ipAddress = getClientIp(request);

    const updated = await prisma.$transaction(async (tx) => {
      const correctionRequest = await tx.attendanceCorrectionRequest.update({
        where: { id: existing.id },
        data: {
          status: decision,
          resolutionNote: payload.resolutionNote || null,
          reviewedAt: new Date(),
          reviewedByUserId: user.id,
        },
        select: {
          id: true,
          status: true,
          resolutionNote: true,
          attendanceSessionId: true,
        },
      });

      if (decision === AttendanceCorrectionStatus.APPROVED) {
        await tx.attendanceSession.update({
          where: { id: existing.attendanceSessionId },
          data: {
            isLocked: false,
            submittedAt: null,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId: user.schoolId,
          actorUserId: user.id,
          action:
            decision === AttendanceCorrectionStatus.APPROVED
              ? "ATTENDANCE_CORRECTION_APPROVED"
              : "ATTENDANCE_CORRECTION_REJECTED",
          entityType: "AttendanceCorrectionRequest",
          entityId: correctionRequest.id,
          ipAddress,
          metadata: {
            attendanceSessionId: correctionRequest.attendanceSessionId,
            resolutionNote: payload.resolutionNote || null,
          },
        },
      });

      return correctionRequest;
    });

    return NextResponse.json({ request: updated });
  } catch {
    return NextResponse.json({ error: "Unable to update correction request." }, { status: 400 });
  }
}
'@
Write-ProjectFile -RelativePath 'app\api\admin\attendance\corrections\route.ts' -Content $content

# --- app/api/teacher/attendance/register/route.ts ---
$content = @'
import { AlertChannel, AttendanceCorrectionStatus, AttendanceStatus } from "@prisma/client";
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

function buildAlertMessage(input: {
  studentName: string;
  status: AttendanceStatus;
  className: string;
  sessionDate: string;
  note?: string | null;
}) {
  const statusLabel = input.status === AttendanceStatus.ABSENT ? "absent" : "late";
  const note = input.note ? ` Teacher note: ${input.note}.` : "";
  return `Attendance Alert: ${input.studentName} was marked ${statusLabel} in ${input.className} on ${input.sessionDate}.${note}`;
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
        correctionRequests: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            reason: true,
            resolutionNote: true,
            createdAt: true,
            reviewedAt: true,
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
          correctionRequest: session.correctionRequests[0]
            ? {
                id: session.correctionRequests[0].id,
                status: session.correctionRequests[0].status,
                reason: session.correctionRequests[0].reason,
                resolutionNote: session.correctionRequests[0].resolutionNote,
                createdAt: session.correctionRequests[0].createdAt.toISOString(),
                reviewedAt: session.correctionRequests[0].reviewedAt?.toISOString() || null,
              }
            : null,
        }
      : {
          id: null,
          date: attendanceDateKey(sessionDate),
          periodKey,
          notes: "",
          isLocked: false,
          submittedAt: null,
          correctionRequest: null,
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
    let createdAlertJobs = 0;

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

      if (payload.finalize) {
        await tx.attendanceAlertJob.deleteMany({ where: { attendanceSessionId: session.id } });

        const affectedIds = payload.entries
          .filter((entry) => entry.status === AttendanceStatus.ABSENT || entry.status === AttendanceStatus.LATE)
          .map((entry) => entry.studentProfileId);

        if (affectedIds.length) {
          const affectedStudents = await tx.studentProfile.findMany({
            where: { id: { in: affectedIds } },
            select: {
              id: true,
              displayName: true,
              guardianName: true,
              guardianPhone: true,
              guardianEmail: true,
              parentLinks: {
                where: { parentProfile: { isActive: true } },
                orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
                select: {
                  parentProfile: {
                    select: {
                      id: true,
                      displayName: true,
                      phone: true,
                      user: {
                        select: {
                          email: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          const entriesById = new Map(payload.entries.map((entry) => [entry.studentProfileId, entry]));
          const alertRows: Array<{
            schoolId: string;
            attendanceSessionId: string;
            studentProfileId: string;
            parentProfileId?: string;
            channel: AlertChannel;
            recipientName?: string;
            recipientPhone?: string;
            recipientEmail?: string;
            messagePreview: string;
            payload: object;
          }> = [];

          for (const student of affectedStudents) {
            const entry = entriesById.get(student.id);
            if (!entry) continue;
            const messagePreview = buildAlertMessage({
              studentName: student.displayName,
              status: entry.status,
              className: selectedAssignment.classroom.displayName,
              sessionDate: attendanceDateKey(sessionDate),
              note: entry.note,
            });

            const primaryParent = student.parentLinks[0]?.parentProfile;
            const recipientName = primaryParent?.displayName || student.guardianName || student.displayName;
            const recipientPhone = primaryParent?.phone || student.guardianPhone || undefined;
            const recipientEmail = primaryParent?.user.email || student.guardianEmail || undefined;

            if (recipientPhone) {
              alertRows.push({
                schoolId: context.user.schoolId,
                attendanceSessionId: session.id,
                studentProfileId: student.id,
                parentProfileId: primaryParent?.id,
                channel: AlertChannel.SMS,
                recipientName,
                recipientPhone,
                messagePreview,
                payload: { deliveryChannel: "SMS", attendanceStatus: entry.status },
              });
              alertRows.push({
                schoolId: context.user.schoolId,
                attendanceSessionId: session.id,
                studentProfileId: student.id,
                parentProfileId: primaryParent?.id,
                channel: AlertChannel.WHATSAPP,
                recipientName,
                recipientPhone,
                messagePreview,
                payload: { deliveryChannel: "WHATSAPP", attendanceStatus: entry.status },
              });
            }

            if (recipientEmail) {
              alertRows.push({
                schoolId: context.user.schoolId,
                attendanceSessionId: session.id,
                studentProfileId: student.id,
                parentProfileId: primaryParent?.id,
                channel: AlertChannel.EMAIL,
                recipientName,
                recipientEmail,
                messagePreview,
                payload: { deliveryChannel: "EMAIL", attendanceStatus: entry.status },
              });
            }
          }

          if (alertRows.length) {
            await tx.attendanceAlertJob.createMany({ data: alertRows });
            createdAlertJobs = alertRows.length;
          }
        }
      }

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
            createdAlertJobs,
          },
        },
      });

      if (payload.finalize) {
        await tx.attendanceCorrectionRequest.updateMany({
          where: {
            attendanceSessionId: session.id,
            status: AttendanceCorrectionStatus.PENDING,
          },
          data: {
            status: AttendanceCorrectionStatus.REJECTED,
            resolutionNote: "Superseded by a new attendance submission.",
            reviewedAt: new Date(),
            reviewedByUserId: context.user.id,
          },
        });
      }

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
        queuedParentAlerts: createdAlertJobs,
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

# --- app/student/attendance/page.tsx ---
$content = @'
"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import AttendanceCalendar, { type AttendanceDay } from "@/components/AttendanceCalendar";
import {
  CalendarDays,
  Check,
  Clock,
  FileWarning,
  LayoutDashboard,
  LoaderCircle,
  User,
  FileText,
  Bell,
  GraduationCap,
  ClipboardCheck,
  Calendar,
  X,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/student/attendance", icon: CalendarDays },
  { label: "Timetable", href: "/student/timetable", icon: Calendar },
  { label: "CBT Tests", href: "/student/exams", icon: ClipboardCheck },
  { label: "Report Cards", href: "/student/report-cards", icon: FileText },
  { label: "Announcements", href: "/student/announcements", icon: Bell },
  { label: "My Profile", href: "/student/profile", icon: User },
  { label: "Teachers", href: "/student/teachers", icon: GraduationCap },
];

type StudentAttendanceResponse = {
  student: {
    id: string;
    displayName: string;
    className: string;
  };
  month: string;
  monthLabel: string;
  year: number;
  days: AttendanceDay[];
  summary: {
    present: number;
    absent: number;
    late: number;
    total: number;
    attendanceRate: number;
  };
};

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export default function StudentAttendancePage() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [data, setData] = useState<StudentAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAttendance() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/student/attendance?month=${encodeURIComponent(selectedMonth)}`, {
          cache: "no-store",
        });
        const body = (await response.json()) as StudentAttendanceResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load attendance records.");
        if (!active) return;
        setData(body);
      } catch (loadError) {
        if (!active) return;
        setData(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load attendance records.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAttendance();
    return () => {
      active = false;
    };
  }, [selectedMonth]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="px-6 pb-10 pt-24">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/5 bg-gradient-to-br from-brand-navy to-brand-navy-light p-8 shadow-xl md:p-12">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green/20 text-brand-green">
                  <User size={26} />
                </div>
                <div>
                  <h1 className="font-display text-[36px] tracking-[3px] text-white md:text-[56px]">
                    MY <span className="text-brand-green">ATTENDANCE</span>
                  </h1>
                  <p className="text-sm text-white/60">
                    {data ? `${data.student.displayName} · ${data.student.className}` : "Live attendance calendar"}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 px-4 py-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                  Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <PortalSidebar portalName="Student" portalType="student" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 space-y-8">
              {loading ? (
                <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading student attendance...
                  </div>
                </div>
              ) : null}

              {!loading && error ? (
                <div className="rounded-[2rem] border border-brand-orange/30 bg-brand-orange/10 p-6 shadow-[var(--card-shadow)]">
                  <div className="flex items-start gap-3">
                    <FileWarning className="mt-0.5 text-brand-orange" size={20} />
                    <div>
                      <h2 className="font-display text-2xl text-[var(--text-primary)]">Attendance profile not ready</h2>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{error}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {!loading && data ? (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <AttendanceCalendar
                      days={data.days}
                      month={data.monthLabel}
                      year={data.year}
                      title={`${data.student.className} — ${data.monthLabel} ${data.year}`}
                      subtitle="Personal attendance calendar"
                      viewType="student"
                    />
                  </div>

                  <aside className="space-y-6">
                    <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                      <h3 className="mb-6 font-display text-xl text-[var(--text-primary)]">My Stats</h3>
                      <div className="mb-4 rounded-xl bg-[var(--surface-disabled)] p-5">
                        <div className="mb-1 text-xs uppercase tracking-wider text-[var(--text-muted)]">Attendance Rate</div>
                        <div className="font-display text-4xl text-brand-green">{data.summary.attendanceRate}%</div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-brand-green/10 p-4 text-center">
                          <Check size={18} className="mx-auto mb-1 text-brand-green" />
                          <div className="font-display text-xl text-brand-green">{data.summary.present}</div>
                          <div className="text-[9px] text-[var(--text-muted)]">Present</div>
                        </div>
                        <div className="rounded-xl bg-red-500/10 p-4 text-center">
                          <X size={18} className="mx-auto mb-1 text-red-500" />
                          <div className="font-display text-xl text-red-500">{data.summary.absent}</div>
                          <div className="text-[9px] text-[var(--text-muted)]">Absent</div>
                        </div>
                        <div className="rounded-xl bg-brand-orange/10 p-4 text-center">
                          <Clock size={18} className="mx-auto mb-1 text-brand-orange" />
                          <div className="font-display text-xl text-brand-orange">{data.summary.late}</div>
                          <div className="text-[9px] text-[var(--text-muted)]">Late</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="text-brand-green" size={18} />
                        <h3 className="font-display text-lg text-[var(--text-primary)]">Attendance Notes</h3>
                      </div>
                      <div className="mt-4 space-y-3">
                        {data.days.filter((day) => day.note).length ? (
                          data.days
                            .filter((day) => day.note)
                            .slice(-5)
                            .reverse()
                            .map((day) => (
                              <div key={day.date} className="rounded-xl bg-[var(--surface-disabled)] px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                  {new Date(`${day.date}T12:00:00.000Z`).toLocaleDateString()} · {day.status}
                                </div>
                                <p className="mt-1 text-sm text-[var(--text-secondary)]">{day.note}</p>
                              </div>
                            ))
                        ) : (
                          <p className="text-sm text-[var(--text-muted)]">No teacher notes recorded for the selected month.</p>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>
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
Write-ProjectFile -RelativePath 'app\student\attendance\page.tsx' -Content $content

# --- app/parent/attendance/page.tsx ---
$content = @'
"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import AttendanceCalendar, { type AttendanceDay } from "@/components/AttendanceCalendar";
import {
  Calendar,
  CalendarDays,
  CreditCard,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  MessageCircle,
  BellRing,
  FileWarning,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/parent/attendance", icon: CalendarDays },
  { label: "Fees", href: "/parent/fees", icon: CreditCard },
  { label: "Report Cards", href: "/parent/report-cards", icon: FileText },
  { label: "Messages", href: "/parent/messages", icon: MessageCircle },
  { label: "Events", href: "/parent/events", icon: Calendar },
];

type ParentAttendanceResponse = {
  parent: { displayName: string };
  children: Array<{
    id: string;
    studentId: string;
    displayName: string;
    className: string;
    relationship?: string | null;
    isPrimary: boolean;
  }>;
  selectedChild: {
    id: string;
    studentId: string;
    displayName: string;
    className: string;
    relationship?: string | null;
    isPrimary: boolean;
  } | null;
  month: string | null;
  monthLabel: string | null;
  year: number | null;
  days: AttendanceDay[];
  summary: {
    present: number;
    absent: number;
    late: number;
    total: number;
    attendanceRate: number;
  };
  recentAlerts: Array<{
    id: string;
    channel: string;
    status: string;
    messagePreview: string;
    createdAt: string;
  }>;
};

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export default function ParentAttendancePage() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [data, setData] = useState<ParentAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAttendance() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ month: selectedMonth });
        if (selectedStudentId) params.set("studentId", selectedStudentId);
        const response = await fetch(`/api/parent/attendance?${params.toString()}`, { cache: "no-store" });
        const body = (await response.json()) as ParentAttendanceResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load attendance records.");
        if (!active) return;
        setData(body);
        if (!selectedStudentId && body.selectedChild?.id) setSelectedStudentId(body.selectedChild.id);
      } catch (loadError) {
        if (!active) return;
        setData(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load attendance records.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAttendance();
    return () => {
      active = false;
    };
  }, [selectedMonth, selectedStudentId]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="px-6 pb-10 pt-24">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/5 bg-brand-navy p-8 shadow-xl md:p-12">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="font-display text-[42px] tracking-[3px] text-white md:text-[64px]">
                  ATTENDANCE <span className="text-brand-green">MONITOR</span>
                </h1>
                <p className="mt-3 max-w-2xl text-base text-white/60">
                  Your child&apos;s live attendance calendar, monthly trend, and queued parent alert history.
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 px-4 py-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <PortalSidebar portalName="Parent" portalType="parent" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 space-y-8">
              {loading ? (
                <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading attendance monitor...
                  </div>
                </div>
              ) : null}

              {!loading && error ? (
                <div className="rounded-[2rem] border border-brand-orange/30 bg-brand-orange/10 p-6 shadow-[var(--card-shadow)]">
                  <div className="flex items-start gap-3">
                    <FileWarning className="mt-0.5 text-brand-orange" size={20} />
                    <div>
                      <h2 className="font-display text-2xl text-[var(--text-primary)]">Parent profile not ready</h2>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{error}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {!loading && data?.children.length ? (
                <>
                  <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                    <h3 className="mb-4 font-display text-sm tracking-[2px] text-[var(--text-primary)]">My Children</h3>
                    <div className="flex flex-wrap gap-3">
                      {data.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedStudentId(child.id)}
                          className={`rounded-xl border px-5 py-4 text-left transition-all ${
                            data.selectedChild?.id === child.id
                              ? "border-brand-green/30 bg-brand-green/5"
                              : "border-[var(--border-subtle)] bg-[var(--surface-disabled)] hover:border-brand-green/20"
                          }`}
                        >
                          <div className="font-display text-base tracking-[2px] text-[var(--text-primary)]">{child.displayName}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">{child.className} · ID: {child.studentId}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <AttendanceCalendar
                        days={data.days}
                        month={data.monthLabel || "Current"}
                        year={data.year || new Date().getFullYear()}
                        title={`${data.selectedChild?.className || "Class"} — ${data.monthLabel || "Attendance"}`}
                        subtitle={`${data.selectedChild?.displayName || "Child"} · Student ID: ${data.selectedChild?.studentId || "N/A"}`}
                        viewType="parent"
                      />
                    </div>

                    <aside className="space-y-6">
                      <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                        <h3 className="mb-5 font-display text-xl text-[var(--text-primary)]">Attendance Snapshot</h3>
                        <div className="mb-4 rounded-xl bg-[var(--surface-disabled)] p-5">
                          <div className="mb-1 text-xs uppercase tracking-wider text-[var(--text-muted)]">Attendance Rate</div>
                          <div className="font-display text-4xl text-brand-green">{data.summary.attendanceRate}%</div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded-xl bg-brand-green/10 p-4 text-center">
                            <div className="font-display text-xl text-brand-green">{data.summary.present}</div>
                            <div className="text-[9px] text-[var(--text-muted)]">Present</div>
                          </div>
                          <div className="rounded-xl bg-red-500/10 p-4 text-center">
                            <div className="font-display text-xl text-red-500">{data.summary.absent}</div>
                            <div className="text-[9px] text-[var(--text-muted)]">Absent</div>
                          </div>
                          <div className="rounded-xl bg-brand-orange/10 p-4 text-center">
                            <div className="font-display text-xl text-brand-orange">{data.summary.late}</div>
                            <div className="text-[9px] text-[var(--text-muted)]">Late</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-gradient-to-br from-brand-navy to-brand-navy-light p-8 shadow-xl">
                        <div className="mb-4 flex items-center gap-2">
                          <BellRing size={16} className="text-brand-green" />
                          <h3 className="font-display text-lg tracking-[2px] text-white">Alert Queue</h3>
                        </div>
                        <div className="space-y-3">
                          {data.recentAlerts.length ? (
                            data.recentAlerts.map((alert) => (
                              <div key={alert.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-green">{alert.channel}</span>
                                  <span className="text-[10px] text-white/45">{new Date(alert.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="mt-2 text-xs leading-6 text-white/80">{alert.messagePreview}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-white/45">No attendance alert jobs recorded for this child yet.</p>
                          )}
                        </div>
                      </div>
                    </aside>
                  </div>
                </>
              ) : null}

              {!loading && data && !data.children.length ? (
                <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <p className="text-sm text-[var(--text-secondary)]">No linked child records were found for this parent account yet.</p>
                </div>
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
Write-ProjectFile -RelativePath 'app\parent\attendance\page.tsx' -Content $content

# --- app/parent/dashboard/page.tsx ---
$content = @'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import { Award, Calendar, CalendarDays, CreditCard, FileText, LayoutDashboard, LoaderCircle, MessageCircle, BellRing } from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/parent/attendance", icon: CalendarDays },
  { label: "Fees", href: "/parent/fees", icon: CreditCard },
  { label: "Report Cards", href: "/parent/report-cards", icon: FileText },
  { label: "Messages", href: "/parent/messages", icon: MessageCircle },
  { label: "Events", href: "/parent/events", icon: Calendar },
];

type ParentDashboardResponse = {
  parent: { displayName: string };
  children: Array<{
    id: string;
    studentId: string;
    displayName: string;
    className: string;
    relationship?: string | null;
    isPrimary: boolean;
  }>;
  selectedChild: {
    id: string;
    studentId: string;
    displayName: string;
    className: string;
    relationship?: string | null;
    isPrimary: boolean;
  } | null;
  attendance: {
    present: number;
    absent: number;
    late: number;
    total: number;
    attendanceRate: number;
  };
  recentAlerts: Array<{
    id: string;
    channel: string;
    status: string;
    messagePreview: string;
    createdAt: string;
  }>;
};

export default function ParentDashboardPage() {
  const [data, setData] = useState<ParentDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/parent/dashboard", { cache: "no-store" });
        const body = (await response.json()) as ParentDashboardResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load the parent dashboard.");
        if (!active) return;
        setData(body);
      } catch (dashboardError) {
        if (!active) return;
        setData(null);
        setError(dashboardError instanceof Error ? dashboardError.message : "Unable to load the parent dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="px-6 pb-10 pt-24 md:pt-32">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/5 bg-gradient-to-br from-brand-navy to-brand-navy-light p-8 shadow-xl md:p-12">
            <h1 className="font-display text-[36px] tracking-[3px] text-white md:text-[56px]">
              PARENT <span className="text-brand-green">DASHBOARD</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/60 md:text-lg">
              Live child monitoring for attendance visibility, recent alerts, and parent-ready academic access points.
            </p>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <PortalSidebar portalName="Parent" portalType="parent" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 space-y-8">
              {loading ? (
                <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading parent dashboard...
                  </div>
                </div>
              ) : null}

              {!loading && error ? (
                <div className="rounded-[2rem] border border-brand-orange/30 bg-brand-orange/10 p-6 shadow-[var(--card-shadow)] text-sm text-[var(--text-secondary)]">
                  {error}
                </div>
              ) : null}

              {!loading && data ? (
                <>
                  <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                    <h3 className="mb-4 font-display text-sm tracking-[2px] text-[var(--text-primary)]">My Children</h3>
                    <div className="flex flex-wrap gap-3">
                      {data.children.map((child) => (
                        <div key={child.id} className={`rounded-xl border px-5 py-4 ${data.selectedChild?.id === child.id ? "border-brand-green/30 bg-brand-green/5" : "border-[var(--border-subtle)] bg-[var(--surface-disabled)]"}`}>
                          <div className="font-display text-base tracking-[2px] text-[var(--text-primary)]">{child.displayName}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">{child.className} · ID: {child.studentId}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {[
                          { label: "Attendance", value: `${data.attendance.attendanceRate}%`, icon: Award },
                          { label: "Present Days", value: data.attendance.present, icon: CalendarDays },
                          { label: "Absent Days", value: data.attendance.absent, icon: CalendarDays },
                          { label: "Late Days", value: data.attendance.late, icon: CalendarDays },
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)]">
                            <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{stat.label}</div>
                            <div className="font-display text-2xl tracking-[2px] text-brand-green">{stat.value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                        <h2 className="mb-6 font-display text-xl tracking-[2px] text-[var(--text-primary)]">Quick Access</h2>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {[
                            { title: "Attendance Calendar", desc: "View daily attendance and teacher notes.", link: "/parent/attendance", icon: CalendarDays },
                            { title: "Report Cards", desc: "Download official academic reports.", link: "/parent/report-cards", icon: FileText },
                            { title: "Fees & Payments", desc: "View and pay school fees.", link: "/parent/fees", icon: CreditCard },
                            { title: "Messages", desc: "Read school and teacher updates.", link: "/parent/messages", icon: MessageCircle },
                          ].map((item) => (
                            <Link
                              key={item.title}
                              href={item.link}
                              className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-disabled)] p-5 transition-all hover:-translate-y-0.5 hover:border-brand-green/30"
                            >
                              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green transition-colors group-hover:bg-brand-green group-hover:text-white">
                                <item.icon size={20} />
                              </div>
                              <h3 className="mb-1 text-sm font-bold text-[var(--text-primary)]">{item.title}</h3>
                              <p className="text-xs text-[var(--text-muted)]">{item.desc}</p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>

                    <aside className="space-y-6">
                      <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-gradient-to-br from-brand-navy to-brand-navy-light p-8 shadow-xl">
                        <div className="mb-5 flex items-center gap-2">
                          <BellRing size={16} className="text-brand-green" />
                          <h3 className="font-display text-xl tracking-[2px] text-white">Recent Attendance Alerts</h3>
                        </div>
                        <div className="space-y-3">
                          {data.recentAlerts.length ? (
                            data.recentAlerts.map((alert) => (
                              <div key={alert.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-green">{alert.channel}</span>
                                  <span className="text-[10px] text-white/45">{new Date(alert.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="mt-2 text-xs leading-6 text-white/80">{alert.messagePreview}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-white/45">No attendance alerts have been queued for the linked child yet.</p>
                          )}
                        </div>
                      </div>
                    </aside>
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
Write-ProjectFile -RelativePath 'app\parent\dashboard\page.tsx' -Content $content

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
  MessageSquareWarning,
  Save,
  Send,
  UserCheck,
  X,
} from "lucide-react";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

type AttendanceRow = {
  studentProfileId: string;
  studentId: string;
  displayName: string;
  guardianName: string | null;
  guardianPhone: string | null;
  status: AttendanceStatus;
  note: string;
};

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
    correctionRequest: {
      id: string;
      status: string;
      reason: string;
      resolutionNote: string | null;
      createdAt: string;
      reviewedAt: string | null;
    } | null;
  } | null;
  roster: AttendanceRow[];
  summary: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
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
  const [correctionReason, setCorrectionReason] = useState("");
  const [requestingCorrection, setRequestingCorrection] = useState(false);

  const stats = useMemo(() => summarize(rows), [rows]);
  const isLocked = Boolean(register?.session?.isLocked);
  const correctionRequest = register?.session?.correctionRequest || null;
  const notificationPreview = stats.absent + stats.late;

  async function loadRegister(params?: { classId?: string; date?: string }) {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ date: params?.date || selectedDate });
      if (params?.classId || selectedClassId) query.set("classId", params?.classId || selectedClassId);
      const response = await fetch(`/api/teacher/attendance/register?${query.toString()}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as RegisterResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load the attendance register.");

      setRegister(body);
      setRows(body.roster);
      setNotes(body.session?.notes || "");
      setCorrectionReason("");

      if ((!selectedClassId || params?.classId) && body.selectedClass?.id) {
        setSelectedClassId(body.selectedClass.id);
      }
    } catch (loadError) {
      setRegister(null);
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load the attendance register.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRegister();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setRows((current) => current.map((row) => (row.studentProfileId === studentProfileId ? { ...row, note } : row)));
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
        notificationPreview?: { absent: number; late: number; queuedParentAlerts: number };
      };
      if (!response.ok) throw new Error(body.error || "Unable to save attendance.");

      if (finalize) {
        toast(
          body.notificationPreview?.queuedParentAlerts
            ? `Attendance submitted. ${body.notificationPreview.queuedParentAlerts} alert job(s) queued.`
            : "Attendance submitted and locked successfully.",
          "success"
        );
      } else {
        toast("Attendance draft saved successfully.", "success");
      }

      await loadRegister({ classId: register.selectedClass.id, date: selectedDate });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save attendance.");
      toast("Attendance could not be saved.", "error");
    } finally {
      setSavingMode(null);
    }
  }

  async function requestCorrection() {
    if (!register?.session?.id) return;
    setRequestingCorrection(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/attendance/correction-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: register.session.id,
          reason: correctionReason,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to create correction request.");
      toast("Correction request submitted for admin review.", "success");
      await loadRegister({ classId: register.selectedClass?.id || undefined, date: selectedDate });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create correction request.");
      toast("Correction request failed.", "error");
    } finally {
      setRequestingCorrection(false);
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
              {register?.selectedClass ? <span className="text-xs text-white/45">{register.selectedClass.displayName}</span> : null}
            </div>
            <h1 className="font-display text-4xl tracking-widest text-white md:text-5xl">
              ATTENDANCE <span className="text-brand-orange">REGISTER</span>
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-white/65">
              Live class attendance register backed by the database. Save progress while marking or submit to lock the register and queue parent attendance alerts.
            </p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <TeacherSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-[var(--card-shadow)]">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Assigned class</label>
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
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Session date</label>
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
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-widest ${isLocked ? "bg-brand-green/15 text-brand-green" : "bg-brand-orange/15 text-brand-orange"}`}>
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
                <div className="rounded-2xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-500">{error}</div>
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
                      { label: "Attendance rate", value: stats.total ? `${Math.round((stats.present / stats.total) * 100)}%` : "0%", icon: Calendar, color: "text-brand-green", bg: "bg-brand-green/10" },
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
                    <span className="text-xs text-[var(--text-muted)]">{stats.total} active student{stats.total === 1 ? "" : "s"} in the selected class</span>
                    {register.session?.submittedAt ? <span className="text-xs text-brand-green">Submitted: {new Date(register.session.submittedAt).toLocaleString()}</span> : null}
                  </div>

                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--card-shadow)]">
                    <div className="border-b border-[var(--border-subtle)] px-6 py-4">
                      <h2 className="font-display text-xl text-[var(--text-primary)]">{register.selectedClass?.displayName} · Daily register</h2>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Period key: {register.session?.periodKey || "DAILY_REGISTER"}</p>
                    </div>

                    <div className="divide-y divide-[var(--border-subtle)]">
                      {rows.map((row) => (
                        <div key={row.studentProfileId} className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-[var(--text-primary)]">{row.displayName}</div>
                            <div className="text-[11px] text-[var(--text-muted)]">{row.studentId}</div>
                            {row.guardianPhone ? <div className="mt-1 text-[11px] text-[var(--text-muted)]">Guardian: {row.guardianName || "Linked parent"} · {row.guardianPhone}</div> : null}
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
                            <div className="w-full rounded-xl bg-[var(--surface-disabled)] px-4 py-2.5 text-sm text-[var(--text-secondary)] lg:w-72">{row.note}</div>
                          ) : null}

                          <div className="flex gap-2">
                            {STATUS_BUTTONS.map((button) => {
                              const active = row.status === button.value;
                              return (
                                <button
                                  key={button.value}
                                  onClick={() => updateStatus(row.studentProfileId, button.value)}
                                  disabled={isLocked || Boolean(savingMode)}
                                  className={`h-11 w-11 rounded-xl text-xs font-bold transition-all ${active ? button.accent : "bg-[var(--surface-disabled)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]"} disabled:cursor-not-allowed disabled:opacity-50`}
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
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Register note</label>
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
                          When submitted, this session becomes locked. Alert jobs can be queued for
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
                        {savingMode === "draft" ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />} Save draft
                      </button>
                      <button
                        onClick={() => void saveRegister(true)}
                        disabled={isLocked || Boolean(savingMode) || !rows.length}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green px-6 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingMode === "submit" ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />} Submit & lock
                      </button>
                    </div>
                  </div>

                  {isLocked ? (
                    <div className="rounded-2xl border border-brand-orange/20 bg-brand-orange/10 p-5">
                      <div className="flex items-start gap-3">
                        <MessageSquareWarning className="mt-0.5 shrink-0 text-brand-orange" size={18} />
                        <div className="flex-1">
                          <h3 className="font-display text-xl text-[var(--text-primary)]">Locked register correction workflow</h3>
                          {correctionRequest ? (
                            <div className="mt-3 space-y-3 text-sm text-[var(--text-secondary)]">
                              <div>
                                <span className="font-semibold text-brand-green">Current request status:</span> {correctionRequest.status.replaceAll("_", " ")}
                              </div>
                              <div>
                                <span className="font-semibold">Reason:</span> {correctionRequest.reason}
                              </div>
                              {correctionRequest.resolutionNote ? (
                                <div>
                                  <span className="font-semibold">Admin note:</span> {correctionRequest.resolutionNote}
                                </div>
                              ) : null}
                              <div className="text-xs text-[var(--text-muted)]">Requested on {new Date(correctionRequest.createdAt).toLocaleString()}</div>
                            </div>
                          ) : (
                            <div className="mt-3 space-y-3">
                              <p className="text-sm text-[var(--text-secondary)]">If a locked attendance session needs an update, submit a correction request for admin approval.</p>
                              <textarea
                                value={correctionReason}
                                onChange={(event) => setCorrectionReason(event.target.value)}
                                placeholder="Explain what needs to be corrected and why."
                                className="min-h-24 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--input-text)] outline-none focus:border-[var(--input-border-focus)]"
                                disabled={requestingCorrection}
                              />
                              <button
                                onClick={() => void requestCorrection()}
                                disabled={requestingCorrection || correctionReason.trim().length < 10}
                                className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-5 py-3 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {requestingCorrection ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />} Request correction
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
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

# --- app/admin/attendance-corrections/page.tsx ---
$content = @'
"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminSidebar from "@/components/AdminSidebar";
import { CheckCircle2, LoaderCircle, ShieldAlert, XCircle } from "lucide-react";

type CorrectionRequest = {
  id: string;
  reason: string;
  status: string;
  resolutionNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  attendanceSession: {
    id: string;
    sessionDate: string;
    periodKey: string;
    isLocked: boolean;
    classroom: { displayName: string };
  };
  teacherProfile: { displayName: string };
  requestedBy: { name: string; email: string };
  reviewedBy: { name: string } | null;
};

export default function AdminAttendanceCorrectionsPage() {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [selected, setSelected] = useState<CorrectionRequest | null>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [resolutionNote, setResolutionNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRequests() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/attendance/corrections", { cache: "no-store" });
      const body = (await response.json()) as { requests?: CorrectionRequest[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load correction requests.");
      setRequests(body.requests || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load correction requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  async function submitDecision() {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/attendance/corrections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selected.id,
          decision,
          resolutionNote,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to update the correction request.");
      setSelected(null);
      setResolutionNote("");
      setMessage(decision === "APPROVED" ? "Correction request approved and session unlocked." : "Correction request rejected.");
      await loadRequests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update the correction request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pb-10 pt-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-green">
              <ShieldAlert size={12} /> Admin attendance workflow
            </div>
            <h1 className="font-display text-4xl tracking-widest text-white md:text-5xl">
              ATTENDANCE <span className="text-brand-green">CORRECTIONS</span>
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-white/65">
              Review teacher requests to unlock submitted attendance sessions for correction and resubmission.
            </p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <AdminSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {message ? (
                <div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 p-4 text-sm text-[var(--text-secondary)]">{message}</div>
              ) : null}

              {loading ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading correction requests...
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--card-shadow)]">
                  <div className="border-b border-[var(--border-subtle)] px-6 py-4">
                    <h2 className="font-display text-xl text-[var(--text-primary)]">Correction queue</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--surface-disabled)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                        <tr>
                          <th className="px-6 py-3">Class</th>
                          <th className="px-6 py-3">Teacher</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((request) => (
                          <tr key={request.id} className="border-t border-[var(--border-subtle)]">
                            <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{request.attendanceSession.classroom.displayName}</td>
                            <td className="px-6 py-4 text-[var(--text-secondary)]">{request.teacherProfile.displayName}</td>
                            <td className="px-6 py-4 text-[var(--text-secondary)]">{new Date(request.attendanceSession.sessionDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${request.status === "PENDING" ? "bg-brand-orange/15 text-brand-orange" : request.status === "APPROVED" ? "bg-brand-green/15 text-brand-green" : "bg-red-500/15 text-red-500"}`}>
                                {request.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => {
                                  setSelected(request);
                                  setDecision(request.status === "REJECTED" ? "REJECTED" : "APPROVED");
                                  setResolutionNote(request.resolutionNote || "");
                                }}
                                className="font-bold text-brand-green"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!requests.length ? <div className="px-6 py-10 text-center text-sm text-[var(--text-muted)]">No attendance correction requests found.</div> : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {selected ? (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-5">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-widest text-brand-green">ATTENDANCE CORRECTION REVIEW</p>
                <h2 className="mt-2 font-display text-3xl text-brand-navy">{selected.attendanceSession.classroom.displayName}</h2>
                <p className="mt-1 text-sm text-slate-500">{selected.teacherProfile.displayName} · {new Date(selected.attendanceSession.sessionDate).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-800">
                <XCircle size={22} />
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
              <p><strong>Requested by:</strong> {selected.requestedBy.name} ({selected.requestedBy.email})</p>
              <p className="mt-3"><strong>Reason:</strong> {selected.reason}</p>
              {selected.resolutionNote ? <p className="mt-3"><strong>Current admin note:</strong> {selected.resolutionNote}</p> : null}
            </div>

            <label className="mt-6 block text-xs font-bold uppercase tracking-widest text-slate-700">Decision</label>
            <select value={decision} onChange={(event) => setDecision(event.target.value as "APPROVED" | "REJECTED")} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm">
              <option value="APPROVED">Approve and unlock session</option>
              <option value="REJECTED">Reject request</option>
            </select>

            <label className="mt-5 block text-xs font-bold uppercase tracking-widest text-slate-700">Resolution note</label>
            <textarea value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3 text-sm" />

            <div className="mt-6 flex gap-3">
              <button onClick={() => setSelected(null)} className="flex-1 rounded-full border border-slate-300 px-5 py-3 text-sm font-bold uppercase tracking-widest text-slate-700">Cancel</button>
              <button onClick={() => void submitDecision()} disabled={saving} className="flex-1 rounded-full bg-brand-green px-5 py-3 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-50">
                {saving ? <span className="inline-flex items-center gap-2"><LoaderCircle className="animate-spin" size={16} /> Saving</span> : <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} /> Save Decision</span>}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
'@
Write-ProjectFile -RelativePath 'app\admin\attendance-corrections\page.tsx' -Content $content

# --- components/AdminSidebar.tsx ---
$content = @'
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, Eye, ChevronDown, ShieldCheck, GraduationCap, User, Users,
  LayoutGrid, LogOut, LayoutDashboard, CreditCard, FileText, ClipboardCheck,
  UserCheck, IdCard, BarChart3, Settings, BookOpen, Trash2,
  School, Shield, Lock, Send, UserPlus, HelpCircle
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useToast } from "./Toast";
import Image from "next/image";

const PORTAL_SWITCHER = [
  { label: "Admin Portal", href: "/admin", icon: ShieldCheck, type: "admin" },
  { label: "Teacher Portal", href: "/teacher/dashboard", icon: GraduationCap, type: "teacher" },
  { label: "Student Portal", href: "/student/dashboard", icon: User, type: "student" },
  { label: "Parent Portal", href: "/parent/dashboard", icon: Users, type: "parent" },
];

const ADMIN_NAV = [
  { label: "Admin Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Finances", href: "/admin/finances", icon: CreditCard, badge: "New" },
  { label: "View Questions", href: "/admin/questions", icon: HelpCircle },
  { label: "Mark Presence", href: "/admin/mark-presence", icon: UserCheck },
  { label: "Generate ID Cards", href: "/admin/id-cards", icon: IdCard },
  { label: "View Admin Attendance", href: "/admin/admin-attendance", icon: ClipboardCheck },
  { label: "Academic Overview", href: "/admin/academic-overview", icon: BarChart3 },
  { label: "View Student Attendance", href: "/admin/student-attendance", icon: Users },
  { label: "Attendance Corrections", href: "/admin/attendance-corrections", icon: ClipboardCheck, badge: "Live" },
  { label: "View Student Information", href: "/admin/students", icon: BookOpen },
  { label: "Fee Management", href: "/admin/fees", icon: CreditCard },
  { label: "Report Cards", href: "/admin/report-cards", icon: FileText },
  { label: "Gradebook Lock", href: "/admin/gradebook-lock", icon: Lock },
  { label: "Staff Assignments", href: "/admin/staff-assignments", icon: UserPlus },
  { label: "Broadcasts", href: "/admin/broadcasts", icon: Send },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false);
    };
    if (switcherOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [switcherOpen]);

  return (
    <aside className="lg:w-[280px] shrink-0">
      <div className="sticky top-24 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4">
        {/* Portal Switcher */}
        <div ref={switcherRef} className="relative">
          <button onClick={() => setSwitcherOpen(!switcherOpen)}
            className="w-full p-4 rounded-2xl bg-brand-navy border border-white/10 hover:border-brand-green/50 transition-all flex items-center justify-between">
            <div className="text-left">
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand-green block">Active Portal</span>
              <span className="font-display text-sm text-white tracking-[1px]">Administration</span>
            </div>
            <ChevronDown size={16} className={`text-white/60 transition-transform ${switcherOpen ? "rotate-180" : ""}`} />
          </button>
          {switcherOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ zIndex: 100, backgroundColor: "#0C1824" }}>
              <div className="p-3 border-b border-white/10 flex items-center gap-2"><LayoutGrid size={12} className="text-white/60" /><span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Switch Portal</span></div>
              {PORTAL_SWITCHER.map(p => (
                <Link key={p.type} href={p.href} onClick={() => setSwitcherOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm ${p.type === "admin" ? "bg-brand-green/20 text-brand-green" : "text-white/80 hover:bg-white/5 hover:text-brand-green"}`}>
                  <p.icon size={16} /><span className="font-medium">{p.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Admin Profile */}
        <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-2">
            <Image src="/ykay-logo.png" alt="Ykay" width={40} height={40} className="w-10 h-10 rounded-xl object-contain bg-white p-1" />
            <div>
              <div className="text-sm font-bold text-[var(--text-primary)]">{user?.name || "Administrator"}</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-green" /><span className="text-[10px] text-brand-green font-bold">ADMIN</span></div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-orange/10 border border-brand-orange/30">
          <Eye size={14} className="text-brand-orange" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">Demo Mode</span>
        </div>

        {/* Admin Tools Label */}
        <div className="flex items-center gap-2 px-4">
          <Settings size={14} className="text-brand-green" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-green">Admin Tools</span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {ADMIN_NAV.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive ? "bg-brand-green/10 text-brand-green border border-brand-green/20"
                           : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-disabled)] border border-transparent"
                }`}>
                <item.icon size={16} />
                <span className="tracking-wide flex-1">{item.label}</span>
                {item.badge && <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-green text-white font-bold">{item.badge}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1">
          <Link href="/portal" className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-muted)] hover:text-brand-green transition-colors rounded-lg">
            <ArrowLeft size={14} /><span>Portal Hub</span>
          </Link>
          <button onClick={() => { toast("Logged out", "info"); logout(); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors rounded-lg">
            <LogOut size={14} /><span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
'@
Write-ProjectFile -RelativePath 'components\AdminSidebar.tsx' -Content $content

Write-Host "Phase 3B Attendance Portals files applied successfully." -ForegroundColor Cyan