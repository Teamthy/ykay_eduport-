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