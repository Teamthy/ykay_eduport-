import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("IT education registration call to action", () => {
  it("routes to the IT portal account screen, which exposes account creation", () => {
    const cta = read("components/ITAwarenessCTA.tsx");
    const authPage = read("app/it-portal/auth/page.tsx");

    expect(cta).toContain('href="/it-portal/auth"');
    expect(cta).not.toContain("/it-education#register");
    expect(existsSync(join(process.cwd(), "app/it-portal/auth/page.tsx"))).toBe(true);
    expect(authPage).toContain('setMode("signup")');
  });
});
