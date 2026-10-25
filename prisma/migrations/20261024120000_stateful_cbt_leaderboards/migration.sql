-- Imported CBT content is hidden by default. Only an authorized human reviewer
-- with a recorded curriculum/exam citation may move a question to "reviewed".
ALTER TABLE "CbtQuestion" ALTER COLUMN "status" SET DEFAULT 'draft';
ALTER TABLE "CbtQuestion"
  ADD COLUMN "reviewedByUserId" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewReference" TEXT,
  ADD COLUMN "reviewNotes" TEXT;

-- Historical "reviewed"/"published" labels have no reviewer/source
-- attestation in this schema. Return them to draft rather than presenting
-- unverified content; reviewers can approve from the new workflow.
UPDATE "CbtQuestion"
SET "status" = 'draft', "reviewedByUserId" = NULL, "reviewedAt" = NULL,
    "reviewReference" = NULL, "reviewNotes" = NULL
WHERE "status" IN ('reviewed', 'published');

CREATE INDEX "CbtQuestion_status_reviewedAt_idx"
  ON "CbtQuestion"("status", "reviewedAt");

ALTER TABLE "CbtQuestion"
  ADD CONSTRAINT "CbtQuestion_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CbtQuestion_review_attestation_check"
    CHECK (
      "status" <> 'reviewed' OR (
        "reviewedByUserId" IS NOT NULL AND
        "reviewedAt" IS NOT NULL AND
        "reviewReference" IS NOT NULL AND
        length(trim("reviewReference")) >= 10 AND
        "reviewNotes" IS NOT NULL AND
        length(trim("reviewNotes")) >= 20
      )
    );

-- Make curriculum practice attempts resumable and safely attributable to the
-- authenticated student. Historical anonymous attempt rows remain valid; the
-- nullable owner columns are populated for new personal-practice sessions.
ALTER TABLE "CbtAttempt"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "schoolId" TEXT,
  ADD COLUMN "studentProfileId" TEXT,
  ADD COLUMN "classLevel" TEXT,
  ADD COLUMN "practiceMode" TEXT,
  ADD COLUMN "topic" TEXT,
  ADD COLUMN "subjectIds" JSONB,
  ADD COLUMN "questionIds" JSONB,
  ADD COLUMN "drawToken" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN "isTimed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deadlineAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "CbtAttempt_userId_status_createdAt_idx"
  ON "CbtAttempt"("userId", "status", "createdAt");
CREATE INDEX "CbtAttempt_schoolId_createdAt_idx"
  ON "CbtAttempt"("schoolId", "createdAt");
CREATE INDEX "CbtAttempt_studentProfileId_createdAt_idx"
  ON "CbtAttempt"("studentProfileId", "createdAt");

ALTER TABLE "CbtAttempt"
  ADD CONSTRAINT "CbtAttempt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CbtAttempt_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CbtAttempt_studentProfileId_fkey"
    FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CbtPracticeAnswer" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "selectedIndex" INTEGER NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "correctIndex" INTEGER NOT NULL,
  "explanation" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CbtPracticeAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CbtPracticeAnswer_attemptId_questionId_key"
  ON "CbtPracticeAnswer"("attemptId", "questionId");
CREATE INDEX "CbtPracticeAnswer_questionId_idx"
  ON "CbtPracticeAnswer"("questionId");

ALTER TABLE "CbtPracticeAnswer"
  ADD CONSTRAINT "CbtPracticeAnswer_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "CbtAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CbtPracticeAnswer_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "CbtQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
