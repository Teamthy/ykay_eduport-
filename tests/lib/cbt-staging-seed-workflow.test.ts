import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  join(process.cwd(), ".github/workflows/seed-cbt-bank-staging.yml"),
  "utf8",
);

describe("staging CBT seed workflow schema readiness", () => {
  it("validates the isolated target and applies migrations before importing questions", () => {
    const targetGuard = workflow.indexOf("npm run db:seed-staging-demo -- --check-target");
    const migrationDeploy = workflow.indexOf(
      "npx prisma migrate deploy --schema prisma/schema.prisma",
    );
    const seed = workflow.indexOf("CBT_SEED_TARGET=staging npm run cbt:seed");
    const attest = workflow.lastIndexOf("CBT_SEED_TARGET=staging npm run cbt:seed");

    expect(targetGuard).toBeGreaterThan(-1);
    expect(migrationDeploy).toBeGreaterThan(targetGuard);
    expect(seed).toBeGreaterThan(migrationDeploy);
    expect(attest).toBeGreaterThan(seed);
  });

  it("runs migrations only for write operations, never for read-only preflight", () => {
    const migrationStep = workflow.indexOf(
      "- name: Verify staging target and apply pending migrations",
    );
    const step = workflow.slice(
      migrationStep,
      workflow.indexOf("- name: Seed as drafts", migrationStep),
    );

    expect(step).toContain("if: inputs.operation != 'preflight'");
    expect(step).toContain("STAGING_DIRECT_DATABASE_URL");
    expect(step).toContain("STAGING_DATABASE_HOST");
    expect(step).toContain("PRODUCTION_DATABASE_HOST");
  });
});
