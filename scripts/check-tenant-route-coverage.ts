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

const models = tenantModels();
const routes = listRouteFiles(API_DIR);

let rlsScoped = 0;
let appFiltered = 0;
const uncovered: string[] = [];

const delegateCall = (model: string) =>
  new RegExp(
    "(?:prisma|tx|db|client)\\." +
      delegateName(model) +
      "\\.(?:findFirst|findMany|findUnique|create|createMany|update|updateMany|delete|deleteMany|upsert|count|aggregate|groupBy)",
  );

for (const route of routes) {
  const source = readFileSync(route, "utf8");
  const touched = [...models].filter((model) => delegateCall(model).test(source));
  if (touched.length === 0) continue;

  if (/withSchool\s*\(/.test(source)) {
    rlsScoped += 1;
    continue;
  }
  if (/schoolId/.test(source)) {
    appFiltered += 1;
    continue;
  }
  uncovered.push(
    `${relative(ROOT, route)}  (models: ${touched.slice(0, 4).join(", ")}${touched.length > 4 ? ", …" : ""})`,
  );
}

console.log(`Tenant-model routes: ${rlsScoped + appFiltered + uncovered.length}`);
console.log(`  RLS-scoped (withSchool): ${rlsScoped}`);
console.log(`  App-level schoolId filter present: ${appFiltered}`);
console.log(`  UNCOVERED (no withSchool, no schoolId mention): ${uncovered.length}`);
if (uncovered.length) {
  console.log("\nUNCOVERED routes (go verify each — imported helpers may filter internally):");
  for (const line of uncovered) console.log(`  - ${line}`);
}

if (process.argv.includes("--strict")) {
  if (uncovered.length) {
    console.error(
      `\n--strict: ${uncovered.length} uncovered tenant route(s). Fix or scope them before enabling.`,
    );
    process.exit(1);
  }
  console.log("\n--strict: no uncovered tenant routes. The policy can move to fail-closed.");
}
