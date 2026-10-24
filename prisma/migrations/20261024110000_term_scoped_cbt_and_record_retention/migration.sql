-- Make CBT records term-aware without assigning a made-up term to legacy
-- exams. New exams are linked to the active Term by the server; old rows stay
-- NULL until an administrator can verify their historical term.
ALTER TABLE "Exam"
  ADD COLUMN "termId" TEXT,
  ADD COLUMN "practiceCategory" TEXT,
  ADD COLUMN "gradebookComponent" TEXT;

CREATE INDEX "Exam_termId_idx" ON "Exam"("termId");

ALTER TABLE "Exam"
  ADD CONSTRAINT "Exam_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "Term"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Assessment records are archival school data. Prevent hard-deleting an
-- exam, student, term, session, gradebook, or profile from cascading away
-- submitted scores or progression history.
ALTER TABLE "ExamAttempt" DROP CONSTRAINT "ExamAttempt_examId_fkey";
ALTER TABLE "ExamAttempt"
  ADD CONSTRAINT "ExamAttempt_examId_fkey"
  FOREIGN KEY ("examId") REFERENCES "Exam"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExamAttempt" DROP CONSTRAINT "ExamAttempt_studentProfileId_fkey";
ALTER TABLE "ExamAttempt"
  ADD CONSTRAINT "ExamAttempt_studentProfileId_fkey"
  FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExamRetake" DROP CONSTRAINT "ExamRetake_studentProfileId_fkey";
ALTER TABLE "ExamRetake"
  ADD CONSTRAINT "ExamRetake_studentProfileId_fkey"
  FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReportCard" DROP CONSTRAINT "ReportCard_studentProfileId_fkey";
ALTER TABLE "ReportCard"
  ADD CONSTRAINT "ReportCard_studentProfileId_fkey"
  FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GradebookEntry" DROP CONSTRAINT "GradebookEntry_gradebookId_fkey";
ALTER TABLE "GradebookEntry"
  ADD CONSTRAINT "GradebookEntry_gradebookId_fkey"
  FOREIGN KEY ("gradebookId") REFERENCES "SubjectGradebook"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GradebookEntry" DROP CONSTRAINT "GradebookEntry_studentProfileId_fkey";
ALTER TABLE "GradebookEntry"
  ADD CONSTRAINT "GradebookEntry_studentProfileId_fkey"
  FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentEnrolment" DROP CONSTRAINT "StudentEnrolment_studentProfileId_fkey";
ALTER TABLE "StudentEnrolment"
  ADD CONSTRAINT "StudentEnrolment_studentProfileId_fkey"
  FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentEnrolment" DROP CONSTRAINT "StudentEnrolment_sessionId_fkey";
ALTER TABLE "StudentEnrolment"
  ADD CONSTRAINT "StudentEnrolment_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep the source and rollback value for every released score written into a
-- cumulative gradebook. Hiding a result can then restore the prior component
-- only when that gradebook value has not been changed since the sync.
CREATE TABLE "ExamGradebookSync" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "gradebookEntryId" TEXT NOT NULL,
  "component" TEXT NOT NULL,
  "previousValue" INTEGER NOT NULL,
  "syncedValue" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamGradebookSync_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExamGradebookSync_examId_studentProfileId_key"
  ON "ExamGradebookSync"("examId", "studentProfileId");
CREATE INDEX "ExamGradebookSync_schoolId_examId_idx"
  ON "ExamGradebookSync"("schoolId", "examId");
CREATE INDEX "ExamGradebookSync_gradebookEntryId_isActive_idx"
  ON "ExamGradebookSync"("gradebookEntryId", "isActive");
CREATE INDEX "ExamGradebookSync_studentProfileId_isActive_idx"
  ON "ExamGradebookSync"("studentProfileId", "isActive");

ALTER TABLE "ExamGradebookSync"
  ADD CONSTRAINT "ExamGradebookSync_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamGradebookSync"
  ADD CONSTRAINT "ExamGradebookSync_examId_fkey"
  FOREIGN KEY ("examId") REFERENCES "Exam"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamGradebookSync"
  ADD CONSTRAINT "ExamGradebookSync_studentProfileId_fkey"
  FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamGradebookSync"
  ADD CONSTRAINT "ExamGradebookSync_gradebookEntryId_fkey"
  FOREIGN KEY ("gradebookEntryId") REFERENCES "GradebookEntry"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- New tenant tables must receive the RLS policies from the existing helper;
-- migrations added later do not automatically re-run the global backfill.
SELECT eduos_apply_tenant_rls('ExamGradebookSync');
