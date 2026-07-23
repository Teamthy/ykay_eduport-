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

Write-Host "Applying Phase 3D Finance Live Data files..." -ForegroundColor Cyan

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

# --- prisma/migrations/20260723170000_phase_3d_finance_live_data/migration.sql ---
$content = @'
-- CreateEnum
CREATE TYPE "public"."FeeInvoiceStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."FeePaymentMethod" AS ENUM ('PAYSTACK', 'BANK_TRANSFER', 'CASH', 'CARD', 'USSD');

-- CreateEnum
CREATE TYPE "public"."FeePaymentStatus" AS ENUM ('COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "public"."FeeInvoice" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "parentProfileId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "termLabel" TEXT NOT NULL,
    "status" "public"."FeeInvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "totalAmount" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "balanceDue" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeeInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeePayment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "parentProfileId" TEXT,
    "amount" INTEGER NOT NULL,
    "method" "public"."FeePaymentMethod" NOT NULL,
    "status" "public"."FeePaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "reference" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "providerData" JSONB,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeInvoice_invoiceNumber_key" ON "public"."FeeInvoice"("invoiceNumber");
CREATE INDEX "FeeInvoice_schoolId_status_dueDate_idx" ON "public"."FeeInvoice"("schoolId", "status", "dueDate");
CREATE INDEX "FeeInvoice_studentProfileId_issuedAt_idx" ON "public"."FeeInvoice"("studentProfileId", "issuedAt");
CREATE INDEX "FeeInvoice_parentProfileId_issuedAt_idx" ON "public"."FeeInvoice"("parentProfileId", "issuedAt");

-- CreateIndex
CREATE INDEX "FeeInvoiceItem_invoiceId_sortOrder_idx" ON "public"."FeeInvoiceItem"("invoiceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FeePayment_reference_key" ON "public"."FeePayment"("reference");
CREATE UNIQUE INDEX "FeePayment_receiptNumber_key" ON "public"."FeePayment"("receiptNumber");
CREATE INDEX "FeePayment_schoolId_paidAt_idx" ON "public"."FeePayment"("schoolId", "paidAt");
CREATE INDEX "FeePayment_invoiceId_paidAt_idx" ON "public"."FeePayment"("invoiceId", "paidAt");
CREATE INDEX "FeePayment_parentProfileId_paidAt_idx" ON "public"."FeePayment"("parentProfileId", "paidAt");

-- AddForeignKey
ALTER TABLE "public"."FeeInvoice" ADD CONSTRAINT "FeeInvoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."FeeInvoice" ADD CONSTRAINT "FeeInvoice_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."FeeInvoice" ADD CONSTRAINT "FeeInvoice_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "public"."ParentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."FeeInvoiceItem" ADD CONSTRAINT "FeeInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."FeeInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."FeePayment" ADD CONSTRAINT "FeePayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."FeePayment" ADD CONSTRAINT "FeePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."FeeInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."FeePayment" ADD CONSTRAINT "FeePayment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."FeePayment" ADD CONSTRAINT "FeePayment_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "public"."ParentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
'@
Write-ProjectFile -RelativePath 'prisma\migrations\20260723170000_phase_3d_finance_live_data\migration.sql' -Content $content

# --- lib/finance.ts ---
$content = @'
import { FeeInvoiceStatus, FeePaymentMethod, FeePaymentStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export const FINANCE_ADMIN_ROLES = [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.BURSAR, UserRole.COORDINATOR];

export function computeInvoiceStatus(totalAmount: number, amountPaid: number, dueDate?: Date | null) {
  if (amountPaid >= totalAmount) return FeeInvoiceStatus.PAID;
  if (amountPaid > 0) return FeeInvoiceStatus.PARTIAL;
  if (dueDate && dueDate.getTime() < Date.now()) return FeeInvoiceStatus.OVERDUE;
  return FeeInvoiceStatus.UNPAID;
}

export function generateReceiptNumber() {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `YKC-RCP-${year}-${suffix}`;
}

export function generatePaymentReference() {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `YKC-PAY-${year}-${suffix}`;
}

export async function getParentFinanceContext() {
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
      phone: true,
      user: { select: { email: true } },
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

export async function getAdminFinanceContext() {
  const user = await requireRole(FINANCE_ADMIN_ROLES);
  if (!user) return null;
  return { user };
}

export function feeMethodLabel(method: FeePaymentMethod) {
  switch (method) {
    case FeePaymentMethod.BANK_TRANSFER:
      return "Bank Transfer";
    case FeePaymentMethod.CASH:
      return "Cash";
    case FeePaymentMethod.CARD:
      return "Card";
    case FeePaymentMethod.USSD:
      return "USSD";
    default:
      return "Paystack";
  }
}

export function feeStatusLabel(status: FeeInvoiceStatus) {
  return status.replaceAll("_", " ");
}

export function paymentStatusLabel(status: FeePaymentStatus) {
  return status.replaceAll("_", " ");
}
'@
Write-ProjectFile -RelativePath 'lib\finance.ts' -Content $content

# --- app/api/parent/fees/route.ts ---
$content = @'
import { FeePaymentStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { getParentFinanceContext } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { jsonNoStore } from "@/lib/requests";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const context = await getParentFinanceContext();
  if (!context) {
    return jsonNoStore({ error: "No live parent finance profile is linked to this account yet." }, { status: 404 });
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
      parent: {
        displayName: context.profile.displayName,
        phone: context.profile.phone,
        email: context.profile.user.email,
      },
      children: [],
      selectedChild: null,
      selectedInvoice: null,
      invoices: [],
      payments: [],
      summary: { totalBilled: 0, totalPaid: 0, totalOutstanding: 0 },
    });
  }

  const requestedStudentId = request.nextUrl.searchParams.get("studentId")?.trim();
  const selectedChild = children.find((child) => child.id === requestedStudentId) || children[0];

  const invoices = await prisma.feeInvoice.findMany({
    where: {
      schoolId: context.user.schoolId,
      studentProfileId: selectedChild.id,
    },
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      payments: {
        where: { status: FeePaymentStatus.COMPLETED },
        orderBy: { paidAt: "desc" },
      },
    },
  });

  const selectedInvoiceId = request.nextUrl.searchParams.get("invoiceId")?.trim();
  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) || invoices[0] || null;
  const payments = selectedInvoice?.payments || [];

  return jsonNoStore({
    parent: {
      displayName: context.profile.displayName,
      phone: context.profile.phone,
      email: context.profile.user.email,
    },
    children,
    selectedChild,
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      termLabel: invoice.termLabel,
      status: invoice.status,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      dueDate: invoice.dueDate?.toISOString() || null,
      issuedAt: invoice.issuedAt.toISOString(),
    })),
    selectedInvoice: selectedInvoice
      ? {
          id: selectedInvoice.id,
          invoiceNumber: selectedInvoice.invoiceNumber,
          title: selectedInvoice.title,
          termLabel: selectedInvoice.termLabel,
          status: selectedInvoice.status,
          totalAmount: selectedInvoice.totalAmount,
          amountPaid: selectedInvoice.amountPaid,
          balanceDue: selectedInvoice.balanceDue,
          dueDate: selectedInvoice.dueDate?.toISOString() || null,
          issuedAt: selectedInvoice.issuedAt.toISOString(),
          items: selectedInvoice.items.map((item) => ({
            id: item.id,
            label: item.label,
            amount: item.amount,
            mandatory: item.mandatory,
          })),
        }
      : null,
    payments: payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      reference: payment.reference,
      receiptNumber: payment.receiptNumber,
      paidAt: payment.paidAt.toISOString(),
    })),
    summary: {
      totalBilled: invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
      totalPaid: invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0),
      totalOutstanding: invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0),
    },
  });
}
'@
Write-ProjectFile -RelativePath 'app\api\parent\fees\route.ts' -Content $content

# --- app/api/parent/fees/payments/route.ts ---
$content = @'
import { FeePaymentMethod, FeePaymentStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { computeInvoiceStatus, generatePaymentReference, generateReceiptNumber, getParentFinanceContext } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { getClientIp, jsonNoStore } from "@/lib/requests";

export const runtime = "nodejs";

const schema = z.object({
  invoiceId: z.string().trim().min(1),
  amount: z.number().int().positive().optional(),
  reference: z.string().trim().min(6).optional(),
  method: z.nativeEnum(FeePaymentMethod).optional(),
});

export async function POST(request: NextRequest) {
  const context = await getParentFinanceContext();
  if (!context) {
    return jsonNoStore({ error: "No live parent finance profile is linked to this account yet." }, { status: 404 });
  }

  try {
    const payload = schema.parse(await request.json());
    const link = await prisma.parentStudentLink.findFirst({
      where: {
        parentProfileId: context.profile.id,
        studentProfile: {
          feeInvoices: {
            some: { id: payload.invoiceId },
          },
        },
      },
      select: { studentProfileId: true },
    });

    if (!link) {
      return jsonNoStore({ error: "Invoice not found for this parent account." }, { status: 404 });
    }

    const ipAddress = getClientIp(request);
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.feeInvoice.findUnique({
        where: { id: payload.invoiceId },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          studentProfile: {
            include: {
              currentClass: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new Error("Invoice not found.");
      }

      if (invoice.balanceDue <= 0) {
        throw new Error("This invoice is already fully paid.");
      }

      const amount = Math.min(payload.amount || invoice.balanceDue, invoice.balanceDue);
      const reference = payload.reference || generatePaymentReference();
      const receiptNumber = generateReceiptNumber();
      const method = payload.method || FeePaymentMethod.PAYSTACK;

      const payment = await tx.feePayment.create({
        data: {
          schoolId: context.user.schoolId,
          invoiceId: invoice.id,
          studentProfileId: invoice.studentProfileId,
          parentProfileId: context.profile.id,
          amount,
          method,
          status: FeePaymentStatus.COMPLETED,
          reference,
          receiptNumber,
          providerData: {
            source: "parent-portal",
            modal: "paystack-demo",
          },
        },
      });

      const nextAmountPaid = invoice.amountPaid + amount;
      const nextBalanceDue = Math.max(invoice.totalAmount - nextAmountPaid, 0);
      const nextStatus = computeInvoiceStatus(invoice.totalAmount, nextAmountPaid, invoice.dueDate);

      const updatedInvoice = await tx.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: nextAmountPaid,
          balanceDue: nextBalanceDue,
          status: nextStatus,
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          studentProfile: {
            include: {
              currentClass: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: context.user.schoolId,
          actorUserId: context.user.id,
          action: "FEE_PAYMENT_RECORDED",
          entityType: "FeeInvoice",
          entityId: invoice.id,
          ipAddress,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            amount,
            reference,
            method,
            receiptNumber,
          },
        },
      });

      return { payment, invoice: updatedInvoice };
    });

    return jsonNoStore({
      payment: {
        id: result.payment.id,
        amount: result.payment.amount,
        method: result.payment.method,
        status: result.payment.status,
        reference: result.payment.reference,
        receiptNumber: result.payment.receiptNumber,
        paidAt: result.payment.paidAt.toISOString(),
      },
      invoice: {
        id: result.invoice.id,
        invoiceNumber: result.invoice.invoiceNumber,
        title: result.invoice.title,
        termLabel: result.invoice.termLabel,
        status: result.invoice.status,
        totalAmount: result.invoice.totalAmount,
        amountPaid: result.invoice.amountPaid,
        balanceDue: result.invoice.balanceDue,
        dueDate: result.invoice.dueDate?.toISOString() || null,
        items: result.invoice.items.map((item) => ({
          id: item.id,
          label: item.label,
          amount: item.amount,
          mandatory: item.mandatory,
        })),
        student: {
          studentId: result.invoice.studentProfile.studentId,
          displayName: result.invoice.studentProfile.displayName,
          className: result.invoice.studentProfile.currentClass.displayName,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record fee payment.";
    return jsonNoStore({ error: message }, { status: 400 });
  }
}
'@
Write-ProjectFile -RelativePath 'app\api\parent\fees\payments\route.ts' -Content $content

# --- app/api/admin/fees/overview/route.ts ---
$content = @'
import { FeePaymentStatus } from "@prisma/client";
import { getAdminFinanceContext } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { jsonNoStore } from "@/lib/requests";

export const runtime = "nodejs";

export async function GET() {
  const context = await getAdminFinanceContext();
  if (!context) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const [invoices, recentPayments] = await Promise.all([
    prisma.feeInvoice.findMany({
      where: { schoolId: context.user.schoolId },
      orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
      include: {
        studentProfile: {
          include: { currentClass: true },
        },
        parentProfile: true,
      },
    }),
    prisma.feePayment.findMany({
      where: {
        schoolId: context.user.schoolId,
        status: FeePaymentStatus.COMPLETED,
      },
      orderBy: { paidAt: "desc" },
      take: 8,
      include: {
        studentProfile: {
          include: { currentClass: true },
        },
      },
    }),
  ]);

  const totalBilled = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const totalCollected = invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
  const totalOutstanding = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
  const collectionRate = totalBilled ? Math.round((totalCollected / totalBilled) * 100) : 0;

  return jsonNoStore({
    summary: {
      totalBilled,
      totalCollected,
      totalOutstanding,
      collectionRate,
      invoiceCount: invoices.length,
      paidInvoices: invoices.filter((invoice) => invoice.status === "PAID").length,
      partialInvoices: invoices.filter((invoice) => invoice.status === "PARTIAL").length,
      unpaidInvoices: invoices.filter((invoice) => invoice.status === "UNPAID" || invoice.status === "OVERDUE").length,
    },
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      termLabel: invoice.termLabel,
      status: invoice.status,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      dueDate: invoice.dueDate?.toISOString() || null,
      issuedAt: invoice.issuedAt.toISOString(),
      student: {
        studentId: invoice.studentProfile.studentId,
        displayName: invoice.studentProfile.displayName,
        className: invoice.studentProfile.currentClass.displayName,
      },
      parent: {
        displayName: invoice.parentProfile?.displayName || invoice.studentProfile.guardianName || "Parent record pending",
      },
    })),
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference,
      receiptNumber: payment.receiptNumber,
      paidAt: payment.paidAt.toISOString(),
      student: {
        studentId: payment.studentProfile.studentId,
        displayName: payment.studentProfile.displayName,
        className: payment.studentProfile.currentClass.displayName,
      },
    })),
  });
}
'@
Write-ProjectFile -RelativePath 'app\api\admin\fees\overview\route.ts' -Content $content

# --- app/api/admin/finances/overview/route.ts ---
$content = @'
import { FeePaymentStatus } from "@prisma/client";
import { getAdminFinanceContext } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { jsonNoStore } from "@/lib/requests";

function startOfDay(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeek(now: Date) {
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfYear(now: Date) {
  return new Date(now.getFullYear(), 0, 1);
}

export const runtime = "nodejs";

export async function GET() {
  const context = await getAdminFinanceContext();
  if (!context) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const payments = await prisma.feePayment.findMany({
    where: {
      schoolId: context.user.schoolId,
      status: FeePaymentStatus.COMPLETED,
    },
    orderBy: { paidAt: "desc" },
    include: {
      studentProfile: {
        include: {
          currentClass: true,
        },
      },
    },
  });

  const invoices = await prisma.feeInvoice.findMany({
    where: { schoolId: context.user.schoolId },
    include: {
      studentProfile: {
        include: { currentClass: true },
      },
    },
  });

  const now = new Date();
  const windows = [
    { label: "Today", start: startOfDay(now) },
    { label: "This Week", start: startOfWeek(now) },
    { label: "This Month", start: startOfMonth(now) },
    { label: "This Year", start: startOfYear(now) },
  ];

  const cards = windows.map((window) => {
    const income = payments
      .filter((payment) => payment.paidAt >= window.start)
      .reduce((sum, payment) => sum + payment.amount, 0);
    return {
      period: window.label,
      income,
      expenses: 0,
      net: income,
    };
  });

  const classCollectionsMap = new Map<string, { className: string; billed: number; paid: number }>();
  for (const invoice of invoices) {
    const className = invoice.studentProfile.currentClass.displayName;
    const current = classCollectionsMap.get(className) || { className, billed: 0, paid: 0 };
    current.billed += invoice.totalAmount;
    current.paid += invoice.amountPaid;
    classCollectionsMap.set(className, current);
  }

  const classCollections = [...classCollectionsMap.values()]
    .map((item) => ({
      ...item,
      balance: Math.max(item.billed - item.paid, 0),
      collectionRate: item.billed ? Math.round((item.paid / item.billed) * 100) : 0,
    }))
    .sort((left, right) => right.paid - left.paid || left.className.localeCompare(right.className));

  return jsonNoStore({
    cards,
    totals: {
      totalIncome: payments.reduce((sum, payment) => sum + payment.amount, 0),
      totalBilled: invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
      totalOutstanding: invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0),
      collectionRate: invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
        ? Math.round(
            (invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0) /
              invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)) *
              100
          )
        : 0,
    },
    recentIncome: payments.slice(0, 8).map((payment) => ({
      id: payment.id,
      date: payment.paidAt.toISOString(),
      category: payment.method,
      amount: payment.amount,
      desc: `${payment.studentProfile.displayName} — ${payment.studentProfile.currentClass.displayName} fees`,
      receiptNumber: payment.receiptNumber,
    })),
    classCollections,
  });
}
'@
Write-ProjectFile -RelativePath 'app\api\admin\finances\overview\route.ts' -Content $content

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
      finance: { totalBilled: 0, totalPaid: 0, totalOutstanding: 0, latestInvoice: null },
      recentAlerts: [],
    });
  }

  const selectedChild = children[0];
  const attendance = await getStudentAttendanceMonth(selectedChild.id, null);

  const [recentAlerts, childInvoices] = await Promise.all([
    prisma.attendanceAlertJob.findMany({
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
    }),
    prisma.feeInvoice.findMany({
      where: {
        schoolId: context.user.schoolId,
        studentProfileId: selectedChild.id,
      },
      orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        invoiceNumber: true,
        termLabel: true,
        title: true,
        status: true,
        totalAmount: true,
        amountPaid: true,
        balanceDue: true,
        dueDate: true,
        issuedAt: true,
      },
    }),
  ]);

  const latestInvoice = childInvoices[0] || null;

  return jsonNoStore({
    parent: { displayName: context.profile.displayName },
    children,
    selectedChild,
    attendance: attendance.summary,
    finance: {
      totalBilled: childInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
      totalPaid: childInvoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0),
      totalOutstanding: childInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0),
      latestInvoice: latestInvoice
        ? {
            id: latestInvoice.id,
            invoiceNumber: latestInvoice.invoiceNumber,
            termLabel: latestInvoice.termLabel,
            title: latestInvoice.title,
            status: latestInvoice.status,
            totalAmount: latestInvoice.totalAmount,
            amountPaid: latestInvoice.amountPaid,
            balanceDue: latestInvoice.balanceDue,
            dueDate: latestInvoice.dueDate?.toISOString() || null,
            issuedAt: latestInvoice.issuedAt.toISOString(),
          }
        : null,
    },
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

# --- app/parent/fees/page.tsx ---
$content = @'
"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PortalSidebar from "@/components/PortalSidebar";
import PaystackModal from "@/components/PaystackModal";
import ReceiptModal from "@/components/ReceiptModal";
import { useToast } from "@/components/Toast";
import { ReceiptData } from "@/lib/receipt";
import {
  Calendar,
  CalendarDays,
  CreditCard,
  Download,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  MessageCircle,
  Receipt as ReceiptIcon,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/parent/attendance", icon: CalendarDays },
  { label: "Fees", href: "/parent/fees", icon: CreditCard },
  { label: "Report Cards", href: "/parent/report-cards", icon: FileText },
  { label: "Messages", href: "/parent/messages", icon: MessageCircle, badge: "1" },
  { label: "Events", href: "/parent/events", icon: Calendar },
];

type ParentFeesResponse = {
  parent: {
    displayName: string;
    phone: string | null;
    email: string | null;
  };
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
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    title: string;
    termLabel: string;
    status: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    dueDate: string | null;
    issuedAt: string;
  }>;
  selectedInvoice: {
    id: string;
    invoiceNumber: string;
    title: string;
    termLabel: string;
    status: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    dueDate: string | null;
    issuedAt: string;
    items: Array<{ id: string; label: string; amount: number; mandatory: boolean }>;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    reference: string;
    receiptNumber: string;
    paidAt: string;
  }>;
  summary: {
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
  };
};

type PaymentResponse = {
  payment: {
    id: string;
    amount: number;
    method: string;
    status: string;
    reference: string;
    receiptNumber: string;
    paidAt: string;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    title: string;
    termLabel: string;
    status: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    dueDate: string | null;
    items: Array<{ id: string; label: string; amount: number; mandatory: boolean }>;
    student: {
      studentId: string;
      displayName: string;
      className: string;
    };
  };
};

function formatMethod(method: string) {
  return method.replaceAll("_", " ");
}

export default function ParentFeesPage() {
  const { toast } = useToast();
  const [data, setData] = useState<ParentFeesResponse | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPaystack, setShowPaystack] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  async function loadFees(opts?: { studentId?: string; invoiceId?: string }) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      const studentId = opts?.studentId || selectedStudentId;
      const invoiceId = opts?.invoiceId || selectedInvoiceId;
      if (studentId) params.set("studentId", studentId);
      if (invoiceId) params.set("invoiceId", invoiceId);
      const response = await fetch(`/api/parent/fees?${params.toString()}`, { cache: "no-store" });
      const body = (await response.json()) as ParentFeesResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load fee records.");
      setData(body);
      if (body.selectedChild?.id) setSelectedStudentId(body.selectedChild.id);
      if (body.selectedInvoice?.id) setSelectedInvoiceId(body.selectedInvoice.id);
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load fee records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, selectedInvoiceId]);

  const selectedInvoice = data?.selectedInvoice || null;
  const remaining = selectedInvoice?.balanceDue || 0;

  const paymentSummary = useMemo(() => {
    if (!data) return { receipts: 0 };
    return { receipts: data.payments.length };
  }, [data]);

  const buildReceiptData = (result: PaymentResponse): ReceiptData => ({
    receiptNo: result.payment.receiptNumber,
    date: new Date(result.payment.paidAt).toLocaleDateString(),
    studentName: result.invoice.student.displayName,
    studentClass: result.invoice.student.className,
    studentId: result.invoice.student.studentId,
    parentName: data?.parent.displayName || "Parent",
    parentPhone: data?.parent.phone || "",
    parentEmail: data?.parent.email || "",
    feeItems: result.invoice.items.map((item) => ({ label: item.label, amount: item.amount })),
    totalPaid: result.payment.amount,
    paymentMethod: formatMethod(result.payment.method),
    paymentReference: result.payment.reference,
    term: result.invoice.termLabel,
  });

  async function handlePaymentSuccess(reference: string) {
    if (!selectedInvoice) return;
    setProcessingPayment(true);
    try {
      const response = await fetch("/api/parent/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: selectedInvoice.balanceDue,
          reference,
          method: "PAYSTACK",
        }),
      });
      const body = (await response.json()) as PaymentResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to record payment.");
      toast(`Payment of ₦${body.payment.amount.toLocaleString()} recorded successfully.`, "success");
      setReceiptData(buildReceiptData(body));
      setShowReceipt(true);
      await loadFees({ studentId: selectedStudentId, invoiceId: selectedInvoice.id });
    } catch (paymentError) {
      toast(paymentError instanceof Error ? paymentError.message : "Unable to record payment.", "error");
    } finally {
      setProcessingPayment(false);
      setShowPaystack(false);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pb-10 pt-24">
          <div className="mx-auto max-w-7xl">
            <h1 className="font-display text-[42px] tracking-[3px] text-white md:text-[64px]">
              PARENT <span className="text-brand-green">FEES</span>
            </h1>
            <p className="mt-3 text-white/60">Live fee invoices, payment history, and receipts backed by the database.</p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <PortalSidebar portalName="Parent" portalType="parent" items={SIDEBAR_ITEMS} />

            <div className="flex-1 space-y-6">
              {loading ? (
                <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading fee ledger...
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
                        <button
                          key={child.id}
                          onClick={() => {
                            setSelectedStudentId(child.id);
                            setSelectedInvoiceId("");
                          }}
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

                  <div className="grid gap-6 md:grid-cols-3">
                    {[
                      { label: "Total Billed", value: data.summary.totalBilled, accent: "text-brand-green" },
                      { label: "Total Paid", value: data.summary.totalPaid, accent: "text-brand-green" },
                      { label: "Outstanding", value: data.summary.totalOutstanding, accent: "text-brand-orange" },
                    ].map((card) => (
                      <div key={card.label} className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)]">
                        <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{card.label}</div>
                        <div className={`font-display text-2xl ${card.accent}`}>₦{card.value.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
                    <div className="space-y-6">
                      <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] overflow-hidden shadow-[var(--card-shadow)]">
                        <div className="bg-brand-navy p-8">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h2 className="font-display text-2xl text-white">Current Invoice</h2>
                              <p className="mt-1 text-xs text-white/60">{selectedInvoice?.invoiceNumber || "No invoice selected"}</p>
                            </div>
                            {selectedInvoice ? (
                              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${selectedInvoice.status === "PAID" ? "bg-brand-green text-white" : selectedInvoice.status === "PARTIAL" ? "bg-brand-orange text-white" : "bg-red-500 text-white"}`}>
                                {selectedInvoice.status}
                              </span>
                            ) : null}
                          </div>
                          {data.invoices.length > 1 ? (
                            <select
                              value={selectedInvoiceId}
                              onChange={(event) => setSelectedInvoiceId(event.target.value)}
                              className="mt-6 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none"
                            >
                              {data.invoices.map((invoice) => (
                                <option key={invoice.id} value={invoice.id} className="text-black">
                                  {invoice.termLabel} · {invoice.invoiceNumber}
                                </option>
                              ))}
                            </select>
                          ) : null}
                        </div>

                        <div className="p-8">
                          {selectedInvoice ? (
                            <>
                              <div className="mb-6 grid gap-3 text-sm text-[var(--text-secondary)] md:grid-cols-2">
                                <div>
                                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Title</div>
                                  <div className="mt-1 font-semibold text-[var(--text-primary)]">{selectedInvoice.title}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Term</div>
                                  <div className="mt-1 font-semibold text-[var(--text-primary)]">{selectedInvoice.termLabel}</div>
                                </div>
                              </div>

                              <table className="mb-6 w-full">
                                <tbody>
                                  {selectedInvoice.items.map((item) => (
                                    <tr key={item.id} className="border-b border-[var(--border-subtle)]">
                                      <td className="py-3 text-[var(--text-primary)]">{item.label}</td>
                                      <td className="py-3 text-right font-bold text-brand-green">₦{item.amount.toLocaleString()}</td>
                                    </tr>
                                  ))}
                                  <tr className="bg-[var(--surface-disabled)]">
                                    <td className="px-3 py-3 font-bold text-[var(--text-primary)]">Total Bill</td>
                                    <td className="px-3 py-3 text-right font-display text-xl text-[var(--text-primary)]">₦{selectedInvoice.totalAmount.toLocaleString()}</td>
                                  </tr>
                                </tbody>
                              </table>

                              <div className={`flex flex-col justify-between gap-4 rounded-xl border p-6 md:flex-row md:items-center ${remaining > 0 ? "border-brand-orange/30 bg-brand-orange/10" : "border-brand-green/30 bg-brand-green/10"}`}>
                                <div>
                                  <div className="mb-1 text-xs uppercase tracking-widest text-[var(--text-muted)]">Outstanding Balance</div>
                                  <div className={`font-display text-3xl ${remaining > 0 ? "text-brand-orange" : "text-brand-green"}`}>
                                    {remaining > 0 ? `₦${remaining.toLocaleString()}` : "Fully Paid ✓"}
                                  </div>
                                  <div className="mt-1 text-xs text-[var(--text-muted)]">Paid so far: ₦{selectedInvoice.amountPaid.toLocaleString()}</div>
                                </div>
                                {remaining > 0 ? (
                                  <button
                                    onClick={() => setShowPaystack(true)}
                                    disabled={processingPayment}
                                    className="inline-flex items-center gap-2 rounded-full bg-brand-green px-8 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-brand-green-dark disabled:opacity-50"
                                  >
                                    {processingPayment ? <LoaderCircle className="animate-spin" size={18} /> : <CreditCard size={18} />} Pay ₦{remaining.toLocaleString()} Now
                                  </button>
                                ) : null}
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-[var(--text-muted)]">No invoice available for the selected child yet.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                      <div className="mb-6 flex items-center justify-between">
                        <h3 className="font-display text-xl text-[var(--text-primary)]">Payment History & Receipts</h3>
                        <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-bold text-brand-green">{paymentSummary.receipts} receipt{paymentSummary.receipts === 1 ? "" : "s"}</span>
                      </div>

                      {data.payments.length ? (
                        <div className="space-y-3">
                          {data.payments.map((payment) => (
                            <button
                              key={payment.id}
                              onClick={() => {
                                if (!selectedInvoice) return;
                                setReceiptData({
                                  receiptNo: payment.receiptNumber,
                                  date: new Date(payment.paidAt).toLocaleDateString(),
                                  studentName: data.selectedChild?.displayName || "Student",
                                  studentClass: data.selectedChild?.className || "Class",
                                  studentId: data.selectedChild?.studentId || "ID",
                                  parentName: data.parent.displayName,
                                  parentPhone: data.parent.phone || "",
                                  parentEmail: data.parent.email || "",
                                  feeItems: selectedInvoice.items.map((item) => ({ label: item.label, amount: item.amount })),
                                  totalPaid: payment.amount,
                                  paymentMethod: formatMethod(payment.method),
                                  paymentReference: payment.reference,
                                  term: selectedInvoice.termLabel,
                                });
                                setShowReceipt(true);
                              }}
                              className="w-full rounded-xl bg-[var(--surface-disabled)] p-5 text-left transition-colors hover:bg-[var(--surface-card-hover)]"
                            >
                              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green shrink-0">
                                  <ReceiptIcon size={22} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="mb-1 flex items-center gap-3">
                                    <span className="text-lg font-bold text-[var(--text-primary)]">₦{payment.amount.toLocaleString()}</span>
                                    <span className="rounded-full bg-brand-green/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-green">{payment.status}</span>
                                  </div>
                                  <div className="text-xs text-[var(--text-muted)]">{new Date(payment.paidAt).toLocaleDateString()} · {formatMethod(payment.method)}</div>
                                  <div className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">{payment.receiptNumber}</div>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white">
                                  <Download size={14} /> View receipt
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="py-8 text-center text-[var(--text-muted)]">No payments recorded yet for the selected invoice.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <PaystackModal
        open={showPaystack}
        amount={remaining}
        email={data?.parent.email || "parent@example.com"}
        onClose={() => setShowPaystack(false)}
        onSuccess={handlePaymentSuccess}
      />

      <ReceiptModal open={showReceipt} data={receiptData} onClose={() => setShowReceipt(false)} />
    </>
  );
}
'@
Write-ProjectFile -RelativePath 'app\parent\fees\page.tsx' -Content $content

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
  finance: {
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
    latestInvoice: {
      id: string;
      invoiceNumber: string;
      termLabel: string;
      title: string;
      status: string;
      totalAmount: number;
      amountPaid: number;
      balanceDue: number;
      dueDate: string | null;
      issuedAt: string;
    } | null;
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
              Live child monitoring for attendance visibility, fee balance, recent alerts, and parent-ready academic access points.
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
                          { label: "Fee Balance", value: `₦${data.finance.totalOutstanding.toLocaleString()}`, icon: CreditCard },
                          { label: "Latest Invoice", value: data.finance.latestInvoice ? data.finance.latestInvoice.status : "None", icon: FileText },
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)]">
                            <div className="mb-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{stat.label}</div>
                            <div className="font-display text-2xl tracking-[2px] text-brand-green">{stat.value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h2 className="mb-2 font-display text-xl tracking-[2px] text-[var(--text-primary)]">Latest Invoice Snapshot</h2>
                            {data.finance.latestInvoice ? (
                              <>
                                <p className="text-sm text-[var(--text-secondary)]">{data.finance.latestInvoice.title} · {data.finance.latestInvoice.termLabel}</p>
                                <p className="mt-2 text-xs text-[var(--text-muted)]">Invoice {data.finance.latestInvoice.invoiceNumber}</p>
                              </>
                            ) : (
                              <p className="text-sm text-[var(--text-muted)]">No invoice has been issued for the selected child yet.</p>
                            )}
                          </div>
                          <Link href="/parent/fees" className="rounded-full bg-brand-green px-5 py-3 text-sm font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-brand-green-dark">
                            Open Fees
                          </Link>
                        </div>
                        {data.finance.latestInvoice ? (
                          <div className="mt-6 grid gap-4 md:grid-cols-3">
                            <div className="rounded-xl bg-[var(--surface-disabled)] p-4">
                              <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Total</div>
                              <div className="mt-2 font-display text-2xl text-[var(--text-primary)]">₦{data.finance.latestInvoice.totalAmount.toLocaleString()}</div>
                            </div>
                            <div className="rounded-xl bg-[var(--surface-disabled)] p-4">
                              <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Paid</div>
                              <div className="mt-2 font-display text-2xl text-brand-green">₦{data.finance.latestInvoice.amountPaid.toLocaleString()}</div>
                            </div>
                            <div className="rounded-xl bg-[var(--surface-disabled)] p-4">
                              <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Outstanding</div>
                              <div className="mt-2 font-display text-2xl text-brand-orange">₦{data.finance.latestInvoice.balanceDue.toLocaleString()}</div>
                            </div>
                          </div>
                        ) : null}
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
                            <Link key={item.title} href={item.link} className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-disabled)] p-5 transition-all hover:-translate-y-0.5 hover:border-brand-green/30">
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

# --- app/admin/fees/page.tsx ---
$content = @'
"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminSidebar from "@/components/AdminSidebar";
import {
  ArrowDownToLine,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  Receipt as ReceiptIcon,
  Search,
} from "lucide-react";

type FeesOverviewResponse = {
  summary: {
    totalBilled: number;
    totalCollected: number;
    totalOutstanding: number;
    collectionRate: number;
    invoiceCount: number;
    paidInvoices: number;
    partialInvoices: number;
    unpaidInvoices: number;
  };
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    title: string;
    termLabel: string;
    status: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    dueDate: string | null;
    issuedAt: string;
    student: {
      studentId: string;
      displayName: string;
      className: string;
    };
    parent: {
      displayName: string;
    };
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    method: string;
    reference: string;
    receiptNumber: string;
    paidAt: string;
    student: {
      studentId: string;
      displayName: string;
      className: string;
    };
  }>;
};

export default function AdminFeesPage() {
  const [data, setData] = useState<FeesOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchFees, setSearchFees] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/fees/overview", { cache: "no-store" });
        const body = (await response.json()) as FeesOverviewResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load fee management data.");
        if (!active) return;
        setData(body);
      } catch (overviewError) {
        if (!active) return;
        setData(null);
        setError(overviewError instanceof Error ? overviewError.message : "Unable to load fee management data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadOverview();
    return () => {
      active = false;
    };
  }, []);

  const filteredInvoices = useMemo(() => {
    if (!data) return [];
    const query = searchFees.trim().toLowerCase();
    if (!query) return data.invoices;
    return data.invoices.filter((invoice) =>
      [
        invoice.invoiceNumber,
        invoice.termLabel,
        invoice.student.displayName,
        invoice.student.studentId,
        invoice.student.className,
        invoice.parent.displayName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [data, searchFees]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy pb-14 pt-24 md:pb-20 md:pt-32">
          <div className="mx-auto max-w-7xl px-6">
            <h1 className="font-display text-[42px] leading-[1.05] tracking-[4px] text-white md:text-[72px]">
              FEE <span className="text-brand-green">MANAGEMENT</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/50 md:text-lg">
              Live invoice registry, collection status, and recent parent payments for the school finance team.
            </p>
          </div>
        </section>

        <section className="pb-20 pt-10 md:pb-28">
          <div className="mx-auto max-w-7xl px-6 flex flex-col lg:flex-row gap-8">
            <AdminSidebar />

            <div className="flex-1 space-y-6 min-w-0">
              {loading ? (
                <div className="rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading fee management data...
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: "Total Billed", value: data.summary.totalBilled, icon: ReceiptIcon, color: "text-brand-green" },
                      { label: "Total Collected", value: data.summary.totalCollected, icon: CheckCircle2, color: "text-brand-orange" },
                      { label: "Outstanding", value: data.summary.totalOutstanding, icon: ArrowDownToLine, color: "text-brand-green" },
                      { label: "Collection Rate", value: `${data.summary.collectionRate}%`, icon: CreditCard, color: "text-brand-orange", raw: true },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 shadow-[var(--card-shadow)]">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{stat.label}</span>
                          <stat.icon className={stat.color} size={18} />
                        </div>
                        <div className="font-display text-2xl text-[var(--text-primary)]">{stat.raw ? stat.value : `₦${Number(stat.value).toLocaleString()}`}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 shadow-[var(--card-shadow)]">
                      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h2 className="font-display text-2xl text-[var(--text-primary)]">Invoice Registry</h2>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">{data.summary.invoiceCount} invoice(s) across paid, partial, and unpaid states.</p>
                        </div>
                        <div className="relative md:w-[280px]">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                          <input
                            value={searchFees}
                            onChange={(event) => setSearchFees(event.target.value)}
                            placeholder="Search invoice, student, class..."
                            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-3 pl-10 pr-4 text-sm text-[var(--input-text)] outline-none focus:border-[var(--input-border-focus)]"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[var(--border-subtle)] text-left text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                              <th className="py-3 pr-4">Invoice</th>
                              <th className="py-3 pr-4">Student</th>
                              <th className="py-3 pr-4">Status</th>
                              <th className="py-3 pr-4 text-right">Billed</th>
                              <th className="py-3 pr-4 text-right">Paid</th>
                              <th className="py-3 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredInvoices.map((invoice) => (
                              <tr key={invoice.id} className="border-b border-[var(--border-subtle)] last:border-0">
                                <td className="py-4 pr-4">
                                  <div className="font-semibold text-[var(--text-primary)]">{invoice.invoiceNumber}</div>
                                  <div className="text-xs text-[var(--text-muted)]">{invoice.termLabel}</div>
                                </td>
                                <td className="py-4 pr-4">
                                  <div className="font-medium text-[var(--text-primary)]">{invoice.student.displayName}</div>
                                  <div className="text-xs text-[var(--text-muted)]">{invoice.student.className} · {invoice.parent.displayName}</div>
                                </td>
                                <td className="py-4 pr-4">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${invoice.status === "PAID" ? "bg-brand-green/15 text-brand-green" : invoice.status === "PARTIAL" ? "bg-brand-orange/15 text-brand-orange" : "bg-red-500/15 text-red-500"}`}>
                                    {invoice.status}
                                  </span>
                                </td>
                                <td className="py-4 pr-4 text-right font-semibold text-[var(--text-primary)]">₦{invoice.totalAmount.toLocaleString()}</td>
                                <td className="py-4 pr-4 text-right text-brand-green">₦{invoice.amountPaid.toLocaleString()}</td>
                                <td className="py-4 text-right text-brand-orange">₦{invoice.balanceDue.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-[2rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 shadow-[var(--card-shadow)]">
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <h2 className="font-display text-2xl text-[var(--text-primary)]">Recent Payments</h2>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">Latest successful payments recorded in the finance ledger.</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {data.recentPayments.length ? (
                          data.recentPayments.map((payment) => (
                            <div key={payment.id} className="rounded-xl bg-[var(--surface-disabled)] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-[var(--text-primary)]">{payment.student.displayName}</div>
                                  <div className="text-xs text-[var(--text-muted)]">{payment.student.className} · {new Date(payment.paidAt).toLocaleDateString()}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-display text-xl text-brand-green">₦{payment.amount.toLocaleString()}</div>
                                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{payment.method}</div>
                                </div>
                              </div>
                              <div className="mt-3 text-[10px] font-mono text-[var(--text-muted)]">{payment.receiptNumber}</div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[var(--text-muted)]">No payment history found.</p>
                        )}
                      </div>
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
Write-ProjectFile -RelativePath 'app\admin\fees\page.tsx' -Content $content

# --- app/admin/finances/page.tsx ---
$content = @'
"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminSidebar from "@/components/AdminSidebar";
import {
  ArrowUpCircle,
  BarChart3,
  CreditCard,
  Download,
  LoaderCircle,
  PiggyBank,
  Wallet,
} from "lucide-react";

type FinanceOverviewResponse = {
  cards: Array<{
    period: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  totals: {
    totalIncome: number;
    totalBilled: number;
    totalOutstanding: number;
    collectionRate: number;
  };
  recentIncome: Array<{
    id: string;
    date: string;
    category: string;
    amount: number;
    desc: string;
    receiptNumber: string;
  }>;
  classCollections: Array<{
    className: string;
    billed: number;
    paid: number;
    balance: number;
    collectionRate: number;
  }>;
};

export default function FinanceDashboardPage() {
  const [data, setData] = useState<FinanceOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadFinance() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/finances/overview", { cache: "no-store" });
        const body = (await response.json()) as FinanceOverviewResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load finance overview.");
        if (!active) return;
        setData(body);
      } catch (financeError) {
        if (!active) return;
        setData(null);
        setError(financeError instanceof Error ? financeError.message : "Unable to load finance overview.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFinance();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-primary)] theme-transition">
        <section className="bg-brand-navy px-6 pb-10 pt-24">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
            <div>
              <h1 className="font-display text-4xl tracking-widest text-white md:text-5xl">
                FINANCE <span className="text-brand-green">DASHBOARD</span>
              </h1>
              <p className="mt-2 text-sm text-white/60">Live income visibility, class collection performance, and fee cashflow summaries.</p>
            </div>
            <button className="hidden items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-brand-green-dark md:inline-flex">
              <Download size={14} /> Reports
            </button>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <AdminSidebar />

            <div className="flex-1 min-w-0 space-y-6">
              {loading ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 shadow-[var(--card-shadow)]">
                  <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                    <LoaderCircle className="animate-spin text-brand-green" size={20} /> Loading finance dashboard...
                  </div>
                </div>
              ) : null}

              {!loading && error ? (
                <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/10 p-6 shadow-[var(--card-shadow)] text-sm text-[var(--text-secondary)]">
                  {error}
                </div>
              ) : null}

              {!loading && data ? (
                <>
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                    <h3 className="mb-4 font-bold text-brand-green">Quick Actions</h3>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: "Record Income", icon: ArrowUpCircle, color: "bg-brand-green text-white" },
                        { label: "Invoice Registry", icon: CreditCard, color: "bg-brand-orange text-white" },
                        { label: "Collections", icon: Wallet, color: "bg-blue-500 text-white" },
                        { label: "Fee Savings", icon: PiggyBank, color: "bg-brand-green text-white" },
                      ].map((action) => (
                        <button key={action.label} className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-lg transition-all hover:opacity-90 ${action.color}`}>
                          <action.icon size={14} /> {action.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {data.cards.map((card) => (
                      <div key={card.period} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 shadow-[var(--card-shadow)]">
                        <div className="mb-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{card.period}</div>
                        <div className="font-display text-3xl text-brand-green">₦{card.income.toLocaleString()}</div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">Net: ₦{card.net.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                      <h3 className="font-display text-xl text-[var(--text-primary)]">Recent Income</h3>
                      <div className="mt-5 space-y-3">
                        {data.recentIncome.length ? (
                          data.recentIncome.map((item) => (
                            <div key={item.id} className="rounded-xl bg-[var(--surface-disabled)] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-[var(--text-primary)]">{item.desc}</div>
                                  <div className="text-xs text-[var(--text-muted)]">{new Date(item.date).toLocaleDateString()} · {item.category}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-display text-xl text-brand-green">₦{item.amount.toLocaleString()}</div>
                                  <div className="text-[10px] font-mono text-[var(--text-muted)]">{item.receiptNumber}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[var(--text-muted)]">No recent income entries found.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                      <h3 className="font-display text-xl text-[var(--text-primary)]">Class Collection Performance</h3>
                      <div className="mt-5 space-y-4">
                        {data.classCollections.length ? (
                          data.classCollections.map((item) => (
                            <div key={item.className} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-disabled)] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-[var(--text-primary)]">{item.className}</div>
                                  <div className="text-xs text-[var(--text-muted)]">Billed: ₦{item.billed.toLocaleString()} · Paid: ₦{item.paid.toLocaleString()}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-display text-xl text-brand-green">{item.collectionRate}%</div>
                                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">collection</div>
                                </div>
                              </div>
                              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                                <div className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-green-light" style={{ width: `${item.collectionRate}%` }} />
                              </div>
                              <div className="mt-3 text-xs text-brand-orange">Outstanding: ₦{item.balance.toLocaleString()}</div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[var(--text-muted)]">No class finance data found.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--card-shadow)]">
                    <h3 className="mb-4 font-bold text-brand-green text-lg">Yearly Summary</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      {[
                        { label: "Total Income", value: data.totals.totalIncome, accent: "text-brand-green" },
                        { label: "Total Billed", value: data.totals.totalBilled, accent: "text-[var(--text-primary)]" },
                        { label: "Outstanding", value: data.totals.totalOutstanding, accent: "text-brand-orange" },
                        { label: "Collection Rate", value: `${data.totals.collectionRate}%`, accent: "text-brand-green", raw: true },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl bg-[var(--surface-disabled)] p-5 text-center">
                          <div className="mb-1 text-xs text-[var(--text-muted)]">{item.label}</div>
                          <div className={`font-display text-2xl ${item.accent}`}>{item.raw ? item.value : `₦${Number(item.value).toLocaleString()}`}</div>
                        </div>
                      ))}
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
Write-ProjectFile -RelativePath 'app\admin\finances\page.tsx' -Content $content

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
    "db:bootstrap-finance": "tsx prisma/seed-finance.ts"
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

# --- prisma/seed-finance.ts ---
$content = @'
import { FeeInvoiceStatus, FeePaymentMethod, FeePaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getSchool } from "../lib/school";

function invoiceStatus(totalAmount: number, amountPaid: number, dueDate?: Date | null) {
  if (amountPaid >= totalAmount) return FeeInvoiceStatus.PAID;
  if (amountPaid > 0) return FeeInvoiceStatus.PARTIAL;
  if (dueDate && dueDate.getTime() < Date.now()) return FeeInvoiceStatus.OVERDUE;
  return FeeInvoiceStatus.UNPAID;
}

async function upsertInvoiceWithItems(input: {
  schoolId: string;
  studentProfileId: string;
  parentProfileId?: string | null;
  invoiceNumber: string;
  title: string;
  termLabel: string;
  dueDate?: Date | null;
  items: Array<{ label: string; amount: number; mandatory?: boolean; sortOrder: number }>;
}) {
  const totalAmount = input.items.reduce((sum, item) => sum + item.amount, 0);

  const invoice = await prisma.feeInvoice.upsert({
    where: { invoiceNumber: input.invoiceNumber },
    update: {
      schoolId: input.schoolId,
      studentProfileId: input.studentProfileId,
      parentProfileId: input.parentProfileId || null,
      title: input.title,
      termLabel: input.termLabel,
      totalAmount,
      dueDate: input.dueDate || null,
      balanceDue: totalAmount,
      amountPaid: 0,
      status: invoiceStatus(totalAmount, 0, input.dueDate),
    },
    create: {
      schoolId: input.schoolId,
      studentProfileId: input.studentProfileId,
      parentProfileId: input.parentProfileId || null,
      invoiceNumber: input.invoiceNumber,
      title: input.title,
      termLabel: input.termLabel,
      totalAmount,
      dueDate: input.dueDate || null,
      balanceDue: totalAmount,
      amountPaid: 0,
      status: invoiceStatus(totalAmount, 0, input.dueDate),
    },
  });

  await prisma.feeInvoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
  await prisma.feeInvoiceItem.createMany({
    data: input.items.map((item) => ({
      invoiceId: invoice.id,
      label: item.label,
      amount: item.amount,
      mandatory: item.mandatory ?? true,
      sortOrder: item.sortOrder,
    })),
  });

  return invoice;
}

async function upsertPayment(input: {
  schoolId: string;
  invoiceId: string;
  studentProfileId: string;
  parentProfileId?: string | null;
  amount: number;
  method: FeePaymentMethod;
  reference: string;
  receiptNumber: string;
  paidAt: Date;
  providerData?: Prisma.InputJsonValue;
}) {
  return prisma.feePayment.upsert({
    where: { reference: input.reference },
    update: {
      schoolId: input.schoolId,
      invoiceId: input.invoiceId,
      studentProfileId: input.studentProfileId,
      parentProfileId: input.parentProfileId || null,
      amount: input.amount,
      method: input.method,
      status: FeePaymentStatus.COMPLETED,
      receiptNumber: input.receiptNumber,
      paidAt: input.paidAt,
      providerData: input.providerData,
    },
    create: {
      schoolId: input.schoolId,
      invoiceId: input.invoiceId,
      studentProfileId: input.studentProfileId,
      parentProfileId: input.parentProfileId || null,
      amount: input.amount,
      method: input.method,
      status: FeePaymentStatus.COMPLETED,
      reference: input.reference,
      receiptNumber: input.receiptNumber,
      paidAt: input.paidAt,
      providerData: input.providerData,
    },
  });
}

async function refreshInvoiceTotals(invoiceId: string) {
  const invoice = await prisma.feeInvoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { where: { status: FeePaymentStatus.COMPLETED } } },
  });
  if (!invoice) return null;

  const amountPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const balanceDue = Math.max(invoice.totalAmount - amountPaid, 0);
  const status = invoiceStatus(invoice.totalAmount, amountPaid, invoice.dueDate);

  return prisma.feeInvoice.update({
    where: { id: invoice.id },
    data: { amountPaid, balanceDue, status },
  });
}

async function main() {
  const school = await getSchool();

  const parentProfile = await prisma.parentProfile.findFirst({
    where: { schoolId: school.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const students = await prisma.studentProfile.findMany({
    where: { schoolId: school.id, isActive: true },
    orderBy: { studentId: "asc" },
  });

  if (!students.length) {
    throw new Error("No student profiles found. Run attendance bootstrap first.");
  }

  const [studentA, studentB, studentC, studentD] = students;
  const now = new Date();
  const currentYear = now.getFullYear();
  const termLabel = `First Term ${currentYear}/${currentYear + 1}`;
  const dueSoon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
  const overdue = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);

  const invoiceA = await upsertInvoiceWithItems({
    schoolId: school.id,
    studentProfileId: studentA.id,
    parentProfileId: parentProfile?.id,
    invoiceNumber: `YKC-INV-${currentYear}-001`,
    title: `${studentA.displayName} School Fees`,
    termLabel,
    dueDate: dueSoon,
    items: [
      { label: "Tuition Fee", amount: 85000, sortOrder: 1 },
      { label: "Development Levy", amount: 15000, sortOrder: 2 },
      { label: "Exam Fee", amount: 8000, sortOrder: 3 },
      { label: "ICT Levy", amount: 12000, sortOrder: 4 },
      { label: "PTA Levy", amount: 5000, sortOrder: 5 },
    ],
  });

  const invoiceB = await upsertInvoiceWithItems({
    schoolId: school.id,
    studentProfileId: studentB.id,
    parentProfileId: parentProfile?.id,
    invoiceNumber: `YKC-INV-${currentYear}-002`,
    title: `${studentB.displayName} School Fees`,
    termLabel,
    dueDate: dueSoon,
    items: [
      { label: "Tuition Fee", amount: 80000, sortOrder: 1 },
      { label: "Development Levy", amount: 15000, sortOrder: 2 },
      { label: "Exam Fee", amount: 8000, sortOrder: 3 },
      { label: "ICT Levy", amount: 10000, sortOrder: 4 },
      { label: "PTA Levy", amount: 5000, sortOrder: 5 },
    ],
  });

  const invoiceC = studentC
    ? await upsertInvoiceWithItems({
        schoolId: school.id,
        studentProfileId: studentC.id,
        invoiceNumber: `YKC-INV-${currentYear}-003`,
        title: `${studentC.displayName} School Fees`,
        termLabel,
        dueDate: dueSoon,
        items: [
          { label: "Tuition Fee", amount: 90000, sortOrder: 1 },
          { label: "Development Levy", amount: 15000, sortOrder: 2 },
          { label: "Exam Fee", amount: 8000, sortOrder: 3 },
          { label: "ICT Levy", amount: 12000, sortOrder: 4 },
          { label: "PTA Levy", amount: 5000, sortOrder: 5 },
        ],
      })
    : null;

  const invoiceD = studentD
    ? await upsertInvoiceWithItems({
        schoolId: school.id,
        studentProfileId: studentD.id,
        invoiceNumber: `YKC-INV-${currentYear}-004`,
        title: `${studentD.displayName} School Fees`,
        termLabel,
        dueDate: overdue,
        items: [
          { label: "Tuition Fee", amount: 78000, sortOrder: 1 },
          { label: "Development Levy", amount: 12000, sortOrder: 2 },
          { label: "Exam Fee", amount: 8000, sortOrder: 3 },
          { label: "ICT Levy", amount: 9000, sortOrder: 4 },
        ],
      })
    : null;

  const baseDate = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 7));

  await upsertPayment({
    schoolId: school.id,
    invoiceId: invoiceA.id,
    studentProfileId: studentA.id,
    parentProfileId: parentProfile?.id,
    amount: 80000,
    method: FeePaymentMethod.BANK_TRANSFER,
    reference: `YKC-SEED-PAY-${currentYear}-001`,
    receiptNumber: `YKC-RCP-${currentYear}-001`,
    paidAt: new Date(baseDate),
    providerData: { seeded: true },
  });

  await upsertPayment({
    schoolId: school.id,
    invoiceId: invoiceC?.id || invoiceA.id,
    studentProfileId: studentC?.id || studentA.id,
    amount: invoiceC ? invoiceC.totalAmount : 5000,
    method: FeePaymentMethod.CARD,
    reference: `YKC-SEED-PAY-${currentYear}-002`,
    receiptNumber: `YKC-RCP-${currentYear}-002`,
    paidAt: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000),
    providerData: { seeded: true },
  });

  if (invoiceB) {
    await upsertPayment({
      schoolId: school.id,
      invoiceId: invoiceB.id,
      studentProfileId: studentB.id,
      parentProfileId: parentProfile?.id,
      amount: 25000,
      method: FeePaymentMethod.PAYSTACK,
      reference: `YKC-SEED-PAY-${currentYear}-003`,
      receiptNumber: `YKC-RCP-${currentYear}-003`,
      paidAt: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      providerData: { seeded: true },
    });
  }

  await refreshInvoiceTotals(invoiceA.id);
  await refreshInvoiceTotals(invoiceB.id);
  if (invoiceC) await refreshInvoiceTotals(invoiceC.id);
  if (invoiceD) await refreshInvoiceTotals(invoiceD.id);

  console.log("\nFinance bootstrap complete.\n");
  console.table([
    {
      invoice: invoiceA.invoiceNumber,
      student: studentA.displayName,
      note: "Partial invoice with prior bank transfer",
    },
    {
      invoice: invoiceB.invoiceNumber,
      student: studentB.displayName,
      note: "Partial invoice for linked second child",
    },
    {
      invoice: invoiceC?.invoiceNumber || "n/a",
      student: studentC?.displayName || "n/a",
      note: "Fully paid invoice for admin finance visibility",
    },
    {
      invoice: invoiceD?.invoiceNumber || "n/a",
      student: studentD?.displayName || "n/a",
      note: "Overdue unpaid invoice",
    },
  ]);
  console.log("Parent fees, admin fee registry, and finance dashboard now have live seeded data.");
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
Write-ProjectFile -RelativePath 'prisma\seed-finance.ts' -Content $content

# --- PHASE3D_FINANCE_LIVE_DATA_NOTES.md ---
$content = @'
# Phase 3D — Finance Live Data Conversion

## What was implemented
Phase 3D converts fees and finance from static demo UI into database-backed workflows.

### Schema additions
- `FeeInvoiceStatus`
- `FeePaymentMethod`
- `FeePaymentStatus`
- `FeeInvoice`
- `FeeInvoiceItem`
- `FeePayment`

### New API routes
- `GET /api/parent/fees`
- `POST /api/parent/fees/payments`
- `GET /api/admin/fees/overview`
- `GET /api/admin/finances/overview`

### Updated pages
- `app/parent/fees/page.tsx`
- `app/parent/dashboard/page.tsx`
- `app/admin/fees/page.tsx`
- `app/admin/finances/page.tsx`

### New bootstrap script
- `prisma/seed-finance.ts`
- npm script: `npm run db:bootstrap-finance`

## What the parent portal now supports
- live invoice lookup by linked child
- live payment history
- receipt generation from real fee records
- modal payment persistence into DB using the current paystack demo success flow
- parent dashboard now shows live fee balance and latest invoice snapshot

## What the admin portal now supports
- live invoice registry
- billed / collected / outstanding summary cards
- recent payment history
- finance dashboard period summaries
- class collection performance

## Bootstrap behavior
The finance bootstrap seeds:
- one partial invoice for the main linked child
- one partial invoice for the second linked child
- one fully paid invoice for admin visibility
- one overdue unpaid invoice
- multiple fee payments / receipts

## Required commands after ingestion
```powershell
npx prisma generate
npx prisma migrate dev --name phase_3d_finance_live_data
npm run db:bootstrap-finance
npm run build
```

If using committed migration deployment flow:
```powershell
npx prisma generate
npx prisma migrate deploy
npm run db:bootstrap-finance
npm run build
```

## Recommended git branch
```powershell
git checkout -b phase/3d-finance-live-data
```
'@
Write-ProjectFile -RelativePath 'PHASE3D_FINANCE_LIVE_DATA_NOTES.md' -Content $content

Write-Host "Phase 3D Finance Live Data files applied successfully." -ForegroundColor Cyan