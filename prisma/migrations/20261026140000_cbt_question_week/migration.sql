ALTER TABLE "CbtQuestion" ADD COLUMN "week" INTEGER;
ALTER TABLE "CbtAttempt" ADD COLUMN "week" INTEGER;

CREATE INDEX "CbtQuestion_subjectId_term_week_status_idx"
  ON "CbtQuestion"("subjectId", "term", "week", "status");
