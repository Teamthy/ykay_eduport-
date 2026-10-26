import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { GRADEBOOK_ADMIN_ROLES } from "@/lib/gradebook";

/**
 * A page a role cannot open is worse than a hidden page.
 *
 * AdminSidebar decides what to offer and middleware decides what to let through;
 * the API behind each page decides again. Those three drifted: the sidebar and
 * the /admin guard both included SUPER_ADMIN, while the gradebook, report-card
 * and broadsheet APIs did not — so a super admin was shown "Gradebook Lock",
 * clicked it, and got "Unauthorized" from the panel on an otherwise fine page.
 *
 * These assertions read the source of the call sites so a future edit that
 * hand-rolls another role list is caught here instead of in production.
 */
const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function sidebarGroup(name: string): string[] {
  const match = read("components/AdminSidebar.tsx").match(
    new RegExp(`const ${name} = \\[([^\\]]*)\\] as const;`),
  );
  if (!match) throw new Error(`${name} not found in AdminSidebar.tsx`);
  return [...match[1].matchAll(/"([A-Z_]+)"/g)].map((entry) => entry[1]);
}

describe("admin role consistency", () => {
  it("offers the results pages to exactly the roles the results APIs accept", () => {
    const offered = sidebarGroup("ACADEMIC_ADMIN");
    const accepted = GRADEBOOK_ADMIN_ROLES.map(String);

    expect(offered.sort()).toEqual(accepted.sort());
  });

  it("includes SUPER_ADMIN, because the sidebar and middleware do", () => {
    expect(sidebarGroup("ACADEMIC_ADMIN")).toContain("SUPER_ADMIN");
    expect(GRADEBOOK_ADMIN_ROLES).toContain(UserRole.SUPER_ADMIN);
    // The /admin guard itself.
    expect(read("middleware.ts")).toMatch(/"ADMIN",\s*"DIRECTOR",\s*"COORDINATOR",\s*"BURSAR"/);
  });

  it("keeps the results APIs on the shared list instead of their own", () => {
    // Broadly: each of these routes must authorise with GRADEBOOK_ADMIN_ROLES,
    // so adding a role in one place cannot leave another route behind.
    for (const route of [
      "app/api/admin/broadsheet/route.ts",
      "app/api/admin/gradebook/locks/route.ts",
      "app/api/admin/report-cards/generate/route.ts",
    ]) {
      const source = read(route);
      expect(source, route).toContain("GRADEBOOK_ADMIN_ROLES");
      expect(source, route).not.toMatch(/const\s+ADMIN_ROLES\s*=/);
    }
  });

  it("gives the leaderboard the same audience as the broadsheet", () => {
    // Its sidebar entry also uses ACADEMIC_ADMIN.
    const source = read("app/api/admin/leaderboards/route.ts");
    for (const role of sidebarGroup("ACADEMIC_ADMIN")) {
      expect(source, role).toContain(`UserRole.${role}`);
    }
  });
});
