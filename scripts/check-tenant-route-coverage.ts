/**
 * Tenant-route coverage checker (C-007).
 *
 *   npm run check:tenant-coverage [-- --strict]
 *
 * RLS today is opt-in per route: `withSchool()` sets the tenant context and
 * the DB enforces isolation; every other query relies on application-level
 * schoolId filters. That is a real backstop only while each route actually
 * filters — and the policy is deliberately fail-open when no context is set,
 * so a route that forgets the filter is a silent cross-tenant hole.
 *
 * This script statically scans every API route for tenant-model Prisma access
 * and reports, per route:
 *
 *   RLS-SCOPED  — route runs its tenant access through withSchool()
 *   APP-FILTER  — route touches tenant models and mentions a schoolId filter
 *                 in the same file (app-level defence; acceptable today)
 *   UNCOVERED   — route touches tenant models with neither of the above
 *
 * UNCOVERED routes are the ratchet list: fix them (prefer withSchool) and the
 * list shrinks. Run with --strict to exit non-zero on any UNCOVERED route —
 * wire that into CI once the current list is empty, and only then flip the
 * RLS policies themselves to fail-closed (see lib/db-rls.ts).
 *
 * It is deliberately a heuristic (regex over source, no type analysis):
 * imported helpers that filter internally will read as UNCOVERED here. Treat
 * every finding as "go look", not "this is a bug".
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const API_DIR = join(ROOT, "app", "api");
const SCHEMA = join(ROOT, "prisma", "schema.prisma");

/** Models carrying a schoolId column = tenant models. */
function tenantModels(): Set<string> {
  const schema = readFileSync(SCHEMA, "utf8");
  const models = new Set<string>();
  const blocks = schema.split(/^model\s+/m);
  for (const block of blocks.slice(1)) {
    const name = block.split(/\s/)[0];
    if (/^\s*schoolId\s+\w+/m.test(block)) models.add(name);
  }
  return models;
}

function listRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listRouteFiles(full));
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

/** Prisma model delegates are camelCase: prisma.admissionApplication.findFirst(...) */
function delegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

/**
 * REVIEWED EXEMPTIONS (audit TEN-01, reviewed line-by-line 2026-10-23).
 *
 * These routes touch tenant models without a literal `schoolId` filter, but
 * each was verified to derive its scope from something equally binding:
 * a globally-unique owner id (userId / teacherProfileId), a single-use
 * token, the internal shared secret, or deliberate platform scope
 * (SUPER_ADMIN console). They are listed explicitly — NOT silently skipped —
 * so the ratchet still fails on any NEW unscoped route, and an exemption
 * whose file later gains a real schoolId filter is reported as stale.
 *
 * An exemption is a reviewed judgement, not a backstop: before a second
 * school is onboarded, every entry here must be re-verified, and the RLS
 * policies still cannot flip fail-closed while only 1 of 114 routes sets
 * the tenant GUC (see docs/TENANCY_RLS_STATUS.md).
 */
const REVIEWED_EXEMPTIONS = new Map<string, string>([
  // Pre-auth, authorized by applicationId + upload token (findAuthorizedApplication).
  ["app/api/admissions/payments/start/route.ts", "token-scoped application lookup"],
  // Pre-auth, single-use hashed reset token resolves to exactly one userId.
  ["app/api/auth/password-reset/confirm/route.ts", "token-scoped to record.userId"],
  // Server-to-server ingestion behind a constant-time shared-secret check.
  ["app/api/internal/security-event/route.ts", "internal shared-secret endpoint"],
  // Owner-scoped by the session user's globally unique id.
  ["app/api/it/certificates/route.ts", "owner-scoped by userId"],
  ["app/api/it/profile/route.ts", "owner-scoped by userId"],
  ["app/api/parent/events/route.ts", "owner-scoped by userId"],
  ["app/api/parent/messages/route.ts", "owner-scoped by userId"],
  ["app/api/student/announcements/route.ts", "owner-scoped by userId"],
  ["app/api/teacher/class/announcements/route.ts", "owner-scoped by userId"],
  ["app/api/teacher/messages/route.ts", "owner-scoped by userId"],
  // Scoped by teacherProfileId, which belongs to exactly one school.
  ["app/api/teacher/analytics/route.ts", "teacherProfileId-scoped"],
  ["app/api/teacher/my-records/route.ts", "teacherProfileId-scoped"],
  ["app/api/teacher/performance/route.ts", "teacherProfileId-scoped"],
  // Platform console: cross-tenant by design, SUPER_ADMIN only.
  ["app/api/super-admin/finance/route.ts", "SUPER_ADMIN platform scope"],
  ["app/api/super-admin/logs/route.ts", "SUPER_ADMIN platform scope"],
  ["app/api/super-admin/overview/route.ts", "SUPER_ADMIN platform scope"],
]);

const models = tenantModels();
const routes = listRouteFiles(API_DIR);

let rlsScoped = 0;
let appFiltered = 0;
const uncovered: string[] = [];
const exempted: string[] = [];
const staleExemptions: string[] = [];
const matchedExemptions = new Set<string>();

const delegateCall = (model: string) =>
  new RegExp(
    "(?:prisma|tx|db|client)\\." +
      delegateName(model) +
      "\\.(?:findFirst|findMany|findUnique|create|createMany|update|updateMany|delete|deleteMany|upsert|count|aggregate|groupBy)",
  );

for (const route of routes) {
  const source = readFileSync(route, "utf8");
  const relRoute = relative(ROOT, route);
  const touched = [...models].filter((model) => delegateCall(model).test(source));
  if (touched.length === 0) continue;

  if (/withSchool\s*\(/.test(source)) {
    rlsScoped += 1;
    if (REVIEWED_EXEMPTIONS.has(relRoute)) {
      matchedExemptions.add(relRoute);
      staleExemptions.push(relRoute);
    }
    continue;
  }
  if (/schoolId/.test(source)) {
    appFiltered += 1;
    if (REVIEWED_EXEMPTIONS.has(relRoute)) {
      matchedExemptions.add(relRoute);
      staleExemptions.push(relRoute);
    }
    continue;
  }
  const exemption = REVIEWED_EXEMPTIONS.get(relRoute);
  if (exemption) {
    matchedExemptions.add(relRoute);
    exempted.push(`${relRoute}  (${exemption})`);
    continue;
  }
  uncovered.push(
    `${relRoute}  (models: ${touched.slice(0, 4).join(", ")}${touched.length > 4 ? ", …" : ""})`,
  );
}

for (const route of REVIEWED_EXEMPTIONS.keys()) {
  if (!matchedExemptions.has(route)) staleExemptions.push(route);
}

console.log(`Tenant-model routes: ${rlsScoped + appFiltered + exempted.length + uncovered.length}`);
console.log(`  RLS-scoped (withSchool): ${rlsScoped}`);
console.log(`  App-level schoolId filter present: ${appFiltered}`);
console.log(`  Reviewed owner/token/platform exemptions: ${exempted.length}`);
console.log(`  UNCOVERED (no scope and no current exemption): ${uncovered.length}`);
console.log("  Note: app filters/exemptions do NOT set the DB tenant GUC; RLS remains fail-open.");
if (exempted.length) {
  console.log("\nReviewed exemptions (see REVIEWED_EXEMPTIONS in this script):");
  for (const line of exempted) console.log(`  - ${line}`);
}
if (staleExemptions.length) {
  console.error(
    "\nERROR: reviewed exemptions are stale (route disappeared, stopped touching a tenant model, or gained an explicit scope); remove/re-review them:",
  );
  for (const line of staleExemptions) console.error(`  - ${line}`);
}
if (uncovered.length) {
  console.log("\nUNCOVERED routes (go verify each — imported helpers may filter internally):");
  for (const line of uncovered) console.log(`  - ${line}`);
}

if (process.argv.includes("--strict")) {
  if (uncovered.length || staleExemptions.length) {
    console.error(
      `\n--strict: ${uncovered.length} unexplained route(s), ${staleExemptions.length} stale exemption(s). Review before continuing.`,
    );
    process.exit(1);
  }
  console.log(
    "\n--strict: no unexplained routes; note this checks source coverage, not DB RLS/GUC fail-closed readiness.",
  );
}

/**
 * --max-uncovered <n> — a RATCHET, for CI.
 *
 * Reviewed exemptions above are part of the baseline; they are printed and
 * stale entries fail. Set the CI limit to zero once every current route is
 * either explicitly filtered, wrapped in withSchool(), or has a reviewed,
 * owner/token/platform-scope exemption. This prevents a new unexplained route
 * from silently increasing the list.
 *
 * IMPORTANT: this is not a green multi-tenant certificate. App-level filters
 * do not set the RLS tenant GUC; the DB policy remains fail-open until every
 * tenant query is routed through `withSchool()` and `verify:rls` proves the
 * actual database denies missing/incorrect tenant context.
 */
const maxFlagIndex = process.argv.indexOf("--max-uncovered");
if (maxFlagIndex !== -1) {
  const limit = Number.parseInt(process.argv[maxFlagIndex + 1] ?? "", 10);
  if (!Number.isFinite(limit) || limit < 0) {
    console.error("\n--max-uncovered requires a non-negative integer argument.");
    process.exit(2);
  }
  if (uncovered.length > limit) {
    console.error(
      `\nRATCHET FAILED: ${uncovered.length} unexplained tenant route(s) exceeds the baseline of ${limit}.`,
    );
    console.error(
      "Add a real schoolId/withSchool scope or a new explicitly reviewed exemption after verifying its owner/token/platform scope.",
    );
    process.exit(1);
  }
  if (staleExemptions.length > 0) {
    console.error("\nRATCHET FAILED: remove or re-review stale exemptions listed above.");
    process.exit(1);
  }
  console.log(`\nRATCHET: ${uncovered.length} unexplained, baseline ${limit} — no regression.`);
}
