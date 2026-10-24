import { describe, expect, it } from "vitest";
import {
  DEMO_EMAIL_DOMAIN,
  DEMO_PARENTS,
  DEMO_ROLE_COUNTS,
  DEMO_STUDENTS,
  getCompleteDemoAccounts,
  getDemoRoleCounts,
} from "../../prisma/staging-demo-seed-plan";
import { validateStagingDemoTarget } from "../../prisma/staging-demo-target";

describe("staging demo seed plan", () => {
  it("contains exactly the requested 72 role accounts", () => {
    expect(getCompleteDemoAccounts()).toHaveLength(72);
    expect(getDemoRoleCounts(getCompleteDemoAccounts())).toEqual(DEMO_ROLE_COUNTS);
  });

  it("uses unique, non-deliverable demo email addresses", () => {
    const accounts = getCompleteDemoAccounts();
    const emails = accounts.map((account) => account.email);

    expect(new Set(emails).size).toBe(72);
    expect(emails.every((email) => email.endsWith(`@${DEMO_EMAIL_DOMAIN}`))).toBe(true);
  });

  it("links five fictional students to each of the ten fictional parents", () => {
    expect(DEMO_PARENTS).toHaveLength(10);
    expect(DEMO_STUDENTS).toHaveLength(50);

    for (const parent of DEMO_PARENTS) {
      expect(DEMO_STUDENTS.filter((student) => student.parentEmail === parent.email)).toHaveLength(
        5,
      );
    }
  });
});

describe("staging-only database target guard", () => {
  const directStagingUrl = "postgresql://demo:unused@ep-staging.us-east-2.aws.neon.tech/neondb";

  it("accepts only the configured direct staging Neon host", () => {
    expect(
      validateStagingDemoTarget({
        databaseUrl: directStagingUrl,
        stagingDatabaseHost: "ep-staging.us-east-2.aws.neon.tech",
        productionDatabaseHost: "prod-db.example.invalid",
      }),
    ).toBe("ep-staging.us-east-2.aws.neon.tech");
  });

  it("rejects pooled Neon endpoints", () => {
    expect(() =>
      validateStagingDemoTarget({
        databaseUrl:
          "postgresql://demo:unused@ep-staging-pooler.c-7.us-east-2.aws.neon.tech/neondb",
        stagingDatabaseHost: "ep-staging-pooler.c-7.us-east-2.aws.neon.tech",
        productionDatabaseHost: "prod-db.example.invalid",
      }),
    ).toThrow(/direct, unpooled/);
  });

  it("rejects URLs that are not PostgreSQL connection strings", () => {
    expect(() =>
      validateStagingDemoTarget({
        databaseUrl: "https://ep-staging.us-east-2.aws.neon.tech/neondb",
        stagingDatabaseHost: "ep-staging.us-east-2.aws.neon.tech",
        productionDatabaseHost: "prod-db.example.invalid",
      }),
    ).toThrow(/PostgreSQL protocol/);
  });

  it("rejects a URL that does not match the staging allowlisted host", () => {
    expect(() =>
      validateStagingDemoTarget({
        databaseUrl: directStagingUrl,
        stagingDatabaseHost: "another-staging.us-east-2.aws.neon.tech",
        productionDatabaseHost: "prod-db.example.invalid",
      }),
    ).toThrow(/does not match STAGING_DATABASE_HOST/);
  });

  it("rejects identical staging and production hosts", () => {
    expect(() =>
      validateStagingDemoTarget({
        databaseUrl: directStagingUrl,
        stagingDatabaseHost: "ep-staging.us-east-2.aws.neon.tech",
        productionDatabaseHost: "ep-staging.us-east-2.aws.neon.tech",
      }),
    ).toThrow(/must be different/);
  });

  it("rejects missing or malformed host configuration", () => {
    expect(() =>
      validateStagingDemoTarget({
        databaseUrl: directStagingUrl,
        stagingDatabaseHost: undefined,
        productionDatabaseHost: "prod-db.example.invalid",
      }),
    ).toThrow(/STAGING_DATABASE_HOST/);
  });
});
