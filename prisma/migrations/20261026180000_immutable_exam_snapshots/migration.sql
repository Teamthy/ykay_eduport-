-- Immutable question revisions and published exam snapshots.
CREATE TABLE "ExamQuestionVersion" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "type" "ExamQuestionType" NOT NULL,
  "questionText" TEXT NOT NULL,
  "options" JSONB,
  "correctKey" TEXT,
  "correctText" TEXT,
  "marks" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExamQuestionVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExamQuestionVersion_questionId_version_key" ON "ExamQuestionVersion"("questionId", "version");
CREATE INDEX "ExamQuestionVersion_schoolId_idx" ON "ExamQuestionVersion"("schoolId");
CREATE INDEX "ExamQuestionVersion_questionId_createdAt_idx" ON "ExamQuestionVersion"("questionId", "createdAt");
ALTER TABLE "ExamQuestionVersion" ADD CONSTRAINT "ExamQuestionVersion_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamQuestionVersion" ADD CONSTRAINT "ExamQuestionVersion_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExamQuestion" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ExamQuestion" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE TABLE "ExamSnapshot" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "subjectName" TEXT NOT NULL,
  "instructions" TEXT,
  "durationMinutes" INTEGER NOT NULL,
  "theoryMinutes" INTEGER NOT NULL,
  "passMark" INTEGER NOT NULL,
  "totalMarks" INTEGER NOT NULL,
  "shuffleQuestions" BOOLEAN NOT NULL,
  "scheduledFor" TIMESTAMP(3),
  "availableUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExamSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExamSnapshot_examId_revision_key" ON "ExamSnapshot"("examId", "revision");
CREATE INDEX "ExamSnapshot_schoolId_idx" ON "ExamSnapshot"("schoolId");
CREATE INDEX "ExamSnapshot_examId_createdAt_idx" ON "ExamSnapshot"("examId", "createdAt");
ALTER TABLE "ExamSnapshot" ADD CONSTRAINT "ExamSnapshot_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamSnapshot" ADD CONSTRAINT "ExamSnapshot_examId_fkey"
  FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ExamSnapshotQuestion" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "snapshotId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "questionVersionId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "ExamSnapshotQuestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExamSnapshotQuestion_snapshotId_questionId_key" ON "ExamSnapshotQuestion"("snapshotId", "questionId");
CREATE UNIQUE INDEX "ExamSnapshotQuestion_snapshotId_sortOrder_key" ON "ExamSnapshotQuestion"("snapshotId", "sortOrder");
CREATE INDEX "ExamSnapshotQuestion_schoolId_idx" ON "ExamSnapshotQuestion"("schoolId");
CREATE INDEX "ExamSnapshotQuestion_questionVersionId_idx" ON "ExamSnapshotQuestion"("questionVersionId");
ALTER TABLE "ExamSnapshotQuestion" ADD CONSTRAINT "ExamSnapshotQuestion_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamSnapshotQuestion" ADD CONSTRAINT "ExamSnapshotQuestion_snapshotId_fkey"
  FOREIGN KEY ("snapshotId") REFERENCES "ExamSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamSnapshotQuestion" ADD CONSTRAINT "ExamSnapshotQuestion_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamSnapshotQuestion" ADD CONSTRAINT "ExamSnapshotQuestion_questionVersionId_fkey"
  FOREIGN KEY ("questionVersionId") REFERENCES "ExamQuestionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill one immutable content version for every existing question.
INSERT INTO "ExamQuestionVersion" ("id", "schoolId", "questionId", "version", "type", "questionText", "options", "correctKey", "correctText", "marks")
SELECT 'legacy-version-' || md5(q."id" || ':1'), e."schoolId", q."id", 1, q."type", q."questionText", q."options", q."correctKey", q."correctText", q."marks"
FROM "ExamQuestion" q JOIN "Exam" e ON e."id" = q."examId";

-- Freeze the current assessment settings and question ordering for every existing exam.
INSERT INTO "ExamSnapshot" ("id", "schoolId", "examId", "revision", "title", "subjectName", "instructions", "durationMinutes", "theoryMinutes", "passMark", "totalMarks", "shuffleQuestions", "scheduledFor", "availableUntil")
SELECT 'legacy-snapshot-' || md5(e."id"), e."schoolId", e."id", 1, e."title", e."subjectName", e."instructions", e."durationMinutes", COALESCE(e."theoryMinutes", 0), e."passMark",
       COALESCE((SELECT SUM(q."marks") FROM "ExamQuestion" q WHERE q."examId" = e."id"), 0), e."shuffleQuestions", e."scheduledFor", e."availableUntil"
FROM "Exam" e;

INSERT INTO "ExamSnapshotQuestion" ("id", "schoolId", "snapshotId", "questionId", "questionVersionId", "sortOrder")
SELECT 'legacy-snapshot-question-' || md5(e."id" || ':' || q."id"), e."schoolId",
       'legacy-snapshot-' || md5(e."id"), q."id", 'legacy-version-' || md5(q."id" || ':1'), q."sortOrder"
FROM "Exam" e JOIN "ExamQuestion" q ON q."examId" = e."id";

ALTER TABLE "ExamAttempt" ADD COLUMN "snapshotId" TEXT;
UPDATE "ExamAttempt" a SET "snapshotId" = 'legacy-snapshot-' || md5(a."examId");
ALTER TABLE "ExamAttempt" ALTER COLUMN "snapshotId" SET NOT NULL;
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_snapshotId_fkey"
  FOREIGN KEY ("snapshotId") REFERENCES "ExamSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExamAnswer" ADD COLUMN "snapshotQuestionId" TEXT;
UPDATE "ExamAnswer" a SET "snapshotQuestionId" = sq."id"
FROM "ExamAttempt" at, "ExamSnapshotQuestion" sq
WHERE a."attemptId" = at."id" AND sq."snapshotId" = at."snapshotId" AND sq."questionId" = a."questionId";
-- An answer with no matching question has inconsistent historical data; fail the migration rather than invent a relation.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "ExamAnswer" WHERE "snapshotQuestionId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot snapshot historical exam answers: at least one answer has no matching question';
  END IF;
END $$;
ALTER TABLE "ExamAnswer" ALTER COLUMN "snapshotQuestionId" SET NOT NULL;
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_snapshotQuestionId_fkey"
  FOREIGN KEY ("snapshotQuestionId") REFERENCES "ExamSnapshotQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamAnswer" DROP CONSTRAINT "ExamAnswer_questionId_fkey";
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamAnswer" DROP CONSTRAINT "ExamAnswer_attemptId_fkey";
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_attemptId_fkey"
  FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Every question insert/update creates a durable revision. Revision rows are never editable/deletable.
CREATE OR REPLACE FUNCTION increment_exam_question_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."version" := OLD."version" + 1;
  RETURN NEW;
END $$;
CREATE TRIGGER "ExamQuestion_increment_version" BEFORE UPDATE ON "ExamQuestion"
FOR EACH ROW EXECUTE FUNCTION increment_exam_question_version();

CREATE OR REPLACE FUNCTION record_exam_question_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE question_school_id TEXT;
BEGIN
  SELECT e."schoolId" INTO question_school_id
  FROM "ExamQuestion" q JOIN "Exam" e ON e."id" = q."examId"
  WHERE q."id" = NEW."id";
  INSERT INTO "ExamQuestionVersion" ("id", "schoolId", "questionId", "version", "type", "questionText", "options", "correctKey", "correctText", "marks")
  VALUES ('question-version-' || gen_random_uuid()::text, question_school_id, NEW."id", NEW."version", NEW."type", NEW."questionText", NEW."options", NEW."correctKey", NEW."correctText", NEW."marks");
  RETURN NEW;
END $$;
CREATE TRIGGER "ExamQuestion_record_version" AFTER INSERT OR UPDATE ON "ExamQuestion"
FOR EACH ROW EXECUTE FUNCTION record_exam_question_version();

CREATE OR REPLACE FUNCTION reject_exam_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Published exam snapshots and question versions are immutable';
END $$;
CREATE TRIGGER "ExamQuestionVersion_immutable" BEFORE UPDATE OR DELETE ON "ExamQuestionVersion"
FOR EACH ROW EXECUTE FUNCTION reject_exam_snapshot_mutation();
CREATE TRIGGER "ExamSnapshot_immutable" BEFORE UPDATE OR DELETE ON "ExamSnapshot"
FOR EACH ROW EXECUTE FUNCTION reject_exam_snapshot_mutation();
CREATE TRIGGER "ExamSnapshotQuestion_immutable" BEFORE UPDATE OR DELETE ON "ExamSnapshotQuestion"
FOR EACH ROW EXECUTE FUNCTION reject_exam_snapshot_mutation();

-- Fee payments are ledger facts. Corrections are new, signed compensating entries.
CREATE TABLE "FeePaymentCorrection" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "amountDelta" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeePaymentCorrection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeePaymentCorrection_reference_key" ON "FeePaymentCorrection"("reference");
CREATE UNIQUE INDEX "FeePaymentCorrection_paymentId_key" ON "FeePaymentCorrection"("paymentId");
CREATE INDEX "FeePaymentCorrection_schoolId_idx" ON "FeePaymentCorrection"("schoolId");
CREATE INDEX "FeePaymentCorrection_paymentId_createdAt_idx" ON "FeePaymentCorrection"("paymentId", "createdAt");
CREATE INDEX "FeePaymentCorrection_invoiceId_createdAt_idx" ON "FeePaymentCorrection"("invoiceId", "createdAt");
ALTER TABLE "FeePaymentCorrection" ADD CONSTRAINT "FeePaymentCorrection_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "FeePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeePaymentCorrection" ADD CONSTRAINT "FeePaymentCorrection_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "FeeInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeePaymentCorrection" ADD CONSTRAINT "FeePaymentCorrection_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prevent changes/deletes to receipt facts, even if a future application path is careless.
CREATE OR REPLACE FUNCTION reject_financial_ledger_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Financial ledger entries are immutable; append a compensating entry';
END $$;
CREATE TRIGGER "FeePayment_immutable" BEFORE UPDATE OR DELETE ON "FeePayment"
FOR EACH ROW EXECUTE FUNCTION reject_financial_ledger_mutation();
CREATE TRIGGER "FeePaymentCorrection_immutable" BEFORE UPDATE OR DELETE ON "FeePaymentCorrection"
FOR EACH ROW EXECUTE FUNCTION reject_financial_ledger_mutation();

-- Existing payment rows must not disappear through parent/invoice deletion.
ALTER TABLE "FeePayment" DROP CONSTRAINT "FeePayment_schoolId_fkey";
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeePayment" DROP CONSTRAINT "FeePayment_invoiceId_fkey";
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "FeeInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeePayment" DROP CONSTRAINT "FeePayment_studentProfileId_fkey";
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeePayment" DROP CONSTRAINT "FeePayment_parentProfileId_fkey";
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "ParentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Monotonic per-attempt save sequence rejects delayed/replayed full-answer payloads.
ALTER TABLE "ExamAttempt" ADD COLUMN "lastClientSequence" INTEGER NOT NULL DEFAULT 0;

-- Authenticated but unpostable provider events are actionable, deduplicated finance work items.
CREATE TABLE "PaymentReconciliationIssue" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "expectedAmount" INTEGER,
  "receivedAmount" INTEGER,
  "receivedCurrency" TEXT,
  "payload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "resolutionNote" TEXT,
  "resolvedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentReconciliationIssue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentReconciliationIssue_provider_reference_key" ON "PaymentReconciliationIssue"("provider", "reference");
CREATE INDEX "PaymentReconciliationIssue_status_createdAt_idx" ON "PaymentReconciliationIssue"("status", "createdAt");

-- Attempts stay pinned to their publication; answer identity/response cannot be rewritten after submit.
CREATE OR REPLACE FUNCTION protect_exam_attempt_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Exam attempts are retained as assessment records';
  END IF;
  IF OLD."snapshotId" IS DISTINCT FROM NEW."snapshotId" THEN
    RAISE EXCEPTION 'An exam attempt cannot be moved to another snapshot';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "ExamAttempt_snapshot_immutable" BEFORE UPDATE OR DELETE ON "ExamAttempt"
FOR EACH ROW EXECUTE FUNCTION protect_exam_attempt_snapshot();

CREATE OR REPLACE FUNCTION protect_exam_answer_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE attempt_status "ExamAttemptStatus";
BEGIN
  SELECT "status" INTO attempt_status FROM "ExamAttempt" WHERE "id" = OLD."attemptId";
  IF TG_OP = 'DELETE' THEN
    IF attempt_status IS DISTINCT FROM 'IN_PROGRESS'::"ExamAttemptStatus" THEN
      RAISE EXCEPTION 'Submitted exam answers cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD."attemptId" IS DISTINCT FROM NEW."attemptId"
    OR OLD."questionId" IS DISTINCT FROM NEW."questionId"
    OR OLD."snapshotQuestionId" IS DISTINCT FROM NEW."snapshotQuestionId" THEN
    RAISE EXCEPTION 'An exam answer cannot be moved to another attempt or snapshot question';
  END IF;
  IF OLD."response" IS DISTINCT FROM NEW."response"
    AND attempt_status IS DISTINCT FROM 'IN_PROGRESS'::"ExamAttemptStatus" THEN
    RAISE EXCEPTION 'A submitted exam response cannot be changed';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "ExamAnswer_snapshot_protected" BEFORE UPDATE OR DELETE ON "ExamAnswer"
FOR EACH ROW EXECUTE FUNCTION protect_exam_answer_snapshot();

-- Preserve tenant-scoped database policies on every new school-owned table.
SELECT eduos_apply_tenant_rls('ExamQuestionVersion');
SELECT eduos_apply_tenant_rls('ExamSnapshot');
SELECT eduos_apply_tenant_rls('ExamSnapshotQuestion');
SELECT eduos_apply_tenant_rls('FeePaymentCorrection');

-- Admission payment transactions may progress from pending/failed to paid, but a posted paid fact cannot be rewritten/deleted.
CREATE OR REPLACE FUNCTION protect_paid_payment_transaction() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" = 'PAID'::"PaymentStatus" THEN
    RAISE EXCEPTION 'Posted admission payment transactions are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "PaymentTransaction_paid_immutable" BEFORE UPDATE OR DELETE ON "PaymentTransaction"
FOR EACH ROW EXECUTE FUNCTION protect_paid_payment_transaction();
