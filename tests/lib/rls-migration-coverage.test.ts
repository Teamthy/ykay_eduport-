import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Migration-level RLS coverage.
 *
 * `npm run verify:rls:coverage` asks a live database whether every table with a
 * `schoolId` has RLS enabled, forced, and carrying `eduos_tenant_isolation`. It
 * cannot run until a database exists, which means the answer arrives in CI,
 * twenty minutes after the mistake was made.
 *
 * This is the same question answered from the files. Two tenant tables slipped
 * through the real check (`TimetableSlot`, `CbtAttempt`), because the policy
 * loop in `20260804000000_rls_backfill_and_coverage_guard` only ever covered
 * the tables that existed when it ran, and the replacement DDL event trigger
 * was rejected — it deadlocks on CREATE TABLE. Nothing in the repository
 * noticed a new `schoolId` table arriving without a policy.
 *
 * The rule enforced here:
 *
 *   every model with a `schoolId`, whose table is created after the backfill
 *   loop, must have `eduos_apply_tenant_rls('<Table>')` called in that
 *   migration or in a later one.
 *
 * It is deliberately about migrations rather than the live schema: a migration
 * that creates a table and never secures it is the exact failure mode, and it
 * is visible before anything is deployed.
 */

const REPO_ROOT = process.cwd();
const SCHEMA = fs.readFileSync(path.join(REPO_ROOT, "prisma/schema.prisma"), "utf8");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "prisma/migrations");

/** The migration whose DO-block loop covered every table with a schoolId. */
const BACKFILL_MIGRATION = "20260804000000_rls_backfill_and_coverage_guard";

type Migration = { name: string; sql: string };

const migrations: Migration[] = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((entry) => /^\d{14}_/.test(entry))
  .sort()
  .map((name) => ({
    name,
    sql: fs.readFileSync(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8"),
  }));

/** Model name → whether it declares a `schoolId` column. */
function modelsWithSchoolId(): string[] {
  const models = [...SCHEMA.matchAll(/^model (\w+) \{\n([\s\S]*?)^\}/gm)];
  return models
    .filter(([, , body]) => /^\s*schoolId\s+\S+/m.test(body))
    .map(([, name]) => name)
    .sort();
}

/** Table name → the migration that created it. */
function tablesCreated(): Map<string, string> {
  const created = new Map<string, string>();
  for (const migration of migrations) {
    // Migrations are inconsistent about the schema qualifier:
    //   CREATE TABLE "public"."User"   (baseline, prisma-generated)
    //   CREATE TABLE "TimetableSlot"   (hand-written)
    for (const match of migration.sql.matchAll(
      /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(?:"?\w+"?\s*\.\s*)?"?(\w+)"?/gi,
    )) {
      if (!created.has(match[1])) created.set(match[1], migration.name);
    }
  }
  return created;
}

/** Table name → the last migration that applied tenant RLS to it. */
function tablesSecured(): Map<string, string> {
  const secured = new Map<string, string>();
  for (const migration of migrations) {
    for (const match of migration.sql.matchAll(/eduos_apply_tenant_rls\(\s*['"](\w+)['"]\s*\)/gi)) {
      secured.set(match[1], migration.name);
    }
  }
  return secured;
}

describe("RLS coverage in migrations", () => {
  it("finds the models and migrations it is meant to check", () => {
    // If a refactor renames the schema file or the migrations directory, these
    // assertions fail loudly instead of the suite silently checking nothing.
    expect(modelsWithSchoolId().length).toBeGreaterThan(20);
    expect(migrations.length).toBeGreaterThan(30);
    expect(migrations.some((m) => m.name === BACKFILL_MIGRATION)).toBe(true);
  });

  it("secures every schoolId table created after the backfill loop", () => {
    const created = tablesCreated();
    const secured = tablesSecured();

    const gaps = modelsWithSchoolId().filter((table) => {
      const createdAt = created.get(table);
      // Not in any migration: either the model is new and un-migrated (which
      // `prisma migrate diff` catches) or the table name is not the model name.
      // Either way it cannot be silently treated as covered.
      if (!createdAt) return true;
      // Created at or before the loop → the loop covered it.
      if (createdAt <= BACKFILL_MIGRATION) return false;
      const securedAt = secured.get(table);
      return !securedAt || securedAt < createdAt;
    });

    expect(
      gaps,
      `these tables have a schoolId but no eduos_apply_tenant_rls() call after they were created: ${gaps.join(", ")}. ` +
        "Add a migration that runs SELECT eduos_apply_tenant_rls('<Table>');",
    ).toEqual([]);
  });

  it("never applies a policy to a table that no migration creates", () => {
    const created = tablesCreated();
    const unknown = [...tablesSecured().keys()].filter((table) => !created.has(table));
    expect(unknown).toEqual([]);
  });

  it("keeps migration directory names monotonic", () => {
    const names = migrations.map((m) => m.name);
    expect(names).toEqual([...names].sort());
    expect(new Set(names).size).toBe(names.length);
  });
});
