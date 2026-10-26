import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "prisma/migrations/20261026180000_immutable_exam_snapshots/migration.sql"),
  "utf8",
);

describe("immutable ledger and snapshot migration controls", () => {
  it("backfills historical exam versions, snapshots and answer links before enforcing required references", () => {
    expect(migration).toContain('INSERT INTO "ExamQuestionVersion"');
    expect(migration).toContain('INSERT INTO "ExamSnapshot"');
    expect(migration).toContain('UPDATE "ExamAnswer" a SET "snapshotQuestionId"');
    expect(migration.indexOf('UPDATE "ExamAnswer" a SET "snapshotQuestionId"')).toBeLessThan(
      migration.indexOf('ALTER TABLE "ExamAnswer" ALTER COLUMN "snapshotQuestionId" SET NOT NULL'),
    );
  });

  it("installs database guards for published snapshots, question versions and payment ledger rows", () => {
    expect(migration).toContain('CREATE TRIGGER "ExamQuestionVersion_immutable"');
    expect(migration).toContain('CREATE TRIGGER "ExamSnapshot_immutable"');
    expect(migration).toContain('CREATE TRIGGER "ExamSnapshotQuestion_immutable"');
    expect(migration).toContain('CREATE TRIGGER "ExamAttempt_snapshot_immutable"');
    expect(migration).toContain('CREATE TRIGGER "ExamAnswer_snapshot_protected"');
    expect(migration).toContain('CREATE TRIGGER "FeePayment_immutable"');
    expect(migration).toContain('CREATE TRIGGER "FeePaymentCorrection_immutable"');
    expect(migration).toContain('CREATE TRIGGER "PaymentTransaction_paid_immutable"');
    expect(migration).toContain("append a compensating entry");
  });

  it("prevents ledger facts from disappearing via cascading deletion", () => {
    expect(migration).toContain(
      '"FeePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "FeeInvoice"("id") ON DELETE RESTRICT',
    );
    expect(migration).toContain(
      '"FeePayment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT',
    );
    expect(migration).toContain("eduos_apply_tenant_rls('ExamQuestionVersion')");
    expect(migration).toContain("eduos_apply_tenant_rls('ExamSnapshot')");
    expect(migration).toContain("eduos_apply_tenant_rls('FeePaymentCorrection')");
  });
});
