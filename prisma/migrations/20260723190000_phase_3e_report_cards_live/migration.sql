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