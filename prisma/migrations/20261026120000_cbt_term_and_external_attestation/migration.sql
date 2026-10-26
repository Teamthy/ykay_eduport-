-- Curriculum term assignments are optional for legacy bank rows until they are
-- verified against the supplied scheme. Personal practice may filter assigned rows.
ALTER TABLE "CbtQuestion" ADD COLUMN "term" TEXT;
ALTER TABLE "CbtQuestion" ADD COLUMN "reviewedByExternalActor" TEXT;
ALTER TABLE "CbtAttempt" ADD COLUMN "term" TEXT;
CREATE INDEX "CbtQuestion_subjectId_term_status_idx"
  ON "CbtQuestion"("subjectId", "term", "status");

-- A GitHub workflow actor is an external attestor, not an application user.
-- Store the evidence separately rather than misattributing a school AuditLog row.
CREATE TABLE "CbtBankAttestation" (
  "id" TEXT NOT NULL,
  "externalActor" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "bankFile" TEXT NOT NULL,
  "repository" TEXT,
  "runId" TEXT,
  "runUrl" TEXT,
  "attestedCount" INTEGER NOT NULL,
  "notAttestedCount" INTEGER NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "CbtBankAttestation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CbtBankAttestation_reviewedAt_idx"
  ON "CbtBankAttestation"("reviewedAt");
CREATE INDEX "CbtBankAttestation_externalActor_reviewedAt_idx"
  ON "CbtBankAttestation"("externalActor", "reviewedAt");
