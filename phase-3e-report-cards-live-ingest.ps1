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

Write-Host "Applying Phase 3E Report Cards Live files..." -ForegroundColor Cyan

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

enum FeeInvoiceStatus {
  UNPAID
  PARTIAL
  PAID
  OVERDUE
}

enum FeePaymentMethod {
  PAYSTACK
  BANK_TRANSFER
  CASH
  CARD
  USSD
}

enum FeePaymentStatus {
  COMPLETED
  FAILED
  REFUNDED
}

enum ReportCardStatus {
  DRAFT
  RELEASED
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
  feeInvoices             FeeInvoice[]
  feePayments             FeePayment[]
  reportCards             ReportCard[]
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
  feeInvoices     FeeInvoice[]
  feePayments     FeePayment[]
  reportCards     ReportCard[]

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
  feeInvoices      FeeInvoice[]
  feePayments      FeePayment[]
  reportCards      ReportCard[]

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

model FeeInvoice {
  id              String           @id @default(cuid())
  schoolId        String
  studentProfileId String
  parentProfileId String?
  invoiceNumber   String           @unique
  title           String
  termLabel       String
  status          FeeInvoiceStatus @default(UNPAID)
  totalAmount     Int
  amountPaid      Int              @default(0)
  balanceDue      Int
  dueDate         DateTime?
  issuedAt        DateTime         @default(now())
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  school          School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  studentProfile  StudentProfile   @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
  parentProfile   ParentProfile?   @relation(fields: [parentProfileId], references: [id], onDelete: SetNull)
  items           FeeInvoiceItem[]
  payments        FeePayment[]

  @@index([schoolId, status, dueDate])
  @@index([studentProfileId, issuedAt])
  @@index([parentProfileId, issuedAt])
}

model FeeInvoiceItem {
  id         String     @id @default(cuid())
  invoiceId  String
  label      String
  amount     Int
  mandatory  Boolean    @default(true)
  sortOrder  Int        @default(0)
  createdAt  DateTime   @default(now())

  invoice    FeeInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@index([invoiceId, sortOrder])
}

model FeePayment {
  id              String            @id @default(cuid())
  schoolId        String
  invoiceId       String
  studentProfileId String
  parentProfileId String?
  amount          Int
  method          FeePaymentMethod
  status          FeePaymentStatus  @default(COMPLETED)
  reference       String            @unique
  receiptNumber   String            @unique
  providerData    Json?
  paidAt          DateTime          @default(now())
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  school          School            @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  invoice         FeeInvoice        @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  studentProfile  StudentProfile    @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
  parentProfile   ParentProfile?    @relation(fields: [parentProfileId], references: [id], onDelete: SetNull)

  @@index([schoolId, paidAt])
  @@index([invoiceId, paidAt])
  @@index([parentProfileId, paidAt])
}

model ReportCard {
  id                 String           @id @default(cuid())
  schoolId           String
  studentProfileId   String
  parentProfileId    String?
  reportNumber       String           @unique
  sessionLabel       String
  termLabel          String
  classNameSnapshot  String
  status             ReportCardStatus @default(DRAFT)
  overallTotal       Int
  overallAverage     Int
  overallGrade       String
  classPosition      String?
  attendancePresent  Int
  attendanceTotal    Int
  classTeacherRemark String
  directorRemark     String
  nextResumption     String
  feeBalance         Int              @default(0)
  generatedAt        DateTime         @default(now())
  releasedAt         DateTime?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  school             School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  studentProfile     StudentProfile   @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
  parentProfile      ParentProfile?   @relation(fields: [parentProfileId], references: [id], onDelete: SetNull)
  subjects           ReportCardSubject[]

  @@index([schoolId, status, generatedAt])
  @@index([studentProfileId, generatedAt])
  @@index([parentProfileId, generatedAt])
}

model ReportCardSubject {
  id           String     @id @default(cuid())
  reportCardId String
  subject      String
  ca1          Int
  ca2          Int
  midterm      Int
  assignment   Int
  exam         Int
  total        Int
  grade        String
  sortOrder    Int        @default(0)
  createdAt    DateTime   @default(now())

  reportCard   ReportCard  @relation(fields: [reportCardId], references: [id], onDelete: Cascade)

  @@index([reportCardId, sortOrder])
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

# --- prisma/migrations/20260723190000_phase_3e_report_cards_live/migration.sql ---
$content = @'
-- CreateEnum
CREATE TYPE "public"."ReportCardStatus" AS ENUM ('DRAFT', 'RELEASED');

-- CreateTable
CREATE TABLE "public"."ReportCard" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "parentProfileId" TEXT,
    "reportNumber" TEXT NOT NULL,
    "sessionLabel" TEXT NOT NULL,
    "termLabel" TEXT NOT NULL,
    "classNameSnapshot" TEXT NOT NULL,
    "status" "public"."ReportCardStatus" NOT NULL DEFAULT 'DRAFT',
    "overallTotal" INTEGER NOT NULL,
    "overallAverage" INTEGER NOT NULL,
    "overallGrade" TEXT NOT NULL,
    "classPosition" TEXT,
    "attendancePresent" INTEGER NOT NULL,
    "attendanceTotal" INTEGER NOT NULL,
    "classTeacherRemark" TEXT NOT NULL,
    "directorRemark" TEXT NOT NULL,
    "nextResumption" TEXT NOT NULL,
    "feeBalance" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReportCardSubject" (
    "id" TEXT NOT NULL,
    "reportCardId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "ca1" INTEGER NOT NULL,
    "ca2" INTEGER NOT NULL,
    "midterm" INTEGER NOT NULL,
    "assignment" INTEGER NOT NULL,
    "exam" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportCardSubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportCard_reportNumber_key" ON "public"."ReportCard"("reportNumber");
CREATE INDEX "ReportCard_schoolId_status_generatedAt_idx" ON "public"."ReportCard"("schoolId", "status", "generatedAt");
CREATE INDEX "ReportCard_studentProfileId_generatedAt_idx" ON "public"."ReportCard"("studentProfileId", "generatedAt");
CREATE INDEX "ReportCard_parentProfileId_generatedAt_idx" ON "public"."ReportCard"("parentProfileId", "generatedAt");
CREATE INDEX "ReportCardSubject_reportCardId_sortOrder_idx" ON "public"."ReportCardSubject"("reportCardId", "sortOrder");

-- AddForeignKey
ALTER TABLE "public"."ReportCard" ADD CONSTRAINT "ReportCard_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ReportCard" ADD CONSTRAINT "ReportCard_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ReportCard" ADD CONSTRAINT "ReportCard_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "public"."ParentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."ReportCardSubject" ADD CONSTRAINT "ReportCardSubject_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "public"."ReportCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
'@
Write-ProjectFile -RelativePath 'prisma\migrations\20260723190000_phase_3e_report_cards_live\migration.sql' -Content $content

# --- lib/report-cards.ts ---
$content = @'
import { ReportCardStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function getStudentReportCardContext() {
  const user = await requireRole([UserRole.STUDENT]);
  if (!user) return null;

  const studentProfile = await prisma.studentProfile.findFirst({
    where: {
      schoolId: user.schoolId,
      userId: user.id,
      isActive: true,
    },
    select: {
      id: true,
      studentId: true,
      displayName: true,
      currentClass: { select: { displayName: true } },
      reportCards: {
        orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }],
        include: {
          subjects: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!studentProfile) return null;
  return { user, studentProfile };
}

export async function getParentReportCardContext() {
  const user = await requireRole([UserRole.PARENT]);
  if (!user) return null;

  const parentProfile = await prisma.parentProfile.findFirst({
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
          isPrimary: true,
          relationship: true,
          studentProfile: {
            select: {
              id: true,
              studentId: true,
              displayName: true,
              currentClass: { select: { displayName: true } },
              reportCards: {
                orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }],
                include: { subjects: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
        },
      },
    },
  });

  if (!parentProfile) return null;
  return { user, parentProfile };
}

export async function getAdminReportCardContext() {
  const user = await requireRole([UserRole.ADMIN, UserRole.DIRECTOR, UserRole.COORDINATOR]);
  if (!user) return null;
  return { user };
}

export function reportStatusLabel(status: ReportCardStatus) {
  return status === ReportCardStatus.RELEASED ? "Released" : "Draft";
}

export function mapReportCardCard(reportCard: {
  id: string;
  reportNumber: string;
  sessionLabel: string;
  termLabel: string;
  status: ReportCardStatus;
  overallAverage: number;
  overallGrade: string;
  generatedAt: Date;
  releasedAt: Date | null;
}) {
  return {
    id: reportCard.id,
    reportNumber: reportCard.reportNumber,
    sessionLabel: reportCard.sessionLabel,
    termLabel: reportCard.termLabel,
    status: reportCard.status,
    statusLabel: reportStatusLabel(reportCard.status),
    overallAverage: reportCard.overallAverage,
    overallGrade: reportCard.overallGrade,
    generatedAt: reportCard.generatedAt.toISOString(),
    releasedAt: reportCard.releasedAt?.toISOString() || null,
  };
}
'@
Write-ProjectFile -RelativePath 'lib\report-cards.ts' -Content $content

# --- components/LiveReportCardPreview.tsx ---
$content = @'
type SubjectRow = {
  id?: string;
  subject: string;
  ca1: number;
  ca2: number;
  midterm: number;
  assignment: number;
  exam: number;
  total: number;
  grade: string;
};

type PreviewProps = {
  reportNumber: string;
  studentName: string;
  studentClass: string;
  studentId: string;
  sessionLabel: string;
  termLabel: string;
  overallTotal: number;
  overallAverage: number;
  overallGrade: string;
  classPosition?: string | null;
  attendancePresent: number;
  attendanceTotal: number;
  classTeacherRemark: string;
  directorRemark: string;
  nextResumption: string;
  feeBalance: number;
  subjects: SubjectRow[];
};

export default function LiveReportCardPreview({
  reportNumber,
  studentName,
  studentClass,
  studentId,
  sessionLabel,
  termLabel,
  overallTotal,
  overallAverage,
  overallGrade,
  classPosition,
  attendancePresent,
  attendanceTotal,
  classTeacherRemark,
  directorRemark,
  nextResumption,
  feeBalance,
  subjects,
}: PreviewProps) {
  const attendanceRate = attendanceTotal ? Math.round((attendancePresent / attendanceTotal) * 100) : 0;

  return (
    <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--card-shadow)] overflow-hidden print:shadow-none print:border-none">
      <div className="bg-brand-navy px-8 py-10 text-white">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green">Official Report Card</div>
            <h2 className="mt-3 font-display text-4xl tracking-[0.12em]">YKAY COLLEGE</h2>
            <p className="mt-2 text-sm text-white/60">{sessionLabel} · {termLabel} · {reportNumber}</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Overall Performance</div>
            <div className="mt-2 font-display text-5xl text-brand-green">{overallAverage}%</div>
            <div className="mt-1 text-sm font-bold uppercase tracking-[0.18em] text-white">{overallGrade}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-8 py-8 md:grid-cols-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Student</div>
          <div className="mt-2 font-display text-2xl text-[var(--text-primary)]">{studentName}</div>
          <div className="mt-1 text-sm text-[var(--text-secondary)]">{studentClass}</div>
          <div className="text-xs text-[var(--text-muted)]">{studentId}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Academic Summary</div>
          <div className="mt-2 text-sm text-[var(--text-secondary)]">Subjects: {subjects.length}</div>
          <div className="text-sm text-[var(--text-secondary)]">Total Score: {overallTotal}</div>
          <div className="text-sm text-[var(--text-secondary)]">Position: {classPosition || "—"}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Attendance</div>
          <div className="mt-2 font-display text-3xl text-brand-green">{attendanceRate}%</div>
          <div className="text-sm text-[var(--text-secondary)]">{attendancePresent} / {attendanceTotal} days present</div>
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-disabled)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-center">CA1</th>
                <th className="px-4 py-3 text-center">CA2</th>
                <th className="px-4 py-3 text-center">Midterm</th>
                <th className="px-4 py-3 text-center">Assignment</th>
                <th className="px-4 py-3 text-center">Exam</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-center">Grade</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.id || subject.subject} className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{subject.subject}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{subject.ca1}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{subject.ca2}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{subject.midterm}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{subject.assignment}</td>
                  <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{subject.exam}</td>
                  <td className="px-4 py-3 text-center font-bold text-brand-green">{subject.total}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${subject.total >= 70 ? "bg-brand-green/15 text-brand-green" : subject.total >= 45 ? "bg-brand-orange/15 text-brand-orange" : "bg-red-500/15 text-red-500"}`}>
                      {subject.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 border-t border-[var(--border-subtle)] px-8 py-8 lg:grid-cols-[1fr_1fr_0.8fr]">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Class Teacher Remark</div>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{classTeacherRemark}</p>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Director Remark</div>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{directorRemark}</p>
        </div>
        <div className="rounded-2xl bg-[var(--surface-disabled)] p-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Next Term</div>
          <div className="mt-2 font-display text-2xl text-[var(--text-primary)]">{nextResumption}</div>
          <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Fee Balance</div>
          <div className={`mt-2 font-display text-2xl ${feeBalance > 0 ? "text-brand-orange" : "text-brand-green"}`}>
            {feeBalance > 0 ? `₦${feeBalance.toLocaleString()}` : "Fully Paid"}
          </div>
        </div>
      </div>
    </div>
  );
}
'@
Write-ProjectFile -RelativePath 'components\LiveReportCardPreview.tsx' -Content $content

# --- app/api/student/report-cards/route.ts ---
$content = @'
import { jsonNoStore } from "@/lib/requests";
import { getStudentReportCardContext, mapReportCardCard } from "@/lib/report-cards";

export const runtime = "nodejs";

export async function GET() {
  const context = await getStudentReportCardContext();
  if (!context) {
    return jsonNoStore({ error: "No live student report-card profile is linked to this account yet." }, { status: 404 });
  }

  const reports = context.studentProfile.reportCards.map((report) => ({
    ...mapReportCardCard(report),
    classNameSnapshot: report.classNameSnapshot,
    overallTotal: report.overallTotal,
    classPosition: report.classPosition,
    attendancePresent: report.attendancePresent,
    attendanceTotal: report.attendanceTotal,
    classTeacherRemark: report.classTeacherRemark,
    directorRemark: report.directorRemark,
    nextResumption: report.nextResumption,
    feeBalance: report.feeBalance,
    subjects: report.subjects,
  }));

  return jsonNoStore({
    student: {
      id: context.studentProfile.studentId,
      displayName: context.studentProfile.displayName,
      className: context.studentProfile.currentClass.displayName,
    },
    reports,
  });
}
'@
Write-ProjectFile -RelativePath 'app\api\student\report-cards\route.ts' -Content $content

# --- app/api/parent/report-cards/route.ts ---
$content = @'
import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/requests";
import { getParentReportCardContext, mapReportCardCard } from "@/lib/report-cards";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const context = await getParentReportCardContext();
  if (!context) {
    return jsonNoStore({ error: "No live parent report-card profile is linked to this account yet." }, { status: 404 });
  }

  const children = context.parentProfile.studentLinks.map((link) => ({
    id: link.studentProfile.id,
    studentId: link.studentProfile.studentId,
    displayName: link.studentProfile.displayName,
    className: link.studentProfile.currentClass.displayName,
    relationship: link.relationship,
    isPrimary: link.isPrimary,
  }));

  if (!children.length) {
    return jsonNoStore({
      parent: { displayName: context.parentProfile.displayName },
      children: [],
      selectedChild: null,
      reports: [],
    });
  }

  const selectedId = request.nextUrl.searchParams.get("studentId")?.trim();
  const selectedLink =
    context.parentProfile.studentLinks.find((link) => link.studentProfile.id === selectedId) ||
    context.parentProfile.studentLinks[0];

  return jsonNoStore({
    parent: { displayName: context.parentProfile.displayName },
    children,
    selectedChild: {
      id: selectedLink.studentProfile.id,
      studentId: selectedLink.studentProfile.studentId,
      displayName: selectedLink.studentProfile.displayName,
      className: selectedLink.studentProfile.currentClass.displayName,
      relationship: selectedLink.relationship,
      isPrimary: selectedLink.isPrimary,
    },
    reports: selectedLink.studentProfile.reportCards.map((report) => ({
      ...mapReportCardCard(report),
      classNameSnapshot: report.classNameSnapshot,
      overallTotal: report.overallTotal,
      classPosition: report.classPosition,
      attendancePresent: report.attendancePresent,
      attendanceTotal: report.attendanceTotal,
      classTeacherRemark: report.classTeacherRemark,
      directorRemark: report.directorRemark,
      nextResumption: report.nextResumption,
      feeBalance: report.feeBalance,
      subjects: report.subjects,
    })),
  });
}
'@
Write-ProjectFile -RelativePath 'app\api\parent\report-cards\route.ts' -Content $content

# --- app/api/admin/report-cards/overview/route.ts ---
$content = @'
import { ReportCardStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { requireRole } from "@/lib/session";

const allowedRoles = [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.COORDINATOR];
const updateSchema = z.object({
  reportCardId: z.string().trim().min(1),
  status: z.nativeEnum(ReportCardStatus),
});

export async function GET() {
  const user = await requireRole(allowedRoles);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reports = await prisma.reportCard.findMany({
    where: { schoolId: user.schoolId },
    orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }],
    include: {
      studentProfile: { include: { currentClass: true } },
      subjects: { orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json({
    summary: {
      totalReports: reports.length,
      releasedReports: reports.filter((report) => report.status === ReportCardStatus.RELEASED).length,
      draftReports: reports.filter((report) => report.status === ReportCardStatus.DRAFT).length,
      averageScore: reports.length
        ? Math.round(reports.reduce((sum, report) => sum + report.overallAverage, 0) / reports.length)
        : 0,
    },
    reports: reports.map((report) => ({
      id: report.id,
      reportNumber: report.reportNumber,
      sessionLabel: report.sessionLabel,
      termLabel: report.termLabel,
      classNameSnapshot: report.classNameSnapshot,
      status: report.status,
      overallTotal: report.overallTotal,
      overallAverage: report.overallAverage,
      overallGrade: report.overallGrade,
      classPosition: report.classPosition,
      attendancePresent: report.attendancePresent,
      attendanceTotal: report.attendanceTotal,
      classTeacherRemark: report.classTeacherRemark,
      directorRemark: report.directorRemark,
      nextResumption: report.nextResumption,
      feeBalance: report.feeBalance,
      generatedAt: report.generatedAt.toISOString(),
      releasedAt: report.releasedAt?.toISOString() || null,
      student: {
        studentId: report.studentProfile.studentId,
        displayName: report.studentProfile.displayName,
        className: report.studentProfile.currentClass.displayName,
      },
      subjects: report.subjects,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const user = await requireRole(allowedRoles);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const payload = updateSchema.parse(await request.json());
    const ipAddress = getClientIp(request);
    const updated = await prisma.$transaction(async (tx) => {
      const report = await tx.reportCard.update({
        where: { id: payload.reportCardId },
        data: {
          status: payload.status,
          releasedAt: payload.status === ReportCardStatus.RELEASED ? new Date() : null,
        },
        include: {
          studentProfile: { include: { currentClass: true } },
          subjects: { orderBy: { sortOrder: "asc" } },
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: user.schoolId,
          actorUserId: user.id,
          action: payload.status === ReportCardStatus.RELEASED ? "REPORT_CARD_RELEASED" : "REPORT_CARD_REVERTED_TO_DRAFT",
          entityType: "ReportCard",
          entityId: report.id,
          ipAddress,
          metadata: {
            reportNumber: report.reportNumber,
            studentId: report.studentProfile.studentId,
          },
        },
      });

      return report;
    });

    return NextResponse.json({
      report: {
        id: updated.id,
        reportNumber: updated.reportNumber,
        sessionLabel: updated.sessionLabel,
        termLabel: updated.termLabel,
        classNameSnapshot: updated.classNameSnapshot,
        status: updated.status,
        overallTotal: updated.overallTotal,
        overallAverage: updated.overallAverage,
        overallGrade: updated.overallGrade,
        classPosition: updated.classPosition,
        attendancePresent: updated.attendancePresent,
        attendanceTotal: updated.attendanceTotal,
        classTeacherRemark: updated.classTeacherRemark,
        directorRemark: updated.directorRemark,
        nextResumption: updated.nextResumption,
        feeBalance: updated.feeBalance,
        generatedAt: updated.generatedAt.toISOString(),
        releasedAt: updated.releasedAt?.toISOString() || null,
        student: {
          studentId: updated.studentProfile.studentId,
          displayName: updated.studentProfile.displayName,
          className: updated.studentProfile.currentClass.displayName,
        },
        subjects: updated.subjects,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to update report card status." }, { status: 400 });
  }
}
'@
Write-ProjectFile -RelativePath 'app\api\admin\report-cards\overview\route.ts' -Content $content

# --- app/student/report-cards/page.tsx ---
$content = @'
"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import LiveReportCardPreview from "@/components/LiveReportCardPreview";
import { CalendarDays, Eye, FileText, GraduationCap, LayoutDashboard, Bell, ClipboardCheck, Calendar, User, LoaderCircle, Award, Download } from "lucide-react";

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

type Report = {
  id: string;
  reportNumber: string;
  sessionLabel: string;
  termLabel: string;
  status: string;
  statusLabel: string;
  overallAverage: number;
  overallGrade: string;
  generatedAt: string;
  releasedAt: string | null;
  classNameSnapshot: string;
  overallTotal: number;
  classPosition: string | null;
  attendancePresent: number;
  attendanceTotal: number;
  classTeacherRemark: string;
  directorRemark: string;
  nextResumption: string;
  feeBalance: number;
  subjects: Array<{
    id: string;
    subject: string;
    ca1: number;
    ca2: number;
    midterm: number;
    assignment: number;
    exam: number;
    total: number;
    grade: string;
    sortOrder: number;
  }>;
};

type Response = {
  student: { id: string; displayName: string; className: string };
  reports: Report[];
};

export default function StudentReportCardsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");

  useEffect(() => {
    let active = true;
    async function loadReports() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/student/report-cards", { cache: "no-store" });
        const body = (await response.json()) as Response & { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load report cards.");
        if (!active) return;
        setData(body);
        setSelectedReportId(body.reports[0]?.id || "");
      } catch (loadError) {
        if (!active) return;
        setData(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load report cards.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadReports();
    return () => {
      active = false;
    };
  }, []);

  const selected = data?.reports.find((report) => report.id === selectedReportId) || data?.reports[0] || null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="px-6 pb-10 pt-24">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/5 bg-gradient-to-br from-brand-navy to-brand-navy-light p-8 shadow-xl md:p-12">
            <h1 className="font-display text-[42px] tracking-[3px] text-white md:text-[64px]">MY <span className="text-brand-green">REPORT CARD</span></h1>
            <p className="mt-3 max-w-2xl text-base text-white/60">View, review, and print your live term report cards.</p>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <PortalSidebar portalName="Student" portalType="student" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 space-y-6">
              {loading ? <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]"><div className="flex items-center gap-3 text-[var(--text-secondary)]"><LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading report cards...</div></div> : null}
              {!loading && error ? <div className="rounded-[2rem] border border-brand-orange/30 bg-brand-orange/10 p-6 text-sm text-[var(--text-secondary)] shadow-[var(--card-shadow)]">{error}</div> : null}

              {!loading && data ? (
                <>
                  <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div>
                        <h2 className="font-display text-xl text-[var(--text-primary)]">My Report Cards</h2>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{data.student.displayName} · {data.student.className}</p>
                      </div>
                      {selected ? (
                        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-brand-green px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:bg-brand-green-dark">
                          <Download size={14} /> Print / Save PDF
                        </button>
                      ) : null}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-[var(--border-subtle)]">
                          <tr>
                            {["Report No.", "Term", "Status", "Overall", "Actions"].map((heading) => (
                              <th key={heading} className="px-4 py-3 text-left font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.reports.map((report) => (
                            <tr key={report.id} className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--surface-disabled)]">
                              <td className="px-4 py-4 text-xs font-bold text-brand-green">{report.reportNumber}</td>
                              <td className="px-4 py-4 text-xs text-[var(--text-muted)]">{report.termLabel} · {report.sessionLabel}</td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${report.status === "RELEASED" ? "bg-brand-green/10 text-brand-green" : "bg-brand-orange/10 text-brand-orange"}`}>
                                  <Award size={9} /> {report.statusLabel}
                                </span>
                              </td>
                              <td className="px-4 py-4 font-display text-base font-bold text-brand-green">{report.overallAverage}% · {report.overallGrade}</td>
                              <td className="px-4 py-4">
                                <button onClick={() => setSelectedReportId(report.id)} className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-3 py-1.5 text-[10px] font-bold text-brand-green transition-all hover:bg-brand-green hover:text-white">
                                  <Eye size={10} /> View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {selected ? (
                    <LiveReportCardPreview
                      reportNumber={selected.reportNumber}
                      studentName={data.student.displayName}
                      studentClass={selected.classNameSnapshot}
                      studentId={data.student.id}
                      sessionLabel={selected.sessionLabel}
                      termLabel={selected.termLabel}
                      overallTotal={selected.overallTotal}
                      overallAverage={selected.overallAverage}
                      overallGrade={selected.overallGrade}
                      classPosition={selected.classPosition}
                      attendancePresent={selected.attendancePresent}
                      attendanceTotal={selected.attendanceTotal}
                      classTeacherRemark={selected.classTeacherRemark}
                      directorRemark={selected.directorRemark}
                      nextResumption={selected.nextResumption}
                      feeBalance={selected.feeBalance}
                      subjects={selected.subjects}
                    />
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
Write-ProjectFile -RelativePath 'app\student\report-cards\page.tsx' -Content $content

# --- app/parent/report-cards/page.tsx ---
$content = @'
"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import LiveReportCardPreview from "@/components/LiveReportCardPreview";
import { Calendar, CalendarDays, CreditCard, Download, Eye, FileText, LayoutDashboard, LoaderCircle, MessageCircle, Award } from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/parent/attendance", icon: CalendarDays },
  { label: "Fees", href: "/parent/fees", icon: CreditCard },
  { label: "Report Cards", href: "/parent/report-cards", icon: FileText },
  { label: "Messages", href: "/parent/messages", icon: MessageCircle },
  { label: "Events", href: "/parent/events", icon: Calendar },
];

type Report = {
  id: string;
  reportNumber: string;
  sessionLabel: string;
  termLabel: string;
  status: string;
  statusLabel: string;
  overallAverage: number;
  overallGrade: string;
  generatedAt: string;
  releasedAt: string | null;
  classNameSnapshot: string;
  overallTotal: number;
  classPosition: string | null;
  attendancePresent: number;
  attendanceTotal: number;
  classTeacherRemark: string;
  directorRemark: string;
  nextResumption: string;
  feeBalance: number;
  subjects: Array<{
    id: string;
    subject: string;
    ca1: number;
    ca2: number;
    midterm: number;
    assignment: number;
    exam: number;
    total: number;
    grade: string;
    sortOrder: number;
  }>;
};

type Response = {
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
  reports: Report[];
};

export default function ParentReportCardsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");

  async function loadReports(studentId?: string) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (studentId || selectedStudentId) params.set("studentId", studentId || selectedStudentId);
      const response = await fetch(`/api/parent/report-cards?${params.toString()}`, { cache: "no-store" });
      const body = (await response.json()) as Response & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load report cards.");
        setData(body);
        if (body.selectedChild?.id) setSelectedStudentId(body.selectedChild.id);
        setSelectedReportId(body.reports[0]?.id || "");
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load report cards.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = data?.reports.find((report) => report.id === selectedReportId) || data?.reports[0] || null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pb-10 pt-24">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-[42px] tracking-[3px] text-white md:text-[64px]">REPORT <span className="text-brand-green">CARDS</span></h1>
            <p className="mt-3 max-w-2xl text-base text-white/60">Live access to your child&apos;s released term report cards.</p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <PortalSidebar portalName="Parent" portalType="parent" items={SIDEBAR_ITEMS} />

            <div className="flex-1 min-w-0 space-y-6">
              {loading ? <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]"><div className="flex items-center gap-3 text-[var(--text-secondary)]"><LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading report cards...</div></div> : null}
              {!loading && error ? <div className="rounded-[2rem] border border-brand-orange/30 bg-brand-orange/10 p-6 text-sm text-[var(--text-secondary)] shadow-[var(--card-shadow)]">{error}</div> : null}

              {!loading && data ? (
                <>
                  <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="font-display text-xl text-[var(--text-primary)]">Available Report Cards</h2>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">Select a child and review any generated term report card.</p>
                      </div>
                      {selected ? (
                        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-brand-green px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:bg-brand-green-dark">
                          <Download size={14} /> Print / Save PDF
                        </button>
                      ) : null}
                    </div>

                    {data.children.length ? (
                      <div className="mb-6 flex flex-wrap gap-3">
                        {data.children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => void loadReports(child.id)}
                            className={`rounded-xl border px-5 py-4 text-left transition-all ${data.selectedChild?.id === child.id ? "border-brand-green/30 bg-brand-green/5" : "border-[var(--border-subtle)] bg-[var(--surface-disabled)] hover:border-brand-green/20"}`}
                          >
                            <div className="font-display text-base tracking-[2px] text-[var(--text-primary)]">{child.displayName}</div>
                            <div className="text-[10px] text-[var(--text-muted)]">{child.className} · ID: {child.studentId}</div>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-[var(--border-subtle)]">
                          <tr>
                            {["Report No.", "Student", "Term", "Status", "Actions"].map((heading) => (
                              <th key={heading} className="px-4 py-3 text-left font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.reports.map((report) => (
                            <tr key={report.id} className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--surface-disabled)]">
                              <td className="px-4 py-4 text-xs font-bold text-brand-green">{report.reportNumber}</td>
                              <td className="px-4 py-4 font-bold text-[var(--text-primary)]">{data.selectedChild?.displayName}</td>
                              <td className="px-4 py-4 text-xs text-[var(--text-muted)]">{report.termLabel} · {report.sessionLabel}</td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${report.status === "RELEASED" ? "bg-brand-green/10 text-brand-green" : "bg-brand-orange/10 text-brand-orange"}`}>
                                  <Award size={9} /> {report.statusLabel}
                                </span>
                              </td>
                              <td className="px-4 py-4 flex gap-2">
                                <button onClick={() => setSelectedReportId(report.id)} className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-3 py-1.5 text-[10px] font-bold text-brand-green transition-all hover:bg-brand-green hover:text-white">
                                  <Eye size={10} /> View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {selected && data.selectedChild ? (
                    <LiveReportCardPreview
                      reportNumber={selected.reportNumber}
                      studentName={data.selectedChild.displayName}
                      studentClass={selected.classNameSnapshot}
                      studentId={data.selectedChild.studentId}
                      sessionLabel={selected.sessionLabel}
                      termLabel={selected.termLabel}
                      overallTotal={selected.overallTotal}
                      overallAverage={selected.overallAverage}
                      overallGrade={selected.overallGrade}
                      classPosition={selected.classPosition}
                      attendancePresent={selected.attendancePresent}
                      attendanceTotal={selected.attendanceTotal}
                      classTeacherRemark={selected.classTeacherRemark}
                      directorRemark={selected.directorRemark}
                      nextResumption={selected.nextResumption}
                      feeBalance={selected.feeBalance}
                      subjects={selected.subjects}
                    />
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
Write-ProjectFile -RelativePath 'app\parent\report-cards\page.tsx' -Content $content

# --- app/admin/report-cards/page.tsx ---
$content = @'
"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminSidebar from "@/components/AdminSidebar";
import LiveReportCardPreview from "@/components/LiveReportCardPreview";
import { CheckCircle2, Clock, FileText, LoaderCircle, Mail } from "lucide-react";

type Report = {
  id: string;
  reportNumber: string;
  sessionLabel: string;
  termLabel: string;
  classNameSnapshot: string;
  status: string;
  overallTotal: number;
  overallAverage: number;
  overallGrade: string;
  classPosition: string | null;
  attendancePresent: number;
  attendanceTotal: number;
  classTeacherRemark: string;
  directorRemark: string;
  nextResumption: string;
  feeBalance: number;
  generatedAt: string;
  releasedAt: string | null;
  student: {
    studentId: string;
    displayName: string;
    className: string;
  };
  subjects: Array<{
    id: string;
    subject: string;
    ca1: number;
    ca2: number;
    midterm: number;
    assignment: number;
    exam: number;
    total: number;
    grade: string;
    sortOrder: number;
  }>;
};

type Response = {
  summary: {
    totalReports: number;
    releasedReports: number;
    draftReports: number;
    averageScore: number;
  };
  reports: Report[];
};

export default function AdminReportCardsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadReports() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/report-cards/overview", { cache: "no-store" });
      const body = (await response.json()) as Response & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load report cards.");
      setData(body);
      if (!selectedReportId && body.reports[0]) setSelectedReportId(body.reports[0].id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load report cards.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = data?.reports.find((report) => report.id === selectedReportId) || data?.reports[0] || null;

  async function updateStatus(status: "RELEASED" | "DRAFT") {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/report-cards/overview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportCardId: selected.id, status }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to update report card status.");
      setMessage(status === "RELEASED" ? "Report card released successfully." : "Report card moved back to draft.");
      await loadReports();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update report card status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy pt-24 pb-14">
          <div className="mx-auto max-w-7xl px-6">
            <h1 className="font-display text-[42px] md:text-[72px] text-white">REPORT <span className="text-brand-green">CARDS</span></h1>
            <p className="mt-4 font-body text-white/50">Live report-card registry, release workflow, and preview.</p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <AdminSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {message ? <div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 p-4 text-sm text-[var(--text-secondary)]">{message}</div> : null}
              {loading ? <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]"><div className="flex items-center gap-3 text-[var(--text-secondary)]"><LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading report cards...</div></div> : null}

              {!loading && data ? (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    {[
                      { label: "Total Reports", value: data.summary.totalReports, icon: FileText, color: "text-brand-green" },
                      { label: "Released", value: data.summary.releasedReports, icon: CheckCircle2, color: "text-brand-green" },
                      { label: "Draft", value: data.summary.draftReports, icon: Clock, color: "text-brand-orange" },
                      { label: "Average Score", value: `${data.summary.averageScore}%`, icon: Mail, color: "text-brand-green" },
                    ].map((card) => (
                      <div key={card.label} className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)]">
                        <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{card.label}</div>
                        <div className={`font-display text-2xl ${card.color}`}>{card.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                    <h2 className="mb-6 font-display text-2xl text-[var(--text-primary)]">Report Card Registry</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-[var(--border-subtle)]">
                          <tr>
                            {["Report No.", "Student", "Class", "Status", "Overall", "Actions"].map((heading) => (
                              <th key={heading} className="px-4 py-3 text-left font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.reports.map((report) => (
                            <tr key={report.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-disabled)]">
                              <td className="px-4 py-4 text-xs font-bold text-brand-green">{report.reportNumber}</td>
                              <td className="px-4 py-4 font-bold text-[var(--text-primary)]">{report.student.displayName}</td>
                              <td className="px-4 py-4 text-xs text-[var(--text-muted)]">{report.student.className}</td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${report.status === "RELEASED" ? "bg-brand-green/10 text-brand-green" : "bg-brand-orange/10 text-brand-orange"}`}>
                                  {report.status}
                                </span>
                              </td>
                              <td className="px-4 py-4 font-display text-base font-bold text-brand-green">{report.overallAverage}% · {report.overallGrade}</td>
                              <td className="px-4 py-4 flex gap-2">
                                <button onClick={() => setSelectedReportId(report.id)} className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-3 py-1.5 text-[10px] font-bold text-brand-green hover:bg-brand-green hover:text-white">
                                  View
                                </button>
                                <button
                                  onClick={() => void updateStatus(report.status === "RELEASED" ? "DRAFT" : "RELEASED")}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-disabled)] px-3 py-1.5 text-[10px] font-bold text-[var(--text-secondary)] hover:bg-brand-green hover:text-white disabled:opacity-50"
                                >
                                  {report.status === "RELEASED" ? "Set Draft" : "Release"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {selected ? (
                    <LiveReportCardPreview
                      reportNumber={selected.reportNumber}
                      studentName={selected.student.displayName}
                      studentClass={selected.classNameSnapshot}
                      studentId={selected.student.studentId}
                      sessionLabel={selected.sessionLabel}
                      termLabel={selected.termLabel}
                      overallTotal={selected.overallTotal}
                      overallAverage={selected.overallAverage}
                      overallGrade={selected.overallGrade}
                      classPosition={selected.classPosition}
                      attendancePresent={selected.attendancePresent}
                      attendanceTotal={selected.attendanceTotal}
                      classTeacherRemark={selected.classTeacherRemark}
                      directorRemark={selected.directorRemark}
                      nextResumption={selected.nextResumption}
                      feeBalance={selected.feeBalance}
                      subjects={selected.subjects}
                    />
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
Write-ProjectFile -RelativePath 'app\admin\report-cards\page.tsx' -Content $content

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
    "db:bootstrap-attendance": "tsx prisma/seed-attendance.ts",
    "db:bootstrap-finance": "tsx prisma/seed-finance.ts",
    "db:bootstrap-report-cards": "tsx prisma/seed-report-cards.ts"
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

# --- prisma/seed-report-cards.ts ---
$content = @'
import { ReportCardStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getSchool } from "../lib/school";

function gradeFromScore(score: number) {
  if (score >= 75) return "A1";
  if (score >= 70) return "B2";
  if (score >= 65) return "B3";
  if (score >= 60) return "C4";
  if (score >= 55) return "C5";
  if (score >= 50) return "C6";
  if (score >= 45) return "D7";
  if (score >= 40) return "E8";
  return "F9";
}

function buildSubjects(template: Array<{ subject: string; ca1: number; ca2: number; midterm: number; assignment: number; exam: number }>) {
  return template.map((item, index) => {
    const total = item.ca1 + item.ca2 + item.midterm + item.assignment + item.exam;
    return {
      subject: item.subject,
      ca1: item.ca1,
      ca2: item.ca2,
      midterm: item.midterm,
      assignment: item.assignment,
      exam: item.exam,
      total,
      grade: gradeFromScore(total),
      sortOrder: index + 1,
    };
  });
}

async function attendanceSummary(studentProfileId: string) {
  const entries = await prisma.attendanceEntry.findMany({
    where: { studentProfileId },
    select: { status: true },
  });
  const present = entries.filter((entry) => entry.status === "PRESENT").length;
  return {
    present,
    total: entries.length || 1,
  };
}

async function upsertReportCard(input: {
  schoolId: string;
  studentProfileId: string;
  parentProfileId?: string | null;
  reportNumber: string;
  sessionLabel: string;
  termLabel: string;
  classNameSnapshot: string;
  status: ReportCardStatus;
  overallTotal: number;
  overallAverage: number;
  overallGrade: string;
  classPosition?: string | null;
  attendancePresent: number;
  attendanceTotal: number;
  classTeacherRemark: string;
  directorRemark: string;
  nextResumption: string;
  feeBalance: number;
  subjects: Array<{ subject: string; ca1: number; ca2: number; midterm: number; assignment: number; exam: number; total: number; grade: string; sortOrder: number }>;
}) {
  const reportCard = await prisma.reportCard.upsert({
    where: { reportNumber: input.reportNumber },
    update: {
      schoolId: input.schoolId,
      studentProfileId: input.studentProfileId,
      parentProfileId: input.parentProfileId || null,
      sessionLabel: input.sessionLabel,
      termLabel: input.termLabel,
      classNameSnapshot: input.classNameSnapshot,
      status: input.status,
      overallTotal: input.overallTotal,
      overallAverage: input.overallAverage,
      overallGrade: input.overallGrade,
      classPosition: input.classPosition || null,
      attendancePresent: input.attendancePresent,
      attendanceTotal: input.attendanceTotal,
      classTeacherRemark: input.classTeacherRemark,
      directorRemark: input.directorRemark,
      nextResumption: input.nextResumption,
      feeBalance: input.feeBalance,
      releasedAt: input.status === ReportCardStatus.RELEASED ? new Date() : null,
    },
    create: {
      schoolId: input.schoolId,
      studentProfileId: input.studentProfileId,
      parentProfileId: input.parentProfileId || null,
      reportNumber: input.reportNumber,
      sessionLabel: input.sessionLabel,
      termLabel: input.termLabel,
      classNameSnapshot: input.classNameSnapshot,
      status: input.status,
      overallTotal: input.overallTotal,
      overallAverage: input.overallAverage,
      overallGrade: input.overallGrade,
      classPosition: input.classPosition || null,
      attendancePresent: input.attendancePresent,
      attendanceTotal: input.attendanceTotal,
      classTeacherRemark: input.classTeacherRemark,
      directorRemark: input.directorRemark,
      nextResumption: input.nextResumption,
      feeBalance: input.feeBalance,
      releasedAt: input.status === ReportCardStatus.RELEASED ? new Date() : null,
    },
  });

  await prisma.reportCardSubject.deleteMany({ where: { reportCardId: reportCard.id } });
  await prisma.reportCardSubject.createMany({
    data: input.subjects.map((subject) => ({
      reportCardId: reportCard.id,
      subject: subject.subject,
      ca1: subject.ca1,
      ca2: subject.ca2,
      midterm: subject.midterm,
      assignment: subject.assignment,
      exam: subject.exam,
      total: subject.total,
      grade: subject.grade,
      sortOrder: subject.sortOrder,
    })),
  });

  return reportCard;
}

async function main() {
  const school = await getSchool();
  const students = await prisma.studentProfile.findMany({
    where: { schoolId: school.id, isActive: true },
    orderBy: { studentId: "asc" },
    include: {
      currentClass: true,
      parentLinks: {
        where: { isPrimary: true },
        include: { parentProfile: true },
      },
      feeInvoices: {
        orderBy: { issuedAt: "desc" },
      },
    },
  });

  if (!students.length) {
    throw new Error("No student profiles found. Run attendance/bootstrap seeds first.");
  }

  const sessionLabel = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  const termLabel = `First Term ${sessionLabel}`;

  const templates = [
    {
      student: students[0],
      reportNumber: `YKC-RPT-${new Date().getFullYear()}-001`,
      status: ReportCardStatus.RELEASED,
      classPosition: "3rd of 32",
      teacherRemark: "A strong and consistent learner. Keep building on this momentum.",
      directorRemark: "Excellent effort this term. Remain focused and disciplined.",
      subjects: buildSubjects([
        { subject: "Mathematics", ca1: 8, ca2: 7, midterm: 9, assignment: 8, exam: 52 },
        { subject: "English Language", ca1: 7, ca2: 7, midterm: 8, assignment: 8, exam: 48 },
        { subject: "Biology", ca1: 8, ca2: 8, midterm: 8, assignment: 9, exam: 50 },
        { subject: "Chemistry", ca1: 7, ca2: 6, midterm: 8, assignment: 8, exam: 46 },
        { subject: "Physics", ca1: 9, ca2: 8, midterm: 8, assignment: 8, exam: 49 },
      ]),
    },
    {
      student: students[1],
      reportNumber: `YKC-RPT-${new Date().getFullYear()}-002`,
      status: ReportCardStatus.RELEASED,
      classPosition: "8th of 32",
      teacherRemark: "Good work overall. Improve revision consistency in science subjects.",
      directorRemark: "A commendable term. Aim higher next term.",
      subjects: buildSubjects([
        { subject: "Mathematics", ca1: 6, ca2: 7, midterm: 7, assignment: 7, exam: 43 },
        { subject: "English Language", ca1: 8, ca2: 7, midterm: 8, assignment: 8, exam: 46 },
        { subject: "Biology", ca1: 7, ca2: 7, midterm: 8, assignment: 7, exam: 45 },
        { subject: "Chemistry", ca1: 6, ca2: 6, midterm: 7, assignment: 7, exam: 42 },
        { subject: "Physics", ca1: 6, ca2: 6, midterm: 7, assignment: 6, exam: 41 },
      ]),
    },
    {
      student: students[2] || students[0],
      reportNumber: `YKC-RPT-${new Date().getFullYear()}-003`,
      status: ReportCardStatus.DRAFT,
      classPosition: "12th of 32",
      teacherRemark: "Draft report card awaiting final release.",
      directorRemark: "Pending review before release.",
      subjects: buildSubjects([
        { subject: "Mathematics", ca1: 5, ca2: 6, midterm: 6, assignment: 7, exam: 40 },
        { subject: "English Language", ca1: 7, ca2: 7, midterm: 7, assignment: 7, exam: 44 },
        { subject: "Biology", ca1: 6, ca2: 6, midterm: 7, assignment: 7, exam: 43 },
        { subject: "Chemistry", ca1: 5, ca2: 6, midterm: 6, assignment: 6, exam: 39 },
        { subject: "Physics", ca1: 5, ca2: 6, midterm: 6, assignment: 6, exam: 38 },
      ]),
    },
  ];

  for (const template of templates) {
    const attendance = await attendanceSummary(template.student.id);
    const totalScore = template.subjects.reduce((sum, subject) => sum + subject.total, 0);
    const average = Math.round(totalScore / template.subjects.length);
    const latestInvoice = template.student.feeInvoices[0];
    await upsertReportCard({
      schoolId: school.id,
      studentProfileId: template.student.id,
      parentProfileId: template.student.parentLinks[0]?.parentProfile.id || null,
      reportNumber: template.reportNumber,
      sessionLabel,
      termLabel,
      classNameSnapshot: template.student.currentClass.displayName,
      status: template.status,
      overallTotal: totalScore,
      overallAverage: average,
      overallGrade: gradeFromScore(average),
      classPosition: template.classPosition,
      attendancePresent: attendance.present,
      attendanceTotal: attendance.total,
      classTeacherRemark: template.teacherRemark,
      directorRemark: template.directorRemark,
      nextResumption: "15 September 2026",
      feeBalance: latestInvoice?.balanceDue || 0,
      subjects: template.subjects,
    });
  }

  console.log("\nReport-card bootstrap complete.\n");
  console.table(
    templates.map((template) => ({
      reportNumber: template.reportNumber,
      student: template.student.displayName,
      status: template.status,
      class: template.student.currentClass.displayName,
    }))
  );
  console.log("Student, parent, and admin report-card pages now have live seeded data.");
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
Write-ProjectFile -RelativePath 'prisma\seed-report-cards.ts' -Content $content

# --- PHASE3E_REPORT_CARDS_LIVE_NOTES.md ---
$content = @'
# Phase 3E — Results / Report Cards Live Conversion

## What was implemented
Phase 3E converts report cards from static placeholders into live database-backed records for student, parent, and admin portals.

### Schema additions
- `ReportCardStatus`
- `ReportCard`
- `ReportCardSubject`

### New API routes
- `GET /api/student/report-cards`
- `GET /api/parent/report-cards`
- `GET /api/admin/report-cards/overview`
- `PATCH /api/admin/report-cards/overview`

### New shared UI component
- `components/LiveReportCardPreview.tsx`

### Updated pages
- `app/student/report-cards/page.tsx`
- `app/parent/report-cards/page.tsx`
- `app/admin/report-cards/page.tsx`

### New bootstrap seed
- `prisma/seed-report-cards.ts`
- npm script: `npm run db:bootstrap-report-cards`

## Admin workflow
Admin can now:
- view all report cards
- preview report card contents
- release a draft report card
- move a released report card back to draft

## Student / Parent workflow
Student and parent portals now:
- load report cards from live data
- display report-card registry tables
- preview full report cards
- support browser print / save-to-PDF

## Recommended command sequence after ingestion
```powershell
npx prisma generate
npx prisma migrate dev --name phase_3e_report_cards_live
npm run db:bootstrap-report-cards
npm run build
```

If using committed migration deployment flow:
```powershell
npx prisma generate
npx prisma migrate deploy
npm run db:bootstrap-report-cards
npm run build
```

## Recommended git branch
```powershell
git checkout -b phase/3e-results-report-cards-live
```

## What remains after Phase 3E
- 3F — Student / parent dashboard polish
- 3G — Notification delivery integration / hardening
'@
Write-ProjectFile -RelativePath 'PHASE3E_REPORT_CARDS_LIVE_NOTES.md' -Content $content

Write-Host "Phase 3E Report Cards Live files applied successfully." -ForegroundColor Cyan