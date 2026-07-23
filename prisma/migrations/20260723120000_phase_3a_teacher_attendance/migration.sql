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
